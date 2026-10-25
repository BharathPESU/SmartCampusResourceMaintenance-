import { runQuery } from '../db/client';
import { isValidComplaintTransition, ComplaintStatus } from '../logic';
import { insertActivityEvent } from '../db/mongo';
import { getEmbedding } from './vector-service';

export interface CreateComplaintParams {
  raisedByUserId: string;
  assetId: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface ComplaintRecord {
  complaintId: string;
  raisedByUserId: string;
  reporterName: string;
  reporterEmail: string;
  assetId: string;
  assetName: string;
  assetCategory: string;
  roomId: string;
  roomNumber: string;
  buildingName: string;
  description: string;
  priority: string;
  status: ComplaintStatus;
  assignedStaffId: string | null;
  assignedStaffName: string | null;
  dateRaised: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolutionNotes: string | null;
}

export interface AuditRecord {
  auditId: string;
  complaintId: string;
  oldStatus: string | null;
  newStatus: string;
  changedByName: string | null;
  notes: string | null;
  createdAt: string;
}

/**
 * Creates a new complaint and registers an outbox event and vector embedding.
 */
export async function createComplaint(params: CreateComplaintParams): Promise<{
  success: boolean;
  complaint?: ComplaintRecord;
  error?: string;
}> {
  try {
    const res = await runQuery(
      `INSERT INTO complaints (raised_by_user_id, asset_id, description, priority, status)
       VALUES ($1, $2, $3, $4, 'OPEN')
       RETURNING complaint_id`,
      [params.raisedByUserId, params.assetId, params.description, params.priority]
    );

    const complaintId = res.rows[0].complaint_id;

    // Generate semantic embedding vector for this new complaint
    try {
      const { vector, model } = await getEmbedding(params.description);
      await runQuery(
        `INSERT INTO complaint_embeddings (complaint_id, embedding_vector, embedding_model, content_hash)
         VALUES ($1, $2, $3, md5($4))
         ON CONFLICT (complaint_id) DO UPDATE SET embedding_vector = EXCLUDED.embedding_vector`,
        [complaintId, JSON.stringify(vector), model, params.description]
      );
    } catch (e) {
      console.warn('Embedding generation warning:', e);
    }

    // Insert outbox event for MongoDB
    await runQuery(
      `INSERT INTO outbox_events (event_type, aggregate_type, aggregate_id, payload, status)
       VALUES ('COMPLAINT_CREATED', 'COMPLAINT', $1, $2, 'PENDING')`,
      [
        complaintId,
        JSON.stringify({
          complaintId,
          assetId: params.assetId,
          priority: params.priority,
          status: 'OPEN',
        }),
      ]
    );

    await insertActivityEvent({
      eventId: `evt-comp-${complaintId}`,
      eventType: 'COMPLAINT_CREATED',
      occurredAt: new Date(),
      actorUserId: params.raisedByUserId,
      aggregateType: 'COMPLAINT',
      aggregateId: complaintId,
      summary: `New ${params.priority} priority complaint created.`,
      metadata: { priority: params.priority, assetId: params.assetId },
      schemaVersion: 1,
    });

    const fullComplaint = await getComplaintById(complaintId);
    return { success: true, complaint: fullComplaint || undefined };
  } catch (err: any) {
    console.error('Error creating complaint:', err);
    return { success: false, error: err.message || 'Failed to create complaint' };
  }
}

/**
 * Assigns maintenance staff to a complaint (Admin only).
 */
export async function assignComplaint(
  complaintId: string,
  staffId: string,
  assignedByUserId: string
): Promise<{ success: boolean; error?: string }> {
  const current = await getComplaintById(complaintId);
  if (!current) {
    return { success: false, error: 'Complaint not found' };
  }

  // Update complaint
  await runQuery(
    `UPDATE complaints
     SET assigned_staff_id = $1, status = 'ASSIGNED', updated_at = NOW()
     WHERE complaint_id = $2`,
    [staffId, complaintId]
  );

  // Manual audit log insertion (triggers also record, but explicit note captures user)
  await runQuery(
    `INSERT INTO complaint_audit_log (complaint_id, old_status, new_status, changed_by_user_id, notes)
     VALUES ($1, $2, 'ASSIGNED', $3, 'Assigned to maintenance technician')`,
    [complaintId, current.status, assignedByUserId]
  );

  await insertActivityEvent({
    eventId: `evt-assign-${complaintId}-${Date.now()}`,
    eventType: 'COMPLAINT_ASSIGNED',
    occurredAt: new Date(),
    actorUserId: assignedByUserId,
    aggregateType: 'COMPLAINT',
    aggregateId: complaintId,
    summary: `Complaint assigned to staff specialist`,
    metadata: { assignedStaffId: staffId, status: 'ASSIGNED' },
    schemaVersion: 1,
  });

  return { success: true };
}

/**
 * Updates complaint status (IN_PROGRESS, RESOLVED, CANCELLED) with resolution notes.
 */
export async function updateComplaintStatus(
  complaintId: string,
  newStatus: ComplaintStatus,
  changedByUserId: string,
  resolutionNotes?: string
): Promise<{ success: boolean; error?: string }> {
  const current = await getComplaintById(complaintId);
  if (!current) {
    return { success: false, error: 'Complaint not found' };
  }

  if (!isValidComplaintTransition(current.status, newStatus)) {
    return {
      success: false,
      error: `Invalid transition: Cannot move from ${current.status} directly to ${newStatus}`,
    };
  }

  const resolvedAtClause = newStatus === 'RESOLVED' ? ', resolved_at = NOW()' : '';

  await runQuery(
    `UPDATE complaints
     SET status = $1,
         resolution_notes = COALESCE($2, resolution_notes),
         updated_at = NOW()
         ${resolvedAtClause}
     WHERE complaint_id = $3`,
    [newStatus, resolutionNotes || null, complaintId]
  );

  // Audit log entry
  await runQuery(
    `INSERT INTO complaint_audit_log (complaint_id, old_status, new_status, changed_by_user_id, notes)
     VALUES ($1, $2, $3, $4, $5)`,
    [complaintId, current.status, newStatus, changedByUserId, resolutionNotes || `Status updated to ${newStatus}`]
  );

  // Re-embed if resolved with notes to enrich future vector search!
  if (newStatus === 'RESOLVED' && resolutionNotes) {
    try {
      const enrichedText = `${current.description}. Resolution: ${resolutionNotes}`;
      const { vector, model } = await getEmbedding(enrichedText);
      await runQuery(
        `UPDATE complaint_embeddings
         SET embedding_vector = $1, embedding_model = $2, content_hash = md5($3)
         WHERE complaint_id = $4`,
        [JSON.stringify(vector), model, enrichedText, complaintId]
      );
    } catch (e) {
      console.warn('Re-embedding error:', e);
    }
  }

  await insertActivityEvent({
    eventId: `evt-status-${complaintId}-${Date.now()}`,
    eventType: newStatus === 'RESOLVED' ? 'COMPLAINT_RESOLVED' : 'COMPLAINT_STATUS_CHANGED',
    occurredAt: new Date(),
    actorUserId: changedByUserId,
    aggregateType: 'COMPLAINT',
    aggregateId: complaintId,
    summary: `Complaint transitioned from ${current.status} to ${newStatus}`,
    metadata: { oldStatus: current.status, newStatus, notes: resolutionNotes },
    schemaVersion: 1,
  });

  return { success: true };
}

/**
 * Returns single complaint with all relational joins.
 */
export async function getComplaintById(complaintId: string): Promise<ComplaintRecord | null> {
  const sql = `
    SELECT
      c.complaint_id,
      c.raised_by_user_id,
      u.first_name || ' ' || u.last_name AS reporter_name,
      u.email AS reporter_email,
      c.asset_id,
      a.asset_name,
      a.category AS asset_category,
      r.room_id,
      r.room_number,
      b.building_name,
      c.description,
      c.priority,
      c.status,
      c.assigned_staff_id,
      s_u.first_name || ' ' || s_u.last_name AS assigned_staff_name,
      c.date_raised,
      c.updated_at,
      c.resolved_at,
      c.resolution_notes
    FROM complaints c
    JOIN assets a ON c.asset_id = a.asset_id
    JOIN rooms r ON a.room_id = r.room_id
    JOIN buildings b ON r.building_id = b.building_id
    JOIN user_profiles u ON c.raised_by_user_id = u.user_id
    LEFT JOIN staff_profiles s ON c.assigned_staff_id = s.staff_id
    LEFT JOIN user_profiles s_u ON s.user_id = s_u.user_id
    WHERE c.complaint_id = $1
  `;
  const res = await runQuery(sql, [complaintId]);
  if (!res.rows?.length) return null;
  const row = res.rows[0];
  return {
    complaintId: row.complaint_id,
    raisedByUserId: row.raised_by_user_id,
    reporterName: row.reporter_name,
    reporterEmail: row.reporter_email,
    assetId: row.asset_id,
    assetName: row.asset_name,
    assetCategory: row.asset_category,
    roomId: row.room_id,
    roomNumber: row.room_number,
    buildingName: row.building_name,
    description: row.description,
    priority: row.priority,
    status: row.status,
    assignedStaffId: row.assigned_staff_id,
    assignedStaffName: row.assigned_staff_name,
    dateRaised: row.date_raised,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
    resolutionNotes: row.resolution_notes,
  };
}

/**
 * Returns complaints list with filters.
 */
export async function listComplaints(params?: {
  raisedByUserId?: string;
  assignedStaffId?: string;
  status?: string;
  priority?: string;
  limit?: number;
}): Promise<ComplaintRecord[]> {
  let sql = `
    SELECT
      c.complaint_id,
      c.raised_by_user_id,
      u.first_name || ' ' || u.last_name AS reporter_name,
      u.email AS reporter_email,
      c.asset_id,
      a.asset_name,
      a.category AS asset_category,
      r.room_id,
      r.room_number,
      b.building_name,
      c.description,
      c.priority,
      c.status,
      c.assigned_staff_id,
      s_u.first_name || ' ' || s_u.last_name AS assigned_staff_name,
      c.date_raised,
      c.updated_at,
      c.resolved_at,
      c.resolution_notes
    FROM complaints c
    JOIN assets a ON c.asset_id = a.asset_id
    JOIN rooms r ON a.room_id = r.room_id
    JOIN buildings b ON r.building_id = b.building_id
    JOIN user_profiles u ON c.raised_by_user_id = u.user_id
    LEFT JOIN staff_profiles s ON c.assigned_staff_id = s.staff_id
    LEFT JOIN user_profiles s_u ON s.user_id = s_u.user_id
    WHERE 1=1
  `;
  const values: any[] = [];
  let paramIdx = 1;

  if (params?.raisedByUserId) {
    sql += ` AND c.raised_by_user_id = $${paramIdx++}`;
    values.push(params.raisedByUserId);
  }
  if (params?.assignedStaffId) {
    sql += ` AND c.assigned_staff_id = $${paramIdx++}`;
    values.push(params.assignedStaffId);
  }
  if (params?.status) {
    sql += ` AND c.status = $${paramIdx++}`;
    values.push(params.status);
  }
  if (params?.priority) {
    sql += ` AND c.priority = $${paramIdx++}`;
    values.push(params.priority);
  }

  sql += ` ORDER BY c.date_raised DESC LIMIT $${paramIdx++}`;
  values.push(params?.limit || 50);

  const res = await runQuery(sql, values);
  return res.rows.map(row => ({
    complaintId: row.complaint_id,
    raisedByUserId: row.raised_by_user_id,
    reporterName: row.reporter_name,
    reporterEmail: row.reporter_email,
    assetId: row.asset_id,
    assetName: row.asset_name,
    assetCategory: row.asset_category,
    roomId: row.room_id,
    roomNumber: row.room_number,
    buildingName: row.building_name,
    description: row.description,
    priority: row.priority,
    status: row.status,
    assignedStaffId: row.assigned_staff_id,
    assignedStaffName: row.assigned_staff_name,
    dateRaised: row.date_raised,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
    resolutionNotes: row.resolution_notes,
  }));
}

/**
 * Returns audit log for a complaint.
 */
export async function getComplaintAuditLog(complaintId: string): Promise<AuditRecord[]> {
  const sql = `
    SELECT
      cal.audit_id,
      cal.complaint_id,
      cal.old_status,
      cal.new_status,
      u.first_name || ' ' || u.last_name AS changed_by_name,
      cal.notes,
      cal.created_at
    FROM complaint_audit_log cal
    LEFT JOIN user_profiles u ON cal.changed_by_user_id = u.user_id
    WHERE cal.complaint_id = $1
    ORDER BY cal.created_at ASC
  `;
  const res = await runQuery(sql, [complaintId]);
  return res.rows.map(row => ({
    auditId: row.audit_id,
    complaintId: row.complaint_id,
    oldStatus: row.old_status,
    newStatus: row.new_status,
    changedByName: row.changed_by_name,
    notes: row.notes,
    createdAt: row.created_at,
  }));
}

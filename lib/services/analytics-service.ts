import { runQuery } from '../db/client';
import { aggregateEventsByType, aggregateEventsByAggregate, getMongoStatus } from '../db/mongo';

export interface DashboardMetrics {
  totalBuildings: number;
  totalRooms: number;
  availableRooms: number;
  activeAssets: number;
  activeBookings: number;
  openComplaints: number;
  highPriorityComplaints: number;
  unassignedComplaints: number;
  resolvedComplaints: number;
  totalStaff: number;
}

export interface RoomUtilizationStat {
  roomNumber: string;
  buildingName: string;
  totalBookings: number;
  totalHoursBooked: number;
  capacity: number;
}

export interface ComplaintCategoryStat {
  category: string;
  total: number;
  resolved: number;
  open: number;
}

export interface StaffWorkloadStat {
  staffId: string;
  staffName: string;
  designation: string;
  activeComplaints: number;
  resolvedComplaints: number;
}

/**
 * Calculates high-level KPI metrics directly from PostgreSQL.
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [bRes, rRes, aRes, bkRes, cRes, sRes] = await Promise.all([
    runQuery('SELECT count(*) as count FROM buildings'),
    runQuery(`SELECT
                count(*) as total_rooms,
                count(CASE WHEN status = 'AVAILABLE' THEN 1 END) as available_rooms
              FROM rooms`),
    runQuery(`SELECT count(CASE WHEN status = 'OPERATIONAL' THEN 1 END) as active_assets FROM assets`),
    runQuery(`SELECT count(*) as active_bookings FROM bookings WHERE status = 'CONFIRMED' AND end_time > NOW()`),
    runQuery(`SELECT
                count(CASE WHEN status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS') THEN 1 END) as open_complaints,
                count(CASE WHEN priority IN ('HIGH', 'CRITICAL') AND status != 'RESOLVED' AND status != 'CANCELLED' THEN 1 END) as high_priority,
                count(CASE WHEN assigned_staff_id IS NULL AND status = 'OPEN' THEN 1 END) as unassigned,
                count(CASE WHEN status = 'RESOLVED' THEN 1 END) as resolved
              FROM complaints`),
    runQuery('SELECT count(*) as total_staff FROM staff_profiles'),
  ]);

  return {
    totalBuildings: Number(bRes.rows?.[0]?.count || 0),
    totalRooms: Number(rRes.rows?.[0]?.total_rooms || 0),
    availableRooms: Number(rRes.rows?.[0]?.available_rooms || 0),
    activeAssets: Number(aRes.rows?.[0]?.active_assets || 0),
    activeBookings: Number(bkRes.rows?.[0]?.active_bookings || 0),
    openComplaints: Number(cRes.rows?.[0]?.open_complaints || 0),
    highPriorityComplaints: Number(cRes.rows?.[0]?.high_priority || 0),
    unassignedComplaints: Number(cRes.rows?.[0]?.unassigned || 0),
    resolvedComplaints: Number(cRes.rows?.[0]?.resolved || 0),
    totalStaff: Number(sRes.rows?.[0]?.total_staff || 0),
  };
}

/**
 * Returns room utilization statistics using PostgreSQL aggregation.
 */
export async function getRoomUtilizationStats(): Promise<RoomUtilizationStat[]> {
  const sql = `
    SELECT
      r.room_number,
      b.building_name,
      r.capacity,
      COUNT(bk.booking_id) AS total_bookings,
      ROUND(COALESCE(SUM(EXTRACT(EPOCH FROM (bk.end_time - bk.start_time))/3600.0), 0)::numeric, 1) AS total_hours_booked
    FROM rooms r
    JOIN buildings b ON r.building_id = b.building_id
    LEFT JOIN bookings bk ON r.room_id = bk.room_id AND bk.status != 'CANCELLED'
    GROUP BY r.room_id, r.room_number, b.building_name, r.capacity
    ORDER BY total_bookings DESC
    LIMIT 10
  `;
  const res = await runQuery(sql);
  return res.rows.map(row => ({
    roomNumber: row.room_number,
    buildingName: row.building_name,
    totalBookings: Number(row.total_bookings),
    totalHoursBooked: Number(row.total_hours_booked),
    capacity: Number(row.capacity),
  }));
}

/**
 * Returns complaint distribution by asset category.
 */
export async function getComplaintsByCategoryStats(): Promise<ComplaintCategoryStat[]> {
  const sql = `
    SELECT
      a.category,
      COUNT(c.complaint_id) AS total,
      COUNT(CASE WHEN c.status = 'RESOLVED' THEN 1 END) AS resolved,
      COUNT(CASE WHEN c.status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS') THEN 1 END) AS open
    FROM assets a
    LEFT JOIN complaints c ON a.asset_id = c.asset_id
    GROUP BY a.category
    ORDER BY total DESC
  `;
  const res = await runQuery(sql);
  return res.rows.map(row => ({
    category: row.category,
    total: Number(row.total),
    resolved: Number(row.resolved),
    open: Number(row.open),
  }));
}

/**
 * Returns staff workload by executing the PostgreSQL stored function get_staff_workload_summary().
 */
export async function getStaffWorkloadStats(): Promise<StaffWorkloadStat[]> {
  const sql = `SELECT * FROM get_staff_workload_summary()`;
  try {
    const res = await runQuery(sql);
    return res.rows.map(row => ({
      staffId: row.staff_id,
      staffName: row.staff_name,
      designation: row.designation,
      activeComplaints: Number(row.active_complaints),
      resolvedComplaints: Number(row.resolved_complaints),
    }));
  } catch (err) {
    // If stored function call fails in some client mode, execute direct equivalent join
    const fallbackSql = `
      SELECT
        s.staff_id,
        u.first_name || ' ' || u.last_name AS staff_name,
        s.designation,
        COUNT(CASE WHEN c.status IN ('ASSIGNED', 'IN_PROGRESS') THEN 1 END) AS active_complaints,
        COUNT(CASE WHEN c.status = 'RESOLVED' THEN 1 END) AS resolved_complaints
      FROM staff_profiles s
      JOIN user_profiles u ON s.user_id = u.user_id
      LEFT JOIN complaints c ON s.staff_id = c.assigned_staff_id
      GROUP BY s.staff_id, u.first_name, u.last_name, s.designation
      ORDER BY active_complaints DESC
    `;
    const res = await runQuery(fallbackSql);
    return res.rows.map(row => ({
      staffId: row.staff_id,
      staffName: row.staff_name,
      designation: row.designation,
      activeComplaints: Number(row.active_complaints),
      resolvedComplaints: Number(row.resolved_complaints),
    }));
  }
}

/**
 * Returns combined database analytics including MongoDB aggregations.
 */
export async function getComprehensiveAnalytics() {
  const [metrics, roomUtil, compCats, staffWorkload, mongoEventsByType, mongoEventsByAgg, mongoStatus] =
    await Promise.all([
      getDashboardMetrics(),
      getRoomUtilizationStats(),
      getComplaintsByCategoryStats(),
      getStaffWorkloadStats(),
      aggregateEventsByType(),
      aggregateEventsByAggregate(),
      getMongoStatus(),
    ]);

  return {
    metrics,
    roomUtilization: roomUtil,
    complaintCategories: compCats,
    staffWorkload,
    mongoActivity: {
      status: mongoStatus,
      eventsByType: mongoEventsByType,
      eventsByAggregate: mongoEventsByAgg,
    },
  };
}

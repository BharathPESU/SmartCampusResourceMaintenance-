/**
 * Pure business logic for the Smart Campus Resource & Maintenance Management System.
 * Decoupled from I/O and UI so it can be verified with node:test.
 */

export interface TimeSlot {
  start: Date;
  end: Date;
}

/**
 * Checks if two half-open time ranges [start1, end1) and [start2, end2) overlap.
 * Half-open means if one slot ends exactly when another starts, they do NOT overlap.
 */
export function doIntervalsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  if (slot1.start >= slot1.end || slot2.start >= slot2.end) {
    throw new Error('Invalid time interval: start must be strictly before end');
  }
  return slot1.start < slot2.end && slot2.start < slot1.end;
}

/**
 * Validates a booking request time window.
 */
export function validateBookingTime(start: Date, end: Date, now: Date = new Date()): { valid: boolean; error?: string } {
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }
  if (start >= end) {
    return { valid: false, error: 'Booking end time must be after start time' };
  }
  const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
  if (durationMinutes < 15) {
    return { valid: false, error: 'Minimum booking duration is 15 minutes' };
  }
  if (durationMinutes > 1440) {
    return { valid: false, error: 'Maximum booking duration is 24 hours' };
  }
  return { valid: true };
}

export type ComplaintStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED';

const ALLOWED_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  OPEN: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['RESOLVED', 'ASSIGNED', 'CANCELLED'],
  RESOLVED: ['OPEN'], // Can be reopened if justified
  CANCELLED: ['OPEN'],
};

/**
 * Validates whether a complaint status transition is allowed.
 */
export function isValidComplaintTransition(current: ComplaintStatus, next: ComplaintStatus): boolean {
  if (current === next) return true;
  const allowed = ALLOWED_TRANSITIONS[current] || [];
  return allowed.includes(next);
}

export type UserRole = 'CAMPUS_USER' | 'MAINTENANCE_STAFF' | 'ADMIN';

export interface UserPermissionCheck {
  role: UserRole;
  action: 'CREATE_BOOKING' | 'CANCEL_BOOKING' | 'RAISE_COMPLAINT' | 'ASSIGN_COMPLAINT' | 'UPDATE_COMPLAINT_STATUS' | 'VIEW_SALARY' | 'RUN_DB_LAB' | 'MANAGE_BUILDINGS';
  isRecordOwner?: boolean;
}

/**
 * Enforces the application authorization matrix.
 */
export function checkPermission({ role, action, isRecordOwner = false }: UserPermissionCheck): boolean {
  switch (action) {
    case 'CREATE_BOOKING':
    case 'RAISE_COMPLAINT':
      return true; // All authenticated roles can book and raise complaints

    case 'CANCEL_BOOKING':
      if (role === 'ADMIN') return true;
      return isRecordOwner; // Ordinary users and staff can only cancel their own bookings

    case 'ASSIGN_COMPLAINT':
    case 'VIEW_SALARY':
    case 'RUN_DB_LAB':
    case 'MANAGE_BUILDINGS':
      return role === 'ADMIN';

    case 'UPDATE_COMPLAINT_STATUS':
      return role === 'ADMIN' || role === 'MAINTENANCE_STAFF';

    default:
      return false;
  }
}

/**
 * Calculates cosine similarity between two numeric vectors.
 * Returns a score between -1 and 1 (typically 0 to 1 for normalized embeddings).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;
  return dotProduct / magnitude;
}

/**
 * Generates an educational 32-dimensional mock semantic vector based on text keywords
 * when external LLM API is unavailable, ensuring deterministic cosine similarity.
 */
export function generateDeterministicEmbedding(text: string, dimensions: number = 32): number[] {
  const clean = text.toLowerCase();
  const vector = new Array(dimensions).fill(0);
  
  const keywords: Record<string, number> = {
    air: 0,
    ac: 0,
    fan: 0,
    ventilation: 0,
    cooling: 0,
    heat: 1,
    projector: 2,
    screen: 2,
    display: 2,
    hdmi: 2,
    cable: 3,
    power: 4,
    socket: 4,
    electrical: 4,
    light: 5,
    bulb: 5,
    door: 6,
    lock: 6,
    key: 6,
    chair: 7,
    desk: 7,
    furniture: 7,
    water: 8,
    leak: 8,
    pipe: 8,
    plumbing: 8,
    toilet: 8,
    wifi: 9,
    network: 9,
    internet: 9,
  };

  for (const [kw, index] of Object.entries(keywords)) {
    if (clean.includes(kw)) {
      vector[index % dimensions] += 1.0;
    }
  }

  // Also add characters hash dispersion
  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i);
    vector[charCode % dimensions] += 0.05;
  }

  // Normalize vector to unit length
  let sumSq = 0;
  for (let i = 0; i < dimensions; i++) {
    sumSq += vector[i] * vector[i];
  }
  const norm = Math.sqrt(sumSq) || 1;
  return vector.map(v => Number((v / norm).toFixed(6)));
}

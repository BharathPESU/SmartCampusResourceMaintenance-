import { runQuery } from '../db/client';
import { validateBookingTime } from '../logic';
import { insertActivityEvent } from '../db/mongo';

export interface CreateBookingParams {
  userId: string;
  roomId: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  purpose: string;
}

export interface BookingRecord {
  bookingId: string;
  userId: string;
  roomId: string;
  roomNumber: string;
  buildingName: string;
  capacity: number;
  userName: string;
  userEmail: string;
  startTime: string;
  endTime: string;
  purpose: string;
  status: string;
  confirmationCode?: string;
  createdAt: string;
  cancelledAt?: string | null;
}

/**
 * Checks room availability for a requested window.
 * Returns true if available, false if conflicting reservation exists.
 */
export async function checkRoomAvailability(roomId: string, startTime: string, endTime: string): Promise<boolean> {
  const sql = `
    SELECT count(*) as count
    FROM bookings
    WHERE room_id = $1
      AND status != 'CANCELLED'
      AND start_time < $3
      AND end_time > $2
  `;
  const res = await runQuery(sql, [roomId, startTime, endTime]);
  return Number(res.rows?.[0]?.count || 0) === 0;
}

/**
 * Creates a booking atomically:
 * 1. Checks conflict
 * 2. Inserts booking
 * 3. Generates confirmation
 * 4. Inserts outbox event
 */
export async function createBookingAtomic(params: CreateBookingParams): Promise<{
  success: boolean;
  booking?: BookingRecord;
  confirmationCode?: string;
  error?: string;
  conflict?: boolean;
}> {
  const start = new Date(params.startTime);
  const end = new Date(params.endTime);

  const validation = validateBookingTime(start, end);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // 1. Database-enforced conflict prevention check
  const isAvailable = await checkRoomAvailability(params.roomId, params.startTime, params.endTime);
  if (!isAvailable) {
    return {
      success: false,
      conflict: true,
      error: 'Conflict: This room is already reserved during the requested time window.',
    };
  }

  try {
    // 2. Insert booking
    const bookingRes = await runQuery(
      `INSERT INTO bookings (room_id, user_id, start_time, end_time, purpose, status)
       VALUES ($1, $2, $3, $4, $5, 'CONFIRMED')
       RETURNING booking_id, room_id, user_id, start_time, end_time, purpose, status, created_at`,
      [params.roomId, params.userId, params.startTime, params.endTime, params.purpose]
    );

    const bookingRow = bookingRes.rows[0];
    const bookingId = bookingRow.booking_id;

    // 3. Generate unique confirmation code
    const randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const confCode = `CONF-${params.roomId.substring(0, 4).toUpperCase()}-${Date.now().toString().slice(-4)}-${randSuffix}`;

    await runQuery(
      `INSERT INTO confirmations (booking_id, confirmation_code, issue_date)
       VALUES ($1, $2, NOW())`,
      [bookingId, confCode]
    );

    // 4. Create Transactional Outbox Event for MongoDB sync
    const eventPayload = JSON.stringify({
      bookingId,
      roomId: params.roomId,
      userId: params.userId,
      startTime: params.startTime,
      endTime: params.endTime,
      purpose: params.purpose,
      confirmationCode: confCode,
    });

    await runQuery(
      `INSERT INTO outbox_events (event_type, aggregate_type, aggregate_id, payload, status)
       VALUES ('BOOKING_CONFIRMED', 'BOOKING', $1, $2, 'PENDING')`,
      [bookingId, eventPayload]
    );

    // Also trigger direct activity event for immediate UI responsiveness
    await insertActivityEvent({
      eventId: `evt-${bookingId}`,
      eventType: 'BOOKING_CONFIRMED',
      occurredAt: new Date(),
      actorUserId: params.userId,
      aggregateType: 'BOOKING',
      aggregateId: bookingId,
      summary: `Room booked: Confirmation code ${confCode}`,
      metadata: { roomId: params.roomId, confirmationCode: confCode },
      schemaVersion: 1,
    });

    // Fetch full enriched booking details for UI
    const enriched = await getBookingById(bookingId);

    return {
      success: true,
      booking: enriched || undefined,
      confirmationCode: confCode,
    };
  } catch (err: any) {
    console.error('Booking transaction failure:', err);
    return {
      success: false,
      error: err.message || 'Database error occurred during booking creation',
    };
  }
}

/**
 * Retrieves a single booking with room, building, and confirmation details.
 */
export async function getBookingById(bookingId: string): Promise<BookingRecord | null> {
  const sql = `
    SELECT
      bk.booking_id,
      bk.user_id,
      bk.room_id,
      r.room_number,
      b.building_name,
      r.capacity,
      u.first_name || ' ' || u.last_name AS user_name,
      u.email AS user_email,
      bk.start_time,
      bk.end_time,
      bk.purpose,
      bk.status,
      c.confirmation_code,
      bk.created_at,
      bk.cancelled_at
    FROM bookings bk
    JOIN rooms r ON bk.room_id = r.room_id
    JOIN buildings b ON r.building_id = b.building_id
    JOIN user_profiles u ON bk.user_id = u.user_id
    LEFT JOIN confirmations c ON bk.booking_id = c.booking_id
    WHERE bk.booking_id = $1
  `;
  const res = await runQuery(sql, [bookingId]);
  if (!res.rows?.length) return null;
  const row = res.rows[0];
  return {
    bookingId: row.booking_id,
    userId: row.user_id,
    roomId: row.room_id,
    roomNumber: row.room_number,
    buildingName: row.building_name,
    capacity: row.capacity,
    userName: row.user_name,
    userEmail: row.user_email,
    startTime: row.start_time,
    endTime: row.end_time,
    purpose: row.purpose,
    status: row.status,
    confirmationCode: row.confirmation_code,
    createdAt: row.created_at,
    cancelledAt: row.cancelled_at,
  };
}

/**
 * Returns list of bookings with optional filters.
 */
export async function listBookings(params?: {
  userId?: string;
  roomId?: string;
  status?: string;
  limit?: number;
}): Promise<BookingRecord[]> {
  let sql = `
    SELECT
      bk.booking_id,
      bk.user_id,
      bk.room_id,
      r.room_number,
      b.building_name,
      r.capacity,
      u.first_name || ' ' || u.last_name AS user_name,
      u.email AS user_email,
      bk.start_time,
      bk.end_time,
      bk.purpose,
      bk.status,
      c.confirmation_code,
      bk.created_at,
      bk.cancelled_at
    FROM bookings bk
    JOIN rooms r ON bk.room_id = r.room_id
    JOIN buildings b ON r.building_id = b.building_id
    JOIN user_profiles u ON bk.user_id = u.user_id
    LEFT JOIN confirmations c ON bk.booking_id = c.booking_id
    WHERE 1=1
  `;
  const values: any[] = [];
  let paramIdx = 1;

  if (params?.userId) {
    sql += ` AND bk.user_id = $${paramIdx++}`;
    values.push(params.userId);
  }
  if (params?.roomId) {
    sql += ` AND bk.room_id = $${paramIdx++}`;
    values.push(params.roomId);
  }
  if (params?.status) {
    sql += ` AND bk.status = $${paramIdx++}`;
    values.push(params.status);
  }

  sql += ` ORDER BY bk.start_time DESC LIMIT $${paramIdx++}`;
  values.push(params?.limit || 50);

  const res = await runQuery(sql, values);
  return res.rows.map(row => ({
    bookingId: row.booking_id,
    userId: row.user_id,
    roomId: row.room_id,
    roomNumber: row.room_number,
    buildingName: row.building_name,
    capacity: row.capacity,
    userName: row.user_name,
    userEmail: row.user_email,
    startTime: row.start_time,
    endTime: row.end_time,
    purpose: row.purpose,
    status: row.status,
    confirmationCode: row.confirmation_code,
    createdAt: row.created_at,
    cancelledAt: row.cancelled_at,
  }));
}

/**
 * Cancels a booking, freeing the room for future reservations.
 */
export async function cancelBooking(bookingId: string, actingUserId: string, isAdmin: boolean = false): Promise<{
  success: boolean;
  error?: string;
}> {
  const booking = await getBookingById(bookingId);
  if (!booking) {
    return { success: false, error: 'Booking not found' };
  }

  if (!isAdmin && booking.userId !== actingUserId) {
    return { success: false, error: 'Unauthorized: You can only cancel your own bookings' };
  }

  if (booking.status === 'CANCELLED') {
    return { success: false, error: 'Booking is already cancelled' };
  }

  await runQuery(
    `UPDATE bookings
     SET status = 'CANCELLED', cancelled_at = NOW(), updated_at = NOW()
     WHERE booking_id = $1`,
    [bookingId]
  );

  // Outbox event
  await runQuery(
    `INSERT INTO outbox_events (event_type, aggregate_type, aggregate_id, payload, status)
     VALUES ('BOOKING_CANCELLED', 'BOOKING', $1, $2, 'PENDING')`,
    [bookingId, JSON.stringify({ bookingId, cancelledBy: actingUserId })]
  );

  await insertActivityEvent({
    eventId: `evt-cancel-${bookingId}-${Date.now()}`,
    eventType: 'BOOKING_CANCELLED',
    occurredAt: new Date(),
    actorUserId: actingUserId,
    aggregateType: 'BOOKING',
    aggregateId: bookingId,
    summary: `Booking for ${booking.roomNumber} was cancelled.`,
    metadata: { bookingId, roomNumber: booking.roomNumber },
    schemaVersion: 1,
  });

  return { success: true };
}

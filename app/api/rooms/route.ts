import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/db/client';

export async function GET(req: NextRequest) {
  const buildingId = req.nextUrl.searchParams.get('buildingId');
  const roomType = req.nextUrl.searchParams.get('roomType');
  const minCapacity = req.nextUrl.searchParams.get('minCapacity');

  let sql = `
    SELECT
      r.room_id,
      r.building_id,
      b.building_name,
      r.room_number,
      r.floor_no,
      r.room_type,
      r.capacity,
      r.status,
      (SELECT count(*) FROM assets a WHERE a.room_id = r.room_id) AS total_assets,
      (SELECT count(*) FROM bookings bk WHERE bk.room_id = r.room_id AND bk.status = 'CONFIRMED' AND bk.end_time > NOW()) AS active_bookings_count
    FROM rooms r
    JOIN buildings b ON r.building_id = b.building_id
    WHERE 1=1
  `;
  const values: any[] = [];
  let paramIdx = 1;

  if (buildingId) {
    sql += ` AND r.building_id = $${paramIdx++}`;
    values.push(buildingId);
  }
  if (roomType) {
    sql += ` AND r.room_type = $${paramIdx++}`;
    values.push(roomType);
  }
  if (minCapacity) {
    sql += ` AND r.capacity >= $${paramIdx++}`;
    values.push(Number(minCapacity));
  }

  sql += ` ORDER BY b.building_name ASC, r.room_number ASC`;

  const res = await runQuery(sql, values);
  return NextResponse.json({ rooms: res.rows });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { buildingId, roomNumber, floorNo, roomType, capacity, status } = body;

    if (!buildingId || !roomNumber || !floorNo || !roomType || !capacity) {
      return NextResponse.json({ success: false, error: 'All fields are required' }, { status: 400 });
    }

    const res = await runQuery(
      `INSERT INTO rooms (building_id, room_number, floor_no, room_type, capacity, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [buildingId, roomNumber, Number(floorNo), roomType, Number(capacity), status || 'AVAILABLE']
    );

    return NextResponse.json({ success: true, room: res.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

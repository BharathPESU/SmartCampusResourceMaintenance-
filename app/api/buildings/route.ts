import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/db/client';

export async function GET() {
  const sql = `
    SELECT
      b.building_id,
      b.building_name,
      b.location,
      b.total_floors,
      b.created_at,
      (SELECT count(*) FROM rooms r WHERE r.building_id = b.building_id) AS total_rooms,
      (SELECT count(*) FROM facilities f WHERE f.building_id = b.building_id) AS total_facilities
    FROM buildings b
    ORDER BY b.building_name ASC
  `;
  const res = await runQuery(sql);
  return NextResponse.json({ buildings: res.rows });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { buildingName, location, totalFloors } = body;
    if (!buildingName || !location || !totalFloors) {
      return NextResponse.json({ success: false, error: 'All fields are required' }, { status: 400 });
    }

    const res = await runQuery(
      `INSERT INTO buildings (building_name, location, total_floors)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [buildingName, location, Number(totalFloors)]
    );

    return NextResponse.json({ success: true, building: res.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

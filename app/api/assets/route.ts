import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/db/client';

export async function GET(req: NextRequest) {
  const roomId = req.nextUrl.searchParams.get('roomId');
  const category = req.nextUrl.searchParams.get('category');
  const status = req.nextUrl.searchParams.get('status');

  let sql = `
    SELECT
      a.asset_id,
      a.asset_name,
      a.category,
      a.status,
      a.created_at,
      r.room_id,
      r.room_number,
      b.building_id,
      b.building_name,
      (SELECT count(*) FROM complaints c WHERE c.asset_id = a.asset_id) AS total_complaints,
      (SELECT count(*) FROM complaints c WHERE c.asset_id = a.asset_id AND c.status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS')) AS active_complaints
    FROM assets a
    JOIN rooms r ON a.room_id = r.room_id
    JOIN buildings b ON r.building_id = b.building_id
    WHERE 1=1
  `;
  const values: any[] = [];
  let paramIdx = 1;

  if (roomId) {
    sql += ` AND a.room_id = $${paramIdx++}`;
    values.push(roomId);
  }
  if (category) {
    sql += ` AND a.category = $${paramIdx++}`;
    values.push(category);
  }
  if (status) {
    sql += ` AND a.status = $${paramIdx++}`;
    values.push(status);
  }

  sql += ` ORDER BY a.asset_name ASC`;

  const res = await runQuery(sql, values);
  return NextResponse.json({ assets: res.rows });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomId, assetName, category, status } = body;
    if (!roomId || !assetName || !category) {
      return NextResponse.json({ success: false, error: 'roomId, assetName, and category are required' }, { status: 400 });
    }

    const res = await runQuery(
      `INSERT INTO assets (room_id, asset_name, category, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [roomId, assetName, category, status || 'OPERATIONAL']
    );

    return NextResponse.json({ success: true, asset: res.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

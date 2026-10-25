import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/db/client';

export async function GET() {
  const sql = `
    SELECT
      f.facility_id,
      f.facility_name,
      f.operating_hours,
      f.status,
      f.building_id,
      b.building_name,
      (SELECT count(*) FROM facility_usage fu WHERE fu.facility_id = f.facility_id) AS total_usages,
      (SELECT count(*) FROM staff_profiles s WHERE s.facility_id = f.facility_id) AS assigned_staff_count
    FROM facilities f
    JOIN buildings b ON f.building_id = b.building_id
    ORDER BY f.facility_name ASC
  `;
  const res = await runQuery(sql);

  // Also fetch recent facility usage logs
  const usageSql = `
    SELECT
      fu.usage_id,
      fu.facility_id,
      f.facility_name,
      fu.user_id,
      u.first_name || ' ' || u.last_name AS user_name,
      fu.used_at,
      fu.purpose
    FROM facility_usage fu
    JOIN facilities f ON fu.facility_id = f.facility_id
    JOIN user_profiles u ON fu.user_id = u.user_id
    ORDER BY fu.used_at DESC
    LIMIT 20
  `;
  const usageRes = await runQuery(usageSql);

  return NextResponse.json({
    facilities: res.rows,
    usages: usageRes.rows,
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/db/client';

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role') || req.nextUrl.searchParams.get('role');
  const isAdmin = role === 'ADMIN';

  const sql = `
    SELECT
      s.staff_id,
      s.user_id,
      u.first_name || ' ' || u.last_name AS staff_name,
      u.email,
      u.department,
      s.designation,
      s.salary,
      s.facility_id,
      f.facility_name,
      s.supervisor_staff_id,
      sup_u.first_name || ' ' || sup_u.last_name AS supervisor_name,
      (SELECT count(*) FROM complaints c WHERE c.assigned_staff_id = s.staff_id AND c.status IN ('ASSIGNED', 'IN_PROGRESS')) AS active_workload,
      (SELECT count(*) FROM complaints c WHERE c.assigned_staff_id = s.staff_id AND c.status = 'RESOLVED') AS resolved_count
    FROM staff_profiles s
    JOIN user_profiles u ON s.user_id = u.user_id
    LEFT JOIN facilities f ON s.facility_id = f.facility_id
    LEFT JOIN staff_profiles sup ON s.supervisor_staff_id = sup.staff_id
    LEFT JOIN user_profiles sup_u ON sup.user_id = sup_u.user_id
    ORDER BY active_workload DESC
  `;

  const res = await runQuery(sql);

  // Mask salary for non-admin requests
  const sanitized = res.rows.map(row => {
    const item = { ...row };
    if (!isAdmin) {
      delete item.salary;
      item.salaryMasked = true;
    }
    return item;
  });

  return NextResponse.json({
    staff: sanitized,
    isAdminAccess: isAdmin,
  });
}

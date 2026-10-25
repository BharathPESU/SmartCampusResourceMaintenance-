import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/db/client';

const DEMO_USERS = [
  {
    userId: '11111111-1111-1111-1111-111111111111',
    email: 'admin@campus.edu',
    name: 'Eleanor Vance',
    role: 'ADMIN',
    department: 'Campus Operations & Facilities',
    designation: 'Director of Campus Operations',
  },
  {
    userId: '22222222-2222-2222-2222-222222222222',
    email: 'john.tech@campus.edu',
    name: 'Marcus Brody',
    role: 'MAINTENANCE_STAFF',
    department: 'HVAC & Electrical Maintenance',
    designation: 'Chief Facilities Engineer',
    staffId: 'ssssssss-1111-1111-1111-111111111111',
  },
  {
    userId: '33333333-3333-3333-3333-333333333333',
    email: 'sarah.av@campus.edu',
    name: 'Sarah Chen',
    role: 'MAINTENANCE_STAFF',
    department: 'Audio/Visual & Media Systems',
    designation: 'Senior AV Specialist',
    staffId: 'ssssssss-2222-2222-2222-222222222222',
  },
  {
    userId: '44444444-4444-4444-4444-444444444444',
    email: 'alex.user@campus.edu',
    name: 'Alex Mercer',
    role: 'CAMPUS_USER',
    department: 'Computer Science & Engineering',
    designation: 'Undergraduate Student Researcher',
  },
  {
    userId: '54444444-4444-4444-4444-444444444444',
    email: 'priya.sharma@campus.edu',
    name: 'Priya Sharma',
    role: 'CAMPUS_USER',
    department: 'Electrical Engineering',
    designation: 'Graduate Teaching Assistant',
  },
];

export async function GET(req: NextRequest) {
  const roleParam = req.nextUrl.searchParams.get('role');
  const userHeader = req.headers.get('x-user-id') || req.cookies.get('campus_user_id')?.value;

  let activeUser = DEMO_USERS[0]; // Default to Admin for evaluation ease

  if (roleParam) {
    const found = DEMO_USERS.find(u => u.role === roleParam);
    if (found) activeUser = found;
  } else if (userHeader) {
    const found = DEMO_USERS.find(u => u.userId === userHeader);
    if (found) activeUser = found;
  }

  return NextResponse.json({
    user: activeUser,
    availableDemoUsers: DEMO_USERS,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, role } = body;

    let targetUser = DEMO_USERS[0];
    if (userId) {
      targetUser = DEMO_USERS.find(u => u.userId === userId) || DEMO_USERS[0];
    } else if (role) {
      targetUser = DEMO_USERS.find(u => u.role === role) || DEMO_USERS[0];
    }

    const response = NextResponse.json({
      success: true,
      user: targetUser,
      message: `Switched active identity to ${targetUser.name} (${targetUser.role})`,
    });

    response.cookies.set('campus_user_id', targetUser.userId, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

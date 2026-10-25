import { NextRequest, NextResponse } from 'next/server';
import {
  listComplaints,
  createComplaint,
  assignComplaint,
  updateComplaintStatus,
  getComplaintAuditLog,
  getComplaintById,
} from '@/lib/services/complaint-service';
import { z } from 'zod';

const createComplaintSchema = z.object({
  raisedByUserId: z.string().uuid(),
  assetId: z.string().uuid(),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
});

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const complaintId = url.searchParams.get('id');
  const audit = url.searchParams.get('audit') === 'true';

  if (complaintId && audit) {
    const logs = await getComplaintAuditLog(complaintId);
    return NextResponse.json({ logs });
  }

  if (complaintId) {
    const item = await getComplaintById(complaintId);
    if (!item) return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    return NextResponse.json({ complaint: item });
  }

  const raisedByUserId = url.searchParams.get('userId') || undefined;
  const assignedStaffId = url.searchParams.get('staffId') || undefined;
  const status = url.searchParams.get('status') || undefined;
  const priority = url.searchParams.get('priority') || undefined;

  const complaints = await listComplaints({ raisedByUserId, assignedStaffId, status, priority });
  return NextResponse.json({ complaints });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createComplaintSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid complaint data' },
        { status: 400 }
      );
    }

    const res = await createComplaint(parsed.data);
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, complaint: res.complaint });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, complaintId, staffId, status, userId, resolutionNotes } = body;

    if (!complaintId) {
      return NextResponse.json({ success: false, error: 'complaintId is required' }, { status: 400 });
    }

    if (action === 'ASSIGN') {
      if (!staffId || !userId) {
        return NextResponse.json({ success: false, error: 'staffId and userId are required' }, { status: 400 });
      }
      const res = await assignComplaint(complaintId, staffId, userId);
      return NextResponse.json(res);
    }

    if (action === 'UPDATE_STATUS') {
      if (!status || !userId) {
        return NextResponse.json({ success: false, error: 'status and userId are required' }, { status: 400 });
      }
      const res = await updateComplaintStatus(complaintId, status, userId, resolutionNotes);
      return NextResponse.json(res);
    }

    return NextResponse.json({ success: false, error: 'Invalid action type' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

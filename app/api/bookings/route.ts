import { NextRequest, NextResponse } from 'next/server';
import {
  listBookings,
  createBookingAtomic,
  cancelBooking,
  checkRoomAvailability,
} from '@/lib/services/booking-service';
import { z } from 'zod';

const createBookingSchema = z.object({
  userId: z.string().uuid(),
  roomId: z.string().uuid(),
  startTime: z.string(),
  endTime: z.string(),
  purpose: z.string().min(3, 'Purpose must be at least 3 characters'),
});

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const roomId = url.searchParams.get('roomId') || undefined;
  const userId = url.searchParams.get('userId') || undefined;
  const status = url.searchParams.get('status') || undefined;
  const checkOnly = url.searchParams.get('checkAvailability') === 'true';
  const startTime = url.searchParams.get('startTime');
  const endTime = url.searchParams.get('endTime');

  if (checkOnly && roomId && startTime && endTime) {
    const isAvailable = await checkRoomAvailability(roomId, startTime, endTime);
    return NextResponse.json({ roomId, startTime, endTime, isAvailable });
  }

  const bookings = await listBookings({ roomId, userId, status });
  return NextResponse.json({ bookings });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid booking data' },
        { status: 400 }
      );
    }

    const result = await createBookingAtomic(parsed.data);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, conflict: result.conflict },
        { status: result.conflict ? 409 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      booking: result.booking,
      confirmationCode: result.confirmationCode,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { bookingId, userId, isAdmin } = body;
    if (!bookingId || !userId) {
      return NextResponse.json({ success: false, error: 'bookingId and userId are required' }, { status: 400 });
    }

    const res = await cancelBooking(bookingId, userId, !!isAdmin);
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Booking successfully cancelled' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

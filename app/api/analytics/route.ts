import { NextResponse } from 'next/server';
import { getComprehensiveAnalytics } from '@/lib/services/analytics-service';

export async function GET() {
  try {
    const data = await getComprehensiveAnalytics();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

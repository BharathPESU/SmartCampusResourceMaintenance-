import { NextRequest, NextResponse } from 'next/server';
import { PREDEFINED_DEMO_QUERIES, executeDemoQuery } from '@/lib/services/demo-lab-service';
import { getDatabaseStatus } from '@/lib/db/client';
import { getMongoStatus } from '@/lib/db/mongo';

export async function GET() {
  const [dbStatus, mongoStatus] = await Promise.all([
    getDatabaseStatus(),
    getMongoStatus(),
  ]);

  return NextResponse.json({
    dbStatus,
    mongoStatus,
    queries: PREDEFINED_DEMO_QUERIES,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { queryId } = body;
    if (!queryId) {
      return NextResponse.json({ success: false, error: 'queryId is required' }, { status: 400 });
    }

    const res = await executeDemoQuery(queryId);
    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

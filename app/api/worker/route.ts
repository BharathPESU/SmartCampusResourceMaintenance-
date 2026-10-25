import { NextResponse } from 'next/server';
import { runQuery } from '@/lib/db/client';
import { insertActivityEvent } from '@/lib/db/mongo';

/**
 * Transactional Outbox Worker:
 * Reads uncommitted/pending events from PostgreSQL outbox_events table,
 * safely delivers them to MongoDB activity_events collection,
 * and marks them PROCESSED in PostgreSQL.
 */
export async function POST() {
  try {
    // 1. Fetch pending outbox events from PostgreSQL
    const sql = `
      SELECT event_id, event_type, aggregate_type, aggregate_id, payload, attempts, created_at
      FROM outbox_events
      WHERE status = 'PENDING'
      ORDER BY created_at ASC
      LIMIT 20
    `;
    const res = await runQuery(sql);
    const pendingEvents = res.rows;

    let processedCount = 0;
    let failedCount = 0;

    for (const evt of pendingEvents) {
      try {
        const payloadObj = typeof evt.payload === 'string' ? JSON.parse(evt.payload) : evt.payload;
        
        // Deliver to MongoDB
        await insertActivityEvent({
          eventId: evt.event_id,
          eventType: evt.event_type,
          occurredAt: new Date(evt.created_at),
          actorUserId: payloadObj.userId || payloadObj.changedBy,
          aggregateType: evt.aggregate_type,
          aggregateId: evt.aggregate_id,
          summary: `Outbox delivered: ${evt.event_type} (${evt.aggregate_type} #${evt.aggregate_id.slice(0, 8)})`,
          metadata: payloadObj,
          schemaVersion: 1,
        });

        // Update outbox event as PROCESSED in PostgreSQL
        await runQuery(
          `UPDATE outbox_events
           SET status = 'PROCESSED', processed_at = NOW(), attempts = attempts + 1
           WHERE event_id = $1`,
          [evt.event_id]
        );
        processedCount++;
      } catch (err: any) {
        await runQuery(
          `UPDATE outbox_events
           SET attempts = attempts + 1, last_error = $1
           WHERE event_id = $2`,
          [err.message || 'Worker processing error', evt.event_id]
        );
        failedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      pendingFound: pendingEvents.length,
      processedCount,
      failedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

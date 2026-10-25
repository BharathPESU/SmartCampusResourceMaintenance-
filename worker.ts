/**
 * Standalone Transactional Outbox Worker:
 * Reads pending events from PostgreSQL outbox_events, delivers to MongoDB,
 * and marks them PROCESSED in PostgreSQL.
 *
 * Can be run independently via: npm run worker:outbox
 */
import { runQuery } from './lib/db/client';
import { insertActivityEvent } from './lib/db/mongo';

async function runWorkerLoop() {
  console.log('[Outbox Worker] Starting outbox event processing cycle...');

  const sql = `
    SELECT event_id, event_type, aggregate_type, aggregate_id, payload, created_at
    FROM outbox_events
    WHERE status = 'PENDING'
    ORDER BY created_at ASC
    LIMIT 50
  `;

  try {
    const res = await runQuery(sql);
    const events = res.rows;
    console.log(`[Outbox Worker] Found ${events.length} pending events.`);

    for (const evt of events) {
      try {
        const payload = typeof evt.payload === 'string' ? JSON.parse(evt.payload) : evt.payload;
        await insertActivityEvent({
          eventId: evt.event_id,
          eventType: evt.event_type,
          occurredAt: new Date(evt.created_at),
          actorUserId: payload.userId,
          aggregateType: evt.aggregate_type,
          aggregateId: evt.aggregate_id,
          summary: `Worker sync: ${evt.event_type} (${evt.aggregate_type})`,
          metadata: payload,
          schemaVersion: 1,
        });

        await runQuery(
          `UPDATE outbox_events
           SET status = 'PROCESSED', processed_at = NOW(), attempts = attempts + 1
           WHERE event_id = $1`,
          [evt.event_id]
        );
        console.log(`[Outbox Worker] Successfully processed event: ${evt.event_id} (${evt.event_type})`);
      } catch (err: any) {
        console.error(`[Outbox Worker] Error processing event ${evt.event_id}:`, err);
        await runQuery(
          `UPDATE outbox_events
           SET attempts = attempts + 1, last_error = $1
           WHERE event_id = $2`,
          [err.message, evt.event_id]
        );
      }
    }
  } catch (err) {
    console.error('[Outbox Worker] Failed to query outbox:', err);
  }
}

// Run once or on interval if started directly
runWorkerLoop()
  .then(() => {
    console.log('[Outbox Worker] Cycle completed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('[Outbox Worker] Fatal error:', err);
    process.exit(1);
  });

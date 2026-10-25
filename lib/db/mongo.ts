import { MongoClient } from 'mongodb';

export interface ActivityEventDocument {
  eventId: string;
  eventType: string;
  occurredAt: Date;
  actorUserId?: string;
  aggregateType: string;
  aggregateId: string;
  summary: string;
  metadata: Record<string, any>;
  schemaVersion: number;
}

export interface MongoStatus {
  configured: boolean;
  connected: boolean;
  databaseName: string;
  collectionName: string;
  eventCount: number;
  lastChecked: string;
  error?: string;
}

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'smart_campus_events';
const COLLECTION_NAME = 'activity_events';

let mongoClient: MongoClient | null = null;

// Local persistent event store for fallback/unconfigured demonstration
const fallbackActivityEvents: ActivityEventDocument[] = [
  {
    eventId: 'eeeeeeee-1111-1111-1111-111111111111',
    eventType: 'BOOKING_CONFIRMED',
    occurredAt: new Date(Date.now() - 24 * 3600 * 1000),
    actorUserId: '44444444-4444-4444-4444-444444444444',
    aggregateType: 'BOOKING',
    aggregateId: '10101010-1111-1111-1111-111111111111',
    summary: 'Booking confirmed for Room ENG-101 (Code: CONF-ENG101-2026-X88A)',
    metadata: { roomId: 'rrrrrrrr-1111-1111-1111-111111111111', roomNumber: 'ENG-101', capacity: 120 },
    schemaVersion: 1,
  },
  {
    eventId: 'eeeeeeee-2222-2222-2222-222222222222',
    eventType: 'COMPLAINT_CREATED',
    occurredAt: new Date(Date.now() - 18 * 3600 * 1000),
    actorUserId: '44444444-4444-4444-4444-444444444444',
    aggregateType: 'COMPLAINT',
    aggregateId: '99999999-1111-1111-1111-111111111111',
    summary: 'High priority complaint filed: Air circulation unit failure',
    metadata: { priority: 'HIGH', assetCategory: 'HVAC', assetName: 'Central Variable Air Volume HVAC Unit' },
    schemaVersion: 1,
  },
  {
    eventId: 'eeeeeeee-3333-3333-3333-333333333333',
    eventType: 'COMPLAINT_STATUS_CHANGED',
    occurredAt: new Date(Date.now() - 12 * 3600 * 1000),
    actorUserId: '11111111-1111-1111-1111-111111111111',
    aggregateType: 'COMPLAINT',
    aggregateId: '99999999-1111-1111-1111-111111111111',
    summary: 'Complaint assigned to Marcus Brody (Chief Facilities Engineer)',
    metadata: { assignedStaffId: 'ssssssss-1111-1111-1111-111111111111', status: 'IN_PROGRESS' },
    schemaVersion: 1,
  },
  {
    eventId: 'eeeeeeee-4444-4444-4444-444444444444',
    eventType: 'COMPLAINT_RESOLVED',
    occurredAt: new Date(Date.now() - 6 * 3600 * 1000),
    actorUserId: '33333333-3333-3333-3333-333333333333',
    aggregateType: 'COMPLAINT',
    aggregateId: '99999999-2222-2222-2222-222222222222',
    summary: 'Auditorium Projector maintenance completed and tested',
    metadata: { resolutionNotes: 'Replaced secondary cooling fan assembly' },
    schemaVersion: 1,
  },
];

export async function getMongoClient(): Promise<MongoClient | null> {
  if (!MONGODB_URI) return null;
  if (mongoClient) return mongoClient;

  try {
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    // Ensure unique index on eventId for idempotency
    const db = mongoClient.db(DB_NAME);
    await db.collection(COLLECTION_NAME).createIndex({ eventId: 1 }, { unique: true });
    await db.collection(COLLECTION_NAME).createIndex({ occurredAt: -1 });
    await db.collection(COLLECTION_NAME).createIndex({ eventType: 1 });
    return mongoClient;
  } catch (err) {
    console.warn('MongoDB connection could not be established:', err);
    return null;
  }
}

/**
 * Inserts an activity event into MongoDB with idempotent event ID handling.
 */
export async function insertActivityEvent(event: ActivityEventDocument): Promise<boolean> {
  const client = await getMongoClient();
  if (client) {
    try {
      const db = client.db(DB_NAME);
      await db.collection(COLLECTION_NAME).updateOne(
        { eventId: event.eventId },
        { $setOnInsert: event },
        { upsert: true }
      );
      return true;
    } catch (err) {
      console.error('Failed to insert event into MongoDB:', err);
    }
  }

  // Fallback to in-memory store
  const exists = fallbackActivityEvents.some(e => e.eventId === event.eventId);
  if (!exists) {
    fallbackActivityEvents.unshift(event);
  }
  return true;
}

/**
 * Returns latest activity events stream.
 */
export async function getRecentActivityEvents(limit: number = 20): Promise<ActivityEventDocument[]> {
  const client = await getMongoClient();
  if (client) {
    try {
      const db = client.db(DB_NAME);
      const events = await db
        .collection<ActivityEventDocument>(COLLECTION_NAME)
        .find()
        .sort({ occurredAt: -1 })
        .limit(limit)
        .toArray();
      return events;
    } catch (err) {
      console.warn('MongoDB query failed, falling back to local store:', err);
    }
  }

  return [...fallbackActivityEvents]
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, limit);
}

/**
 * MongoDB Aggregation Pipeline 1: Event Counts by Category over time
 */
export async function aggregateEventsByType(): Promise<Array<{ _id: string; count: number }>> {
  const client = await getMongoClient();
  if (client) {
    try {
      const db = client.db(DB_NAME);
      const result = await db.collection(COLLECTION_NAME).aggregate<{ _id: string; count: number }>([
        {
          $group: {
            _id: '$eventType',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]).toArray();
      return result;
    } catch (err) {
      console.warn('Mongo aggregation failed, using fallback:', err);
    }
  }

  // Fallback aggregation logic
  const counts: Record<string, number> = {};
  for (const e of fallbackActivityEvents) {
    counts[e.eventType] = (counts[e.eventType] || 0) + 1;
  }
  return Object.entries(counts).map(([_id, count]) => ({ _id, count }));
}

/**
 * MongoDB Aggregation Pipeline 2: Activity Events by Aggregate Type
 */
export async function aggregateEventsByAggregate(): Promise<Array<{ _id: string; totalEvents: number; lastOccurred: Date }>> {
  const client = await getMongoClient();
  if (client) {
    try {
      const db = client.db(DB_NAME);
      return await db.collection(COLLECTION_NAME).aggregate<any>([
        {
          $group: {
            _id: '$aggregateType',
            totalEvents: { $sum: 1 },
            lastOccurred: { $max: '$occurredAt' },
          },
        },
        { $sort: { totalEvents: -1 } },
      ]).toArray();
    } catch (err) {
      console.warn('Mongo aggregation failed, using fallback:', err);
    }
  }

  const map: Record<string, { totalEvents: number; lastOccurred: Date }> = {};
  for (const e of fallbackActivityEvents) {
    if (!map[e.aggregateType]) {
      map[e.aggregateType] = { totalEvents: 0, lastOccurred: e.occurredAt };
    }
    map[e.aggregateType].totalEvents += 1;
    if (e.occurredAt > map[e.aggregateType].lastOccurred) {
      map[e.aggregateType].lastOccurred = e.occurredAt;
    }
  }
  return Object.entries(map).map(([_id, val]) => ({
    _id,
    totalEvents: val.totalEvents,
    lastOccurred: val.lastOccurred,
  }));
}

/**
 * Returns connection and collection status for MongoDB.
 */
export async function getMongoStatus(): Promise<MongoStatus> {
  const isConfigured = !!MONGODB_URI && MONGODB_URI.trim() !== '';
  if (!isConfigured) {
    return {
      configured: false,
      connected: false,
      databaseName: DB_NAME,
      collectionName: COLLECTION_NAME,
      eventCount: fallbackActivityEvents.length,
      lastChecked: new Date().toISOString(),
      error: 'MONGODB_URI environment variable not configured. Ready to connect.',
    };
  }

  try {
    const client = await getMongoClient();
    if (!client) {
      return {
        configured: true,
        connected: false,
        databaseName: DB_NAME,
        collectionName: COLLECTION_NAME,
        eventCount: fallbackActivityEvents.length,
        lastChecked: new Date().toISOString(),
        error: 'Failed to establish connection to MongoDB URI',
      };
    }
    const count = await client.db(DB_NAME).collection(COLLECTION_NAME).countDocuments();
    return {
      configured: true,
      connected: true,
      databaseName: DB_NAME,
      collectionName: COLLECTION_NAME,
      eventCount: count,
      lastChecked: new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      databaseName: DB_NAME,
      collectionName: COLLECTION_NAME,
      eventCount: fallbackActivityEvents.length,
      lastChecked: new Date().toISOString(),
      error: err?.message || 'MongoDB status check failed',
    };
  }
}

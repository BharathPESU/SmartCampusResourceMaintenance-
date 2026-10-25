/**
 * Smart Campus Resource & Maintenance Management System
 * Academic Level 3 DBMS - MongoDB Aggregation Pipelines
 *
 * Can be executed via mongosh or Node.js MongoDB driver against the 'smart_campus_events' database.
 */

// Connect to collection
const collection = db.activity_events;

print("=== PIPELINE 1: Activity Event Frequency by Event Type ===");
const eventsByType = collection.aggregate([
  {
    $group: {
      _id: "$eventType",
      totalOccurrences: { $sum: 1 },
      lastOccurred: { $max: "$occurredAt" },
      uniqueAggregates: { $addToSet: "$aggregateId" }
    }
  },
  {
    $project: {
      eventType: "$_id",
      totalOccurrences: 1,
      lastOccurred: 1,
      distinctEntitiesCount: { $size: "$uniqueAggregates" }
    }
  },
  { $sort: { totalOccurrences: -1 } }
]);
printjson(eventsByType.toArray());

print("\n=== PIPELINE 2: Maintenance Activity by User / Actor ===");
const activityByActor = collection.aggregate([
  {
    $match: {
      actorUserId: { $exists: true, $ne: null }
    }
  },
  {
    $group: {
      _id: "$actorUserId",
      eventCount: { $sum: 1 },
      actionsPerformed: { $addToSet: "$eventType" },
      latestActionTime: { $max: "$occurredAt" }
    }
  },
  { $sort: { eventCount: -1 } }
]);
printjson(activityByActor.toArray());

print("\n=== PIPELINE 3: Daily Campus Event Volume Trend ===");
const dailyEventTrend = collection.aggregate([
  {
    $group: {
      _id: {
        $dateToString: { format: "%Y-%m-%d", date: "$occurredAt" }
      },
      dailyEvents: { $sum: 1 },
      bookingEvents: {
        $sum: {
          $cond: [{ $regexMatch: { input: "$eventType", regex: /^BOOKING/ } }, 1, 0]
        }
      },
      complaintEvents: {
        $sum: {
          $cond: [{ $regexMatch: { input: "$eventType", regex: /^COMPLAINT/ } }, 1, 0]
        }
      }
    }
  },
  { $sort: { _id: 1 } }
]);
printjson(dailyEventTrend.toArray());

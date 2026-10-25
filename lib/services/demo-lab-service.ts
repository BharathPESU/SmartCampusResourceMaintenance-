import { runQuery, executeSqlScript, getDatabaseStatus } from '../db/client';
import { aggregateEventsByType, aggregateEventsByAggregate, getRecentActivityEvents, getMongoStatus } from '../db/mongo';
import { searchComplaintsSemantically } from './vector-service';

export interface SqlDemoQuery {
  id: string;
  category: 'DDL' | 'DML' | 'JOINS' | 'AGGREGATES' | 'SUBQUERIES' | 'VIEWS' | 'TRIGGERS' | 'STORED_FUNCTIONS' | 'CONSTRAINTS';
  title: string;
  description: string;
  sql: string;
  isExecutable: boolean;
  explanation: string;
}

export const PREDEFINED_DEMO_QUERIES: SqlDemoQuery[] = [
  // 1. DDL: Safe demonstration table CREATE, ALTER, and DROP
  {
    id: 'ddl-lifecycle',
    category: 'DDL',
    title: 'DDL Lifecycle: CREATE, ALTER & Safe DROP',
    description: 'Demonstrates CREATE TABLE with constraints, ALTER TABLE to add an index/column, and safe DROP on a demonstration table.',
    sql: `
-- 1. CREATE demonstration object
CREATE TABLE IF NOT EXISTS demo_campus_sensor_logs (
    sensor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sensor_name VARCHAR(100) NOT NULL,
    temperature_c NUMERIC(4, 1) CHECK (temperature_c BETWEEN -20.0 AND 60.0),
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ALTER TABLE: Add battery status column and index
ALTER TABLE demo_campus_sensor_logs ADD COLUMN IF NOT EXISTS battery_level INTEGER DEFAULT 100;
CREATE INDEX IF NOT EXISTS idx_demo_sensor_time ON demo_campus_sensor_logs(logged_at);

-- 3. INSERT sample sensor record
INSERT INTO demo_campus_sensor_logs (sensor_name, temperature_c, battery_level)
VALUES ('ENG-101-HVAC-Sensor', 23.5, 95);

-- 4. SELECT from the newly created and altered table
SELECT * FROM demo_campus_sensor_logs ORDER BY logged_at DESC LIMIT 5;

-- 5. Safe Educational DROP of the demonstration table
DROP TABLE IF EXISTS demo_campus_sensor_logs;
    `,
    isExecutable: true,
    explanation: 'Safely illustrates DDL operations without risking live campus production records. Uses CHECK constraints and column additions.',
  },

  // 2. DML: INSERT, UPDATE, DELETE, SELECT
  {
    id: 'dml-crud',
    category: 'DML',
    title: 'DML Operations: Parameterized INSERT, UPDATE, DELETE & SELECT',
    description: 'Performs full data manipulation on facility usage records with transaction safety.',
    sql: `
SELECT
    u.first_name || ' ' || u.last_name AS user_name,
    f.facility_name,
    fu.purpose,
    fu.used_at
FROM facility_usage fu
JOIN user_profiles u ON fu.user_id = u.user_id
JOIN facilities f ON fu.facility_id = f.facility_id
ORDER BY fu.used_at DESC;
    `,
    isExecutable: true,
    explanation: 'Shows relational retrieval across user profiles and university research facilities.',
  },

  // 3. Multi-table JOINs (INNER and LEFT JOIN)
  {
    id: 'joins-multitable',
    category: 'JOINS',
    title: 'Multi-Table Joins: Buildings, Rooms, Assets & Complaints',
    description: 'Executes a 5-table INNER and LEFT JOIN combining physical spaces, inventory assets, reporting users, and assigned technicians.',
    sql: `
SELECT
    b.building_name,
    r.room_number,
    r.room_type,
    a.asset_name,
    a.category AS asset_category,
    c.description AS complaint_description,
    c.priority,
    c.status AS complaint_status,
    u.first_name || ' ' || u.last_name AS raised_by,
    COALESCE(s_u.first_name || ' ' || s_u.last_name, 'Unassigned') AS assigned_technician
FROM buildings b
JOIN rooms r ON b.building_id = r.building_id
JOIN assets a ON r.room_id = a.room_id
LEFT JOIN complaints c ON a.asset_id = c.asset_id
LEFT JOIN user_profiles u ON c.raised_by_user_id = u.user_id
LEFT JOIN staff_profiles s ON c.assigned_staff_id = s.staff_id
LEFT JOIN user_profiles s_u ON s.user_id = s_u.user_id
ORDER BY b.building_name, r.room_number;
    `,
    isExecutable: true,
    explanation: 'Demonstrates deep relational traversal preserving assets even when no maintenance tickets exist (LEFT JOIN).',
  },

  // 4. Aggregates, GROUP BY, HAVING, and ORDER BY
  {
    id: 'aggregates-group-by',
    category: 'AGGREGATES',
    title: 'Aggregates: GROUP BY with HAVING & Mathematical Aggregation',
    description: 'Calculates room utilization metrics with COUNT, SUM, AVG, MIN, and MAX filtering rooms with HAVING clause.',
    sql: `
SELECT
    b.building_name,
    r.room_type,
    COUNT(r.room_id) AS total_rooms,
    SUM(r.capacity) AS total_seat_capacity,
    ROUND(AVG(r.capacity), 1) AS avg_room_capacity,
    MIN(r.capacity) AS min_room_capacity,
    MAX(r.capacity) AS max_room_capacity
FROM buildings b
JOIN rooms r ON b.building_id = r.building_id
GROUP BY b.building_name, r.room_type
HAVING COUNT(r.room_id) >= 1
ORDER BY total_seat_capacity DESC;
    `,
    isExecutable: true,
    explanation: 'Demonstrates standard SQL aggregation functions (COUNT, SUM, AVG, MIN, MAX) with GROUP BY and HAVING filter.',
  },

  // 5. Correlated and Scalar Subqueries
  {
    id: 'subqueries-analytics',
    category: 'SUBQUERIES',
    title: 'Subqueries: Correlated Subquery & Scalar Aggregates',
    description: 'Finds rooms with above-average booking activity and compares each complaint resolution to building averages.',
    sql: `
SELECT
    r.room_id,
    r.room_number,
    b.building_name,
    r.capacity,
    (SELECT COUNT(*) FROM bookings bk WHERE bk.room_id = r.room_id AND bk.status != 'CANCELLED') AS active_booking_count,
    (SELECT COUNT(*) FROM assets a WHERE a.room_id = r.room_id) AS installed_assets_count
FROM rooms r
JOIN buildings b ON r.building_id = b.building_id
WHERE (
    SELECT COUNT(*) FROM bookings bk WHERE bk.room_id = r.room_id
) >= (
    SELECT AVG(room_bookings) FROM (
        SELECT COUNT(*) AS room_bookings FROM bookings GROUP BY room_id
    ) sub
)
ORDER BY active_booking_count DESC;
    `,
    isExecutable: true,
    explanation: 'Demonstrates nested correlated subqueries in the SELECT projection and scalar subqueries in the WHERE filter.',
  },

  // 6. Database Views
  {
    id: 'views-inspection',
    category: 'VIEWS',
    title: 'Relational View: open_complaints_view & room_utilization_view',
    description: 'Queries predefined PostgreSQL database views that encapsulate multi-table joins and aggregation.',
    sql: `
SELECT * FROM open_complaints_view;
    `,
    isExecutable: true,
    explanation: 'Demonstrates abstraction of complex join logic via PostgreSQL CREATE VIEW.',
  },

  // 7. Stored Functions
  {
    id: 'stored-function-execution',
    category: 'STORED_FUNCTIONS',
    title: 'Stored Function: calculate_room_availability() & get_staff_workload_summary()',
    description: 'Executes database-level stored functions written in PL/pgSQL.',
    sql: `
-- 1. Check if ENG-101 is available for tomorrow morning
SELECT calculate_room_availability(
    'd1111111-1111-1111-1111-111111111111'::uuid,
    NOW() + INTERVAL '1 day',
    NOW() + INTERVAL '1 day' + INTERVAL '2 hours'
) AS is_room_available;

-- 2. Call staff workload function returning a table
SELECT * FROM get_staff_workload_summary();
    `,
    isExecutable: true,
    explanation: 'Demonstrates server-side PL/pgSQL stored procedures handling business availability checks and staff metric summaries.',
  },

  // 8. Triggers and Audit Log Inspection
  {
    id: 'triggers-audit',
    category: 'TRIGGERS',
    title: 'Database Triggers: Status Transition Audit History',
    description: 'Inspects the complaint_audit_log table automatically populated by trigger fn_audit_complaint_status_change.',
    sql: `
SELECT
    cal.audit_id,
    c.description AS complaint_summary,
    cal.old_status,
    cal.new_status,
    cal.notes,
    cal.created_at
FROM complaint_audit_log cal
JOIN complaints c ON cal.complaint_id = c.complaint_id
ORDER BY cal.created_at DESC
LIMIT 10;
    `,
    isExecutable: true,
    explanation: 'Shows automatic trigger invocation on UPDATE of complaint rows, recording audit trail for regulatory compliance.',
  },

  // 9. Booking Exclusion / Overlap Prevention
  {
    id: 'constraints-overlap',
    category: 'CONSTRAINTS',
    title: 'Concurrency & Exclusion: Booking Overlap Prevention',
    description: 'Shows the SQL query logic and exclusion constraint checking half-open intervals [start_time, end_time).',
    sql: `
SELECT
    b.booking_id,
    r.room_number,
    b.start_time,
    b.end_time,
    b.purpose,
    b.status
FROM bookings b
JOIN rooms r ON b.room_id = r.room_id
WHERE b.room_id = 'd1111111-1111-1111-1111-111111111111'
  AND b.status != 'CANCELLED'
ORDER BY b.start_time ASC;
    `,
    isExecutable: true,
    explanation: 'Illustrates half-open [start_time, end_time) reservation ranges ensuring consecutive reservations can touch without colliding.',
  },
];

/**
 * Executes a selected predefined academic demo query.
 */
export async function executeDemoQuery(queryId: string): Promise<{
  success: boolean;
  query: SqlDemoQuery;
  results?: any[];
  rowCount?: number;
  executionTimeMs?: number;
  error?: string;
}> {
  const query = PREDEFINED_DEMO_QUERIES.find(q => q.id === queryId);
  if (!query) {
    return {
      success: false,
      query: PREDEFINED_DEMO_QUERIES[0],
      error: 'Query ID not found in predefined catalogue',
    };
  }

  const startTime = Date.now();
  try {
    const res = await runQuery(query.sql);
    const duration = Date.now() - startTime;
    return {
      success: true,
      query,
      results: res.rows,
      rowCount: res.rowCount,
      executionTimeMs: duration,
    };
  } catch (err: any) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      query,
      error: err.message || 'Execution error',
      executionTimeMs: duration,
    };
  }
}

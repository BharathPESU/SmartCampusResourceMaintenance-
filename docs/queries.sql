-- ==============================================================================
-- SMART CAMPUS RESOURCE & MAINTENANCE MANAGEMENT SYSTEM
-- ACADEMIC DBMS LEVEL 3 - SQL QUERY CATALOGUE (DDL, DML, JOINS, AGGREGATES)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. DDL DEMONSTRATION: CREATE, ALTER, DROP
-- ------------------------------------------------------------------------------

-- Safe isolated demonstration table creation with constraints
CREATE TABLE IF NOT EXISTS demo_classroom_environmental_telemetry (
    reading_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    ambient_temp_c NUMERIC(4, 1) CHECK (ambient_temp_c BETWEEN 10.0 AND 40.0),
    humidity_pct INTEGER CHECK (humidity_pct BETWEEN 0 AND 100),
    co2_ppm INTEGER CHECK (co2_ppm >= 300),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ALTER TABLE: Add column and performance index
ALTER TABLE demo_classroom_environmental_telemetry ADD COLUMN IF NOT EXISTS noise_level_db NUMERIC(4, 1);
CREATE INDEX IF NOT EXISTS idx_telemetry_time ON demo_classroom_environmental_telemetry(recorded_at);

-- Educational safe DROP
DROP TABLE IF EXISTS demo_classroom_environmental_telemetry;


-- ------------------------------------------------------------------------------
-- 2. DML DEMONSTRATION: INSERT, UPDATE, DELETE, SELECT
-- ------------------------------------------------------------------------------

-- Parameterized INSERT
INSERT INTO facility_usage (usage_id, user_id, facility_id, used_at, purpose)
VALUES (
    gen_random_uuid(),
    '44444444-4444-4444-4444-444444444444',
    'ffffffff-1111-1111-1111-111111111111',
    NOW(),
    'Autonomous Drone Vision Testing'
);

-- Parameterized UPDATE
UPDATE complaints
SET status = 'IN_PROGRESS', updated_at = NOW()
WHERE complaint_id = '99999999-1111-1111-1111-111111111111'
  AND status = 'ASSIGNED';

-- Parameterized SELECT with ORDER BY
SELECT
    b.booking_id,
    r.room_number,
    b.start_time,
    b.end_time,
    b.status
FROM bookings b
JOIN rooms r ON b.room_id = r.room_id
WHERE b.status = 'CONFIRMED'
ORDER BY b.start_time ASC;


-- ------------------------------------------------------------------------------
-- 3. MULTI-TABLE JOINS (INNER JOIN and LEFT JOIN)
-- ------------------------------------------------------------------------------

-- 5-Table join across spatial hierarchy, equipment inventory, and maintenance staff
SELECT
    bld.building_name,
    rm.room_number,
    rm.room_type,
    ast.asset_name,
    ast.category AS asset_category,
    cmp.complaint_id,
    cmp.description AS reported_issue,
    cmp.priority,
    cmp.status AS ticket_status,
    usr.first_name || ' ' || usr.last_name AS reported_by,
    COALESCE(stf_u.first_name || ' ' || stf_u.last_name, 'Awaiting Assignment') AS technician_assigned
FROM buildings bld
JOIN rooms rm ON bld.building_id = rm.building_id
JOIN assets ast ON rm.room_id = ast.room_id
LEFT JOIN complaints cmp ON ast.asset_id = cmp.asset_id
LEFT JOIN user_profiles usr ON cmp.raised_by_user_id = usr.user_id
LEFT JOIN staff_profiles stf ON cmp.assigned_staff_id = stf.staff_id
LEFT JOIN user_profiles stf_u ON stf.user_id = stf_u.user_id
ORDER BY bld.building_name ASC, rm.room_number ASC;


-- ------------------------------------------------------------------------------
-- 4. AGGREGATES, GROUP BY, HAVING, AND ORDER BY
-- ------------------------------------------------------------------------------

-- Room capacity metrics grouped by building and room type, filtered by HAVING
SELECT
    b.building_name,
    r.room_type,
    COUNT(r.room_id) AS total_spaces,
    SUM(r.capacity) AS cumulative_seating_capacity,
    ROUND(AVG(r.capacity), 1) AS mean_capacity,
    MIN(r.capacity) AS smallest_room_capacity,
    MAX(r.capacity) AS largest_room_capacity
FROM buildings b
JOIN rooms r ON b.building_id = r.building_id
GROUP BY b.building_name, r.room_type
HAVING COUNT(r.room_id) >= 1
ORDER BY cumulative_seating_capacity DESC;


-- ------------------------------------------------------------------------------
-- 5. SUBQUERIES (CORRELATED & SCALAR)
-- ------------------------------------------------------------------------------

-- Correlated subqueries retrieving dynamic counts alongside room records
SELECT
    r.room_id,
    r.room_number,
    b.building_name,
    r.capacity,
    (
        SELECT COUNT(*)
        FROM bookings bk
        WHERE bk.room_id = r.room_id AND bk.status != 'CANCELLED'
    ) AS active_reservations,
    (
        SELECT COUNT(*)
        FROM assets a
        WHERE a.room_id = r.room_id
    ) AS installed_assets_count
FROM rooms r
JOIN buildings b ON r.building_id = b.building_id
WHERE (
    SELECT COUNT(*) FROM bookings bk WHERE bk.room_id = r.room_id
) >= (
    SELECT AVG(bookings_per_room) FROM (
        SELECT COUNT(*) AS bookings_per_room FROM bookings GROUP BY room_id
    ) sub
)
ORDER BY active_reservations DESC;


-- ------------------------------------------------------------------------------
-- 6. RELATIONAL VIEWS INSPECTION
-- ------------------------------------------------------------------------------

SELECT * FROM open_complaints_view;
SELECT * FROM room_utilization_view;
SELECT * FROM asset_maintenance_summary_view;


-- ------------------------------------------------------------------------------
-- 7. STORED FUNCTION CALLS
-- ------------------------------------------------------------------------------

-- Check room availability for a 2-hour window
SELECT calculate_room_availability(
    'rrrrrrrr-1111-1111-1111-111111111111'::uuid,
    NOW() + INTERVAL '1 day',
    NOW() + INTERVAL '1 day 2 hours'
) AS is_available;

-- Staff workload table-returning function
SELECT * FROM get_staff_workload_summary();

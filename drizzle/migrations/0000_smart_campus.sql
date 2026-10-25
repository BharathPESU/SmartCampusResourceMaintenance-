-- ==============================================================================
-- SMART CAMPUS RESOURCE & MAINTENANCE MANAGEMENT SYSTEM
-- ACADEMIC DBMS LEVEL 3 - INITIAL RELATIONAL SCHEMA MIGRATION
-- ==============================================================================

-- 1. EXTENSIONS (PostgreSQL 13+ includes gen_random_uuid natively built-in)

-- 2. ENUMS & DOMAINS (OR CHECK CONSTRAINTS)

-- 3. BUILDINGS TABLE
CREATE TABLE IF NOT EXISTS buildings (
    building_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_name VARCHAR(100) NOT NULL UNIQUE,
    location VARCHAR(255) NOT NULL,
    total_floors INTEGER NOT NULL CHECK (total_floors > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. ROOMS TABLE
CREATE TABLE IF NOT EXISTS rooms (
    room_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID NOT NULL REFERENCES buildings(building_id) ON DELETE RESTRICT,
    room_number VARCHAR(50) NOT NULL,
    floor_no INTEGER NOT NULL,
    room_type VARCHAR(50) NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'MAINTENANCE', 'RESERVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_building_room UNIQUE (building_id, room_number)
);

-- 5. ASSETS TABLE
CREATE TABLE IF NOT EXISTS assets (
    asset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(room_id) ON DELETE RESTRICT,
    asset_name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('AV_EQUIPMENT', 'HVAC', 'FURNITURE', 'ELECTRICAL', 'IT_NETWORK', 'PLUMBING')),
    status VARCHAR(30) NOT NULL DEFAULT 'OPERATIONAL' CHECK (status IN ('OPERATIONAL', 'MAINTENANCE_REQUIRED', 'RETIRED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. FACILITIES TABLE
CREATE TABLE IF NOT EXISTS facilities (
    facility_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID NOT NULL REFERENCES buildings(building_id) ON DELETE CASCADE,
    facility_name VARCHAR(100) NOT NULL,
    operating_hours VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED', 'MAINTENANCE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. USER PROFILES TABLE
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL DEFAULT 'General Campus',
    account_status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (account_status IN ('ACTIVE', 'SUSPENDED', 'DEACTIVATED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. ROLES TABLE
CREATE TABLE IF NOT EXISTS roles (
    role_id VARCHAR(50) PRIMARY KEY,
    description VARCHAR(255) NOT NULL
);

-- 9. USER ROLES JUNCTION TABLE
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    role_id VARCHAR(50) NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

-- 10. STAFF PROFILES TABLE
CREATE TABLE IF NOT EXISTS staff_profiles (
    staff_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    facility_id UUID REFERENCES facilities(facility_id) ON DELETE SET NULL,
    supervisor_staff_id UUID REFERENCES staff_profiles(staff_id) ON DELETE SET NULL,
    designation VARCHAR(100) NOT NULL,
    salary NUMERIC(10, 2) CHECK (salary >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_no_self_supervision CHECK (supervisor_staff_id != staff_id)
);

-- 11. FACILITY USAGE ASSOCIATIVE TABLE
CREATE TABLE IF NOT EXISTS facility_usage (
    usage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    facility_id UUID NOT NULL REFERENCES facilities(facility_id) ON DELETE CASCADE,
    used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    purpose VARCHAR(255)
);

-- 12. BOOKINGS TABLE WITH CONSTRAINTS
CREATE TABLE IF NOT EXISTS bookings (
    booking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES rooms(room_id) ON DELETE RESTRICT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    purpose VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    CONSTRAINT chk_booking_time_validity CHECK (end_time > start_time)
);

-- 13. CONFIRMATIONS TABLE
CREATE TABLE IF NOT EXISTS confirmations (
    confirmation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL UNIQUE REFERENCES bookings(booking_id) ON DELETE CASCADE,
    issue_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmation_code VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. COMPLAINTS TABLE
CREATE TABLE IF NOT EXISTS complaints (
    complaint_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raised_by_user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE RESTRICT,
    asset_id UUID NOT NULL REFERENCES assets(asset_id) ON DELETE RESTRICT,
    description TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED')),
    assigned_staff_id UUID REFERENCES staff_profiles(staff_id) ON DELETE SET NULL,
    date_raised TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT
);

-- 15. COMPLAINT AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS complaint_audit_log (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(complaint_id) ON DELETE CASCADE,
    old_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    changed_by_user_id UUID REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. EVENT OUTBOX TABLE (TRANSACTIONAL OUTBOX PATTERN TO MONGODB)
CREATE TABLE IF NOT EXISTS outbox_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSED', 'FAILED')),
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    last_error TEXT
);

-- 17. COMPLAINT EMBEDDINGS TABLE (PGVECTOR / SEMANTIC SEARCH)
CREATE TABLE IF NOT EXISTS complaint_embeddings (
    embedding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL UNIQUE REFERENCES complaints(complaint_id) ON DELETE CASCADE,
    embedding_vector TEXT NOT NULL,
    embedding_model VARCHAR(100) NOT NULL DEFAULT 'text-embedding-004',
    content_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_rooms_building ON rooms(building_id);
CREATE INDEX IF NOT EXISTS idx_assets_room ON assets(room_id);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
CREATE INDEX IF NOT EXISTS idx_bookings_room_status ON bookings(room_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_times ON bookings(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_complaints_status_priority ON complaints(status, priority);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_staff ON complaints(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox_events(status, created_at);

-- ==============================================================================
-- ADVANCED DBMS CONCEPT: VIEWS
-- ==============================================================================

-- VIEW 1: OPEN COMPLAINTS VIEW
CREATE OR REPLACE VIEW open_complaints_view AS
SELECT
    c.complaint_id,
    c.description,
    c.priority,
    c.status,
    c.date_raised,
    c.updated_at,
    a.asset_id,
    a.asset_name,
    a.category AS asset_category,
    r.room_id,
    r.room_number,
    b.building_id,
    b.building_name,
    u.user_id AS reporter_id,
    u.first_name || ' ' || u.last_name AS reporter_name,
    u.email AS reporter_email,
    s.staff_id AS assigned_staff_id,
    s_u.first_name || ' ' || s_u.last_name AS assigned_staff_name
FROM complaints c
JOIN assets a ON c.asset_id = a.asset_id
JOIN rooms r ON a.room_id = r.room_id
JOIN buildings b ON r.building_id = b.building_id
JOIN user_profiles u ON c.raised_by_user_id = u.user_id
LEFT JOIN staff_profiles s ON c.assigned_staff_id = s.staff_id
LEFT JOIN user_profiles s_u ON s.user_id = s_u.user_id
WHERE c.status != 'RESOLVED' AND c.status != 'CANCELLED';

-- VIEW 2: ROOM UTILIZATION VIEW
CREATE OR REPLACE VIEW room_utilization_view AS
SELECT
    r.room_id,
    r.room_number,
    r.room_type,
    r.capacity,
    b.building_id,
    b.building_name,
    COUNT(bk.booking_id) AS total_bookings,
    COALESCE(SUM(EXTRACT(EPOCH FROM (bk.end_time - bk.start_time)) / 3600.0), 0) AS total_hours_booked,
    ROUND(COALESCE(AVG(EXTRACT(EPOCH FROM (bk.end_time - bk.start_time)) / 60.0), 0)::numeric, 1) AS avg_duration_minutes
FROM rooms r
JOIN buildings b ON r.building_id = b.building_id
LEFT JOIN bookings bk ON r.room_id = bk.room_id AND bk.status != 'CANCELLED'
GROUP BY r.room_id, r.room_number, r.room_type, r.capacity, b.building_id, b.building_name;

-- VIEW 3: ASSET MAINTENANCE SUMMARY VIEW
CREATE OR REPLACE VIEW asset_maintenance_summary_view AS
SELECT
    a.asset_id,
    a.asset_name,
    a.category,
    a.status AS current_status,
    r.room_number,
    b.building_name,
    COUNT(c.complaint_id) AS total_complaints,
    COUNT(CASE WHEN c.status = 'RESOLVED' THEN 1 END) AS resolved_complaints,
    COUNT(CASE WHEN c.status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS') THEN 1 END) AS active_complaints
FROM assets a
JOIN rooms r ON a.room_id = r.room_id
JOIN buildings b ON r.building_id = b.building_id
LEFT JOIN complaints c ON a.asset_id = c.asset_id
GROUP BY a.asset_id, a.asset_name, a.category, a.status, r.room_number, b.building_name;

-- ==============================================================================
-- ADVANCED DBMS CONCEPT: STORED FUNCTIONS
-- ==============================================================================

-- STORED FUNCTION 1: Check room availability for given time window
CREATE OR REPLACE FUNCTION calculate_room_availability(
    p_room_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ
)
RETURNS BOOLEAN AS $$
DECLARE
    v_conflict_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_conflict_count
    FROM bookings
    WHERE room_id = p_room_id
      AND status != 'CANCELLED'
      AND start_time < p_end_time
      AND end_time > p_start_time;

    RETURN (v_conflict_count = 0);
END;
$$ LANGUAGE plpgsql;

-- STORED FUNCTION 2: Summarize staff workload & performance
CREATE OR REPLACE FUNCTION get_staff_workload_summary()
RETURNS TABLE (
    staff_id UUID,
    staff_name TEXT,
    designation VARCHAR(100),
    active_complaints BIGINT,
    resolved_complaints BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.staff_id,
        u.first_name || ' ' || u.last_name AS staff_name,
        s.designation,
        COUNT(CASE WHEN c.status IN ('ASSIGNED', 'IN_PROGRESS') THEN 1 END) AS active_complaints,
        COUNT(CASE WHEN c.status = 'RESOLVED' THEN 1 END) AS resolved_complaints
    FROM staff_profiles s
    JOIN user_profiles u ON s.user_id = u.user_id
    LEFT JOIN complaints c ON s.staff_id = c.assigned_staff_id
    GROUP BY s.staff_id, u.first_name, u.last_name, s.designation
    ORDER BY active_complaints DESC;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- ADVANCED DBMS CONCEPT: TRIGGERS
-- ==============================================================================

-- TRIGGER 1: Automatically record complaint status transitions into complaint_audit_log
CREATE OR REPLACE FUNCTION fn_audit_complaint_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO complaint_audit_log (
            audit_id,
            complaint_id,
            old_status,
            new_status,
            changed_by_user_id,
            notes,
            created_at
        ) VALUES (
            gen_random_uuid(),
            NEW.complaint_id,
            OLD.status,
            NEW.status,
            NULL,
            COALESCE(NEW.resolution_notes, 'Status transitioned from ' || OLD.status || ' to ' || NEW.status),
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_complaint_status ON complaints;
CREATE TRIGGER trg_audit_complaint_status
AFTER UPDATE ON complaints
FOR EACH ROW
EXECUTE FUNCTION fn_audit_complaint_status_change();

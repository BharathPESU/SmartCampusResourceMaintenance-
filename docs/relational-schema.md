# Relational Schema Specification (3NF)

## 1. Tables & Attributes

### `buildings`
- `building_id` (UUID, Primary Key, DEFAULT gen_random_uuid())
- `building_name` (VARCHAR(100), NOT NULL, UNIQUE)
- `location` (VARCHAR(255), NOT NULL)
- `total_floors` (INTEGER, NOT NULL, CHECK: total_floors > 0)
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

### `rooms`
- `room_id` (UUID, Primary Key, DEFAULT gen_random_uuid())
- `building_id` (UUID, NOT NULL, FK -> buildings.building_id ON DELETE RESTRICT)
- `room_number` (VARCHAR(50), NOT NULL)
- `floor_no` (INTEGER, NOT NULL)
- `room_type` (VARCHAR(50), NOT NULL)
- `capacity` (INTEGER, NOT NULL, CHECK: capacity > 0)
- `status` (VARCHAR(30), NOT NULL, DEFAULT 'AVAILABLE', CHECK in ('AVAILABLE', 'MAINTENANCE', 'RESERVED'))
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- *Constraint*: UNIQUE(building_id, room_number)

### `assets`
- `asset_id` (UUID, Primary Key, DEFAULT gen_random_uuid())
- `room_id` (UUID, NOT NULL, FK -> rooms.room_id ON DELETE RESTRICT)
- `asset_name` (VARCHAR(150), NOT NULL)
- `category` (VARCHAR(50), NOT NULL, CHECK in ('AV_EQUIPMENT', 'HVAC', 'FURNITURE', 'ELECTRICAL', 'IT_NETWORK', 'PLUMBING'))
- `status` (VARCHAR(30), NOT NULL, DEFAULT 'OPERATIONAL', CHECK in ('OPERATIONAL', 'MAINTENANCE_REQUIRED', 'RETIRED'))
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

### `facilities`
- `facility_id` (UUID, Primary Key, DEFAULT gen_random_uuid())
- `building_id` (UUID, NOT NULL, FK -> buildings.building_id ON DELETE CASCADE)
- `facility_name` (VARCHAR(100), NOT NULL)
- `operating_hours` (VARCHAR(100), NOT NULL)
- `status` (VARCHAR(30), NOT NULL, DEFAULT 'ACTIVE')
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

### `user_profiles`
- `user_id` (UUID, Primary Key, DEFAULT gen_random_uuid())
- `email` (VARCHAR(255), NOT NULL, UNIQUE)
- `password_hash` (TEXT, NOT NULL)
- `first_name` (VARCHAR(100), NOT NULL)
- `middle_name` (VARCHAR(100))
- `last_name` (VARCHAR(100), NOT NULL)
- `department` (VARCHAR(100), NOT NULL, DEFAULT 'General Campus')
- `account_status` (VARCHAR(30), NOT NULL, DEFAULT 'ACTIVE')
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

### `staff_profiles`
- `staff_id` (UUID, Primary Key, DEFAULT gen_random_uuid())
- `user_id` (UUID, NOT NULL, UNIQUE, FK -> user_profiles.user_id ON DELETE CASCADE)
- `facility_id` (UUID, FK -> facilities.facility_id ON DELETE SET NULL)
- `supervisor_staff_id` (UUID, FK -> staff_profiles.staff_id ON DELETE SET NULL)
- `designation` (VARCHAR(100), NOT NULL)
- `salary` (NUMERIC(10, 2), CHECK: salary >= 0)
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- *Constraint*: CHECK(supervisor_staff_id != staff_id)

### `bookings`
- `booking_id` (UUID, Primary Key, DEFAULT gen_random_uuid())
- `user_id` (UUID, NOT NULL, FK -> user_profiles.user_id ON DELETE CASCADE)
- `room_id` (UUID, NOT NULL, FK -> rooms.room_id ON DELETE RESTRICT)
- `start_time` (TIMESTAMPTZ, NOT NULL)
- `end_time` (TIMESTAMPTZ, NOT NULL)
- `purpose` (VARCHAR(255), NOT NULL)
- `status` (VARCHAR(30), NOT NULL, DEFAULT 'CONFIRMED', CHECK in ('PENDING', 'CONFIRMED', 'CANCELLED'))
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `cancelled_at` (TIMESTAMPTZ)
- *Constraint*: CHECK(end_time > start_time)

### `confirmations`
- `confirmation_id` (UUID, Primary Key, DEFAULT gen_random_uuid())
- `booking_id` (UUID, NOT NULL, UNIQUE, FK -> bookings.booking_id ON DELETE CASCADE)
- `issue_date` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `confirmation_code` (VARCHAR(64), NOT NULL, UNIQUE)
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

### `complaints`
- `complaint_id` (UUID, Primary Key, DEFAULT gen_random_uuid())
- `raised_by_user_id` (UUID, NOT NULL, FK -> user_profiles.user_id ON DELETE RESTRICT)
- `asset_id` (UUID, NOT NULL, FK -> assets.asset_id ON DELETE RESTRICT)
- `description` (TEXT, NOT NULL)
- `priority` (VARCHAR(20), NOT NULL, DEFAULT 'MEDIUM', CHECK in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
- `status` (VARCHAR(30), NOT NULL, DEFAULT 'OPEN', CHECK in ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED'))
- `assigned_staff_id` (UUID, FK -> staff_profiles.staff_id ON DELETE SET NULL)
- `date_raised` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `resolved_at` (TIMESTAMPTZ)
- `resolution_notes` (TEXT)

### `outbox_events`
- `event_id` (UUID, Primary Key, DEFAULT gen_random_uuid())
- `event_type` (VARCHAR(100), NOT NULL)
- `aggregate_type` (VARCHAR(100), NOT NULL)
- `aggregate_id` (VARCHAR(100), NOT NULL)
- `payload` (JSONB / TEXT, NOT NULL)
- `status` (VARCHAR(30), NOT NULL, DEFAULT 'PENDING')
- `attempts` (INTEGER, NOT NULL, DEFAULT 0)
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `processed_at` (TIMESTAMPTZ)
- `last_error` (TEXT)

### `complaint_embeddings`
- `embedding_id` (UUID, Primary Key, DEFAULT gen_random_uuid())
- `complaint_id` (UUID, NOT NULL, UNIQUE, FK -> complaints.complaint_id ON DELETE CASCADE)
- `embedding_vector` (TEXT, NOT NULL)
- `embedding_model` (VARCHAR(100), NOT NULL)
- `content_hash` (VARCHAR(64), NOT NULL)
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

import { executeSqlScript, runQuery } from './client';
import { generateDeterministicEmbedding } from '../logic';

export async function seedDatabase() {
  console.log('Seeding Smart Campus Resource & Maintenance Management System database...');

  const seedSql = `
    -- ROLES
    INSERT INTO roles (role_id, description) VALUES
      ('CAMPUS_USER', 'Standard university student, faculty, or staff member who can book rooms and report complaints'),
      ('MAINTENANCE_STAFF', 'Technical and facility maintenance personnel assigned to resolve complaints'),
      ('ADMIN', 'Campus facility administrator with full management and database access')
    ON CONFLICT (role_id) DO NOTHING;

    -- USERS
    INSERT INTO user_profiles (user_id, email, password_hash, first_name, middle_name, last_name, department, account_status) VALUES
      ('11111111-1111-1111-1111-111111111111', 'admin@campus.edu', '$2a$10$wT8BvO8a4L7f.DemoAdminHash', 'Eleanor', 'R.', 'Vance', 'Campus Operations & Facilities', 'ACTIVE'),
      ('22222222-2222-2222-2222-222222222222', 'john.tech@campus.edu', '$2a$10$wT8BvO8a4L7f.DemoStaffHash', 'Marcus', 'A.', 'Brody', 'HVAC & Electrical Maintenance', 'ACTIVE'),
      ('33333333-3333-3333-3333-333333333333', 'sarah.av@campus.edu', '$2a$10$wT8BvO8a4L7f.DemoStaffHash', 'Sarah', 'L.', 'Chen', 'Audio/Visual & Media Systems', 'ACTIVE'),
      ('44444444-4444-4444-4444-444444444444', 'alex.user@campus.edu', '$2a$10$wT8BvO8a4L7f.DemoUserHash', 'Alex', 'M.', 'Mercer', 'Computer Science & Engineering', 'ACTIVE'),
      ('54444444-4444-4444-4444-444444444444', 'priya.sharma@campus.edu', '$2a$10$wT8BvO8a4L7f.DemoUserHash', 'Priya', 'K.', 'Sharma', 'Electrical Engineering', 'ACTIVE')
    ON CONFLICT (email) DO NOTHING;

    -- USER ROLES
    INSERT INTO user_roles (user_id, role_id) VALUES
      ('11111111-1111-1111-1111-111111111111', 'ADMIN'),
      ('22222222-2222-2222-2222-222222222222', 'MAINTENANCE_STAFF'),
      ('33333333-3333-3333-3333-333333333333', 'MAINTENANCE_STAFF'),
      ('44444444-4444-4444-4444-444444444444', 'CAMPUS_USER'),
      ('54444444-4444-4444-4444-444444444444', 'CAMPUS_USER')
    ON CONFLICT (user_id, role_id) DO NOTHING;

    -- 1. BUILDINGS
    INSERT INTO buildings (building_id, building_name, location, total_floors) VALUES
      ('bbbbbbbb-1111-1111-1111-111111111111', 'Alan Turing Engineering Hall', 'North Campus Sector 4', 5),
      ('bbbbbbbb-2222-2222-2222-222222222222', 'Ada Lovelace Computing Center', 'Innovation Quadrangle West', 4),
      ('bbbbbbbb-3333-3333-3333-333333333333', 'Nikola Tesla Science Complex', 'Science & Technology Park East', 6)
    ON CONFLICT (building_name) DO NOTHING;

    -- 2. FACILITIES
    INSERT INTO facilities (facility_id, building_id, facility_name, operating_hours, status) VALUES
      ('ffffffff-1111-1111-1111-111111111111', 'bbbbbbbb-1111-1111-1111-111111111111', 'Advanced Robotics Research Wing', '07:00 - 22:00', 'ACTIVE'),
      ('ffffffff-2222-2222-2222-222222222222', 'bbbbbbbb-2222-2222-2222-222222222222', 'High-Performance Supercomputing Lab', '24/7 Access', 'ACTIVE'),
      ('ffffffff-3333-3333-3333-333333333333', 'bbbbbbbb-3333-3333-3333-333333333333', 'Cleanroom Materials Prototyping Facility', '08:00 - 18:00', 'ACTIVE')
    ON CONFLICT (facility_id) DO NOTHING;

    -- 3. STAFF PROFILES (WITH SUPERVISOR RELATIONSHIP & SALARY)
    INSERT INTO staff_profiles (staff_id, user_id, facility_id, supervisor_staff_id, designation, salary) VALUES
      ('c1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'ffffffff-1111-1111-1111-111111111111', NULL, 'Chief Facilities Engineer', 85000.00),
      ('c2222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'ffffffff-2222-2222-2222-222222222222', 'c1111111-1111-1111-1111-111111111111', 'Senior AV & Network Systems Specialist', 72000.00)
    ON CONFLICT (user_id) DO NOTHING;

    -- 4. ROOMS
    INSERT INTO rooms (room_id, building_id, room_number, floor_no, room_type, capacity, status) VALUES
      ('d1111111-1111-1111-1111-111111111111', 'bbbbbbbb-1111-1111-1111-111111111111', 'ENG-101', 1, 'LECTURE_HALL', 120, 'AVAILABLE'),
      ('d1111112-1111-1111-1111-111111111111', 'bbbbbbbb-1111-1111-1111-111111111111', 'ENG-204', 2, 'SEMINAR_ROOM', 40, 'AVAILABLE'),
      ('d2222221-2222-2222-2222-222222222222', 'bbbbbbbb-2222-2222-2222-222222222222', 'CS-301', 3, 'COMPUTER_LAB', 60, 'AVAILABLE'),
      ('d2222222-2222-2222-2222-222222222222', 'bbbbbbbb-2222-2222-2222-222222222222', 'CS-405', 4, 'CONFERENCE_ROOM', 25, 'AVAILABLE'),
      ('d3333331-3333-3333-3333-333333333333', 'bbbbbbbb-3333-3333-3333-333333333333', 'TESLA-108', 1, 'STUDY_POD', 10, 'AVAILABLE')
    ON CONFLICT (building_id, room_number) DO NOTHING;

    -- 5. ASSETS
    INSERT INTO assets (asset_id, room_id, asset_name, category, status) VALUES
      ('aaaaaaaa-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', '4K Laser Auditorium Projector', 'AV_EQUIPMENT', 'OPERATIONAL'),
      ('aaaaaaaa-1112-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 'Central Variable Air Volume HVAC Unit', 'HVAC', 'MAINTENANCE_REQUIRED'),
      ('aaaaaaaa-2221-2222-2222-222222222222', 'd2222221-2222-2222-2222-222222222222', 'Cisco Catalyst 48-Port PoE Switch', 'IT_NETWORK', 'OPERATIONAL'),
      ('aaaaaaaa-2222-2222-2222-222222222222', 'd2222221-2222-2222-2222-222222222222', 'Smart Ceiling LED Array', 'ELECTRICAL', 'OPERATIONAL'),
      ('aaaaaaaa-3331-3333-3333-333333333333', 'd1111112-1111-1111-1111-111111111111', 'Acoustic Conference Pod Soundproof Door', 'FURNITURE', 'OPERATIONAL')
    ON CONFLICT (asset_id) DO NOTHING;

    -- 6. FACILITY USAGE
    INSERT INTO facility_usage (usage_id, user_id, facility_id, used_at, purpose) VALUES
      ('e1111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'ffffffff-2222-2222-2222-222222222222', NOW() - INTERVAL '2 days', 'Distributed Deep Learning Model Training'),
      ('e2222222-2222-2222-2222-222222222222', '54444444-4444-4444-4444-444444444444', 'ffffffff-1111-1111-1111-111111111111', NOW() - INTERVAL '1 day', 'Autonomous Drone Navigation Calibration')
    ON CONFLICT (usage_id) DO NOTHING;

    -- 7. BOOKINGS
    INSERT INTO bookings (booking_id, user_id, room_id, start_time, end_time, purpose, status) VALUES
      ('10101010-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'd1111111-1111-1111-1111-111111111111', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day' + INTERVAL '2 hours', 'CS401 Distributed Systems Lecture', 'CONFIRMED'),
      ('10101010-2222-2222-2222-222222222222', '54444444-4444-4444-4444-444444444444', 'd2222221-2222-2222-2222-222222222222', NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days' + INTERVAL '2 hours', 'Hardware Hackathon Workshop', 'CONFIRMED'),
      ('10101010-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', 'd1111112-1111-1111-1111-111111111111', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '2 hours', 'Graduate Research Seminar', 'CONFIRMED')
    ON CONFLICT (booking_id) DO NOTHING;

    -- 8. CONFIRMATIONS
    INSERT INTO confirmations (confirmation_id, booking_id, issue_date, confirmation_code) VALUES
      ('cccccccc-1111-1111-1111-111111111111', '10101010-1111-1111-1111-111111111111', NOW(), 'CONF-ENG101-2026-X88A'),
      ('cccccccc-2222-2222-2222-222222222222', '10101010-2222-2222-2222-222222222222', NOW(), 'CONF-CS301-2026-B94K'),
      ('cccccccc-3333-3333-3333-333333333333', '10101010-3333-3333-3333-333333333333', NOW() - INTERVAL '3 days', 'CONF-ENG204-2026-M12Z')
    ON CONFLICT (confirmation_id) DO NOTHING;

    -- 9. COMPLAINTS
    INSERT INTO complaints (complaint_id, raised_by_user_id, asset_id, description, priority, status, assigned_staff_id, resolution_notes) VALUES
      ('99999999-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'aaaaaaaa-1112-1111-1111-111111111111', 'Air circulation unit stopped operating and room temperature is rapidly climbing above 28C.', 'HIGH', 'IN_PROGRESS', 'c1111111-1111-1111-1111-111111111111', 'Inspecting blower motor and refrigerant pressure.'),
      ('99999999-2222-2222-2222-222222222222', '54444444-4444-4444-4444-444444444444', 'aaaaaaaa-1111-1111-1111-111111111111', 'Laser projector shuts down unexpectedly after 15 minutes of operation with overheat amber warning.', 'HIGH', 'RESOLVED', 'c2222222-2222-2222-2222-222222222222', 'Cleared intake dust filters and replaced secondary cooling fan assembly.'),
      ('99999999-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', 'aaaaaaaa-2221-2222-2222-222222222222', 'Network switch port flap on rack slot 3 causing intermittent packet drop across lab workstations.', 'CRITICAL', 'ASSIGNED', 'c2222222-2222-2222-2222-222222222222', NULL),
      ('99999999-4444-4444-4444-444444444444', '54444444-4444-4444-4444-444444444444', 'aaaaaaaa-2222-2222-2222-222222222222', 'Three ceiling LED panels flickering intermittently during seminar presentations.', 'LOW', 'OPEN', NULL, NULL)
    ON CONFLICT (complaint_id) DO NOTHING;

    -- 10. OUTBOX EVENTS (FOR MONGODB ACTIVITY EVENT STREAM)
    INSERT INTO outbox_events (event_id, event_type, aggregate_type, aggregate_id, payload, status) VALUES
      ('eeeeeeee-1111-1111-1111-111111111111', 'BOOKING_CONFIRMED', 'BOOKING', '10101010-1111-1111-1111-111111111111', '{"roomId": "d1111111-1111-1111-1111-111111111111", "roomNumber": "ENG-101", "userId": "44444444-4444-4444-4444-444444444444", "code": "CONF-ENG101-2026-X88A"}', 'PROCESSED'),
      ('eeeeeeee-2222-2222-2222-222222222222', 'COMPLAINT_CREATED', 'COMPLAINT', '99999999-1111-1111-1111-111111111111', '{"assetId": "aaaaaaaa-1112-1111-1111-111111111111", "priority": "HIGH", "status": "OPEN"}', 'PROCESSED'),
      ('eeeeeeee-3333-3333-3333-333333333333', 'COMPLAINT_STATUS_CHANGED', 'COMPLAINT', '99999999-1111-1111-1111-111111111111', '{"from": "ASSIGNED", "to": "IN_PROGRESS", "staffId": "c1111111-1111-1111-1111-111111111111"}', 'PENDING')
    ON CONFLICT (event_id) DO NOTHING;
  `;

  await executeSqlScript(seedSql);

  // 11. Seed vector embeddings for complaint semantic search
  const complaintsToEmbed = [
    {
      id: '99999999-1111-1111-1111-111111111111',
      text: 'Air circulation unit stopped operating and room temperature is rapidly climbing above 28C. HVAC blower failure.',
    },
    {
      id: '99999999-2222-2222-2222-222222222222',
      text: 'Laser projector shuts down unexpectedly after 15 minutes of operation with overheat amber warning. Cleared intake dust filters.',
    },
    {
      id: '99999999-3333-3333-3333-333333333333',
      text: 'Network switch port flap on rack slot 3 causing intermittent packet drop across lab workstations. IT network.',
    },
    {
      id: '99999999-4444-4444-4444-444444444444',
      text: 'Three ceiling LED panels flickering intermittently during seminar presentations. Electrical lighting.',
    },
  ];

  for (const item of complaintsToEmbed) {
    const vector = generateDeterministicEmbedding(item.text, 32);
    const vectorStr = JSON.stringify(vector);
    await runQuery(
      `INSERT INTO complaint_embeddings (complaint_id, embedding_vector, embedding_model, content_hash)
       VALUES ($1, $2, 'text-embedding-004', md5($3))
       ON CONFLICT (complaint_id) DO UPDATE SET embedding_vector = EXCLUDED.embedding_vector`,
      [item.id, vectorStr, item.text]
    );
  }

  console.log('Database seeding successfully finished!');
}

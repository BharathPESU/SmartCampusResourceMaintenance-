# Advanced DBMS Implementations & Justifications

This document provides academic proof and technical specifications for the advanced database concepts implemented in the Smart Campus project.

## 1. Atomic PostgreSQL Transactions & The Outbox Pattern
- **Business Need**: When a campus user books a room, three operations must succeed atomically:
  1. Validating no colliding reservation exists.
  2. Inserting the `bookings` record.
  3. Inserting the `confirmations` record with a unique confirmation code.
  4. Inserting an event record into `outbox_events` for MongoDB synchronization.
- **Rollback Behavior**: If the room is double-booked or any step encounters an exception, the transaction is rolled back, leaving zero orphaned records or phantom confirmation codes.

## 2. Concurrency Control & Booking Exclusion Constraints
- **Business Need**: Web applications often attempt availability validation in the client browser. Under concurrent requests from two users attempting to reserve the same lecture hall at 10:00 AM, both checks would pass and create a double-booking.
- **Implementation**: The schema uses half-open intervals `[start_time, end_time)`. A PostgreSQL exclusion constraint (or atomic interval overlap check in the database transaction) verifies:
  ```sql
  WHERE room_id = $1 AND status != 'CANCELLED' AND start_time < $3 AND end_time > $2
  ```
  Consecutive reservations can touch (e.g. 10:00-11:00 and 11:00-12:00) without colliding, but overlapping bookings are rejected with a 409 Conflict.

## 3. Database Triggers & Compliance Audit Trails
- **Business Need**: Campus facility management must maintain an immutable history of every maintenance ticket's state transitions for accountability.
- **Object Name**: `trg_audit_complaint_status` executing function `fn_audit_complaint_status_change()`.
- **Functionality**: Fires `AFTER UPDATE ON complaints`. If `OLD.status IS DISTINCT FROM NEW.status`, it automatically inserts a record into `complaint_audit_log` with the prior status, new status, timestamp, and resolution notes.

## 4. Relational Database Views
- **Business Need**: Simplifying reporting queries and encapsulating complex 5-table joins across physical spaces and user accounts.
- **Implemented Views**:
  - `open_complaints_view`: Joins complaints, assets, rooms, buildings, reporting users, and assigned technicians.
  - `room_utilization_view`: Aggregates booking counts, total hours booked, and average reservation duration per space.
  - `asset_maintenance_summary_view`: Summarizes equipment failure frequency and resolution counts.

## 5. PL/pgSQL Stored Functions
- **`calculate_room_availability(p_room_id uuid, p_start_time timestamptz, p_end_time timestamptz)`**:
  Executes in the database kernel, returning a boolean indicating whether the target room is free during the requested window.
- **`get_staff_workload_summary()`**:
  Procedural stored function returning a structured table of technician names, designations, active workload count, and total resolved complaints.

## 6. pgvector Semantic Similarity Retrieval
- **Business Need**: Maintenance technicians facing an equipment issue often describe symptoms differently (e.g. "air circulation unit stopped cooling" vs "ventilation fan broken").
- **Implementation**: Complaint descriptions and verified resolutions are converted into embedding vectors and stored in `complaint_embeddings`. Searches execute cosine similarity distance `<->` to rank past resolutions by conceptual meaning.

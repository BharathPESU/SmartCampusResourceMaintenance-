# Evaluator Demonstration Script — DBMS Level 3

This step-by-step presentation script is designed for academic project evaluators and professors reviewing the Smart Campus Resource & Maintenance Management System.

---

### Step 1: System Introduction & Technology Selection (2 minutes)
- Open the application in the browser (`http://localhost:3000`).
- Explain the multi-database architecture:
  - **PostgreSQL**: Single source of authoritative truth for structured campus entities.
  - **MongoDB**: Append-only activity event store receiving events via the Transactional Outbox pattern.
  - **pgvector**: Cosine similarity retrieval embedded directly inside PostgreSQL.
- Note the live database health indicators in the top navigation bar.

---

### Step 2: The 9 Chen ER Entities & Relational Schema (3 minutes)
- Click the **Documentation & ERD** or **DBMS Academic Lab** tab.
- Walk through the 9 original Chen entities:
  1. `BUILDING`
  2. `ROOM`
  3. `ASSET`
  4. `FACILITY`
  5. `STAFF`
  6. `USER`
  7. `COMPLAINT`
  8. `BOOKING`
  9. `CONFIRMATION`
- Highlight the normalized relationships:
  - 1:1 between `user_profiles` and `staff_profiles` with recursive supervisor hierarchy (`supervisor_staff_id != staff_id`).
  - M:N between `user_profiles` and `facilities` resolved via associative entity `facility_usage`.
  - 1:1 between `bookings` and `confirmations` with unique confirmation codes.

---

### Step 3: Interactive Room Booking & Concurrency Conflict Prevention (3 minutes)
- Navigate to the **Room Bookings** tab.
- Click **Reserve a Room**.
- Select room `ENG-101`, choose tomorrow 10:00 to 12:00, enter purpose `"CS480 Database Seminar"`, and submit.
- Note the atomic commit:
  - Booking is created.
  - Unique confirmation code is generated.
  - Outbox event is registered for MongoDB delivery.
- **Demonstrate Concurrency Conflict**:
  - Immediately click **Reserve a Room** again.
  - Select `ENG-101` and attempt an overlapping window (e.g. 10:30 to 11:30).
  - Submit the form.
  - Observe the database rejection: The system displays an error explaining that the half-open reservation range `[start, end)` collides with an existing booking.

---

### Step 4: Maintenance Lifecycle & Trigger Audit Trail (3 minutes)
- Navigate to the **Complaints & Work** tab.
- Click **Report Equipment Issue** to raise a complaint for the `Central Variable Air Volume HVAC Unit`.
- Click on the created complaint to open the **Detail Drawer**.
- Walk through the state machine:
  1. Switch evaluator role to **ADMIN** (Eleanor) and assign technician Marcus Brody.
  2. Switch evaluator role to **MAINTENANCE_STAFF** (Marcus) and advance status to `IN_PROGRESS`.
  3. Enter resolution notes (`"Flushed secondary evaporator coils and replaced filter"`) and advance to `RESOLVED`.
- Inspect the **PostgreSQL Trigger Audit Log** inside the drawer, verifying that trigger `fn_audit_complaint_status_change()` automatically logged each transition with timestamps.

---

### Step 5: Semantic Complaint Search with pgvector (2 minutes)
- Navigate to the **Semantic Search** tab.
- Click the sample query: `"Ventilation fan is not working and room is hot"`.
- Observe the results:
  - The system computes the query embedding.
  - PostgreSQL calculates cosine similarity against historical tickets.
  - It retrieves the matching HVAC ticket with a high similarity score (e.g. >0.90) and displays the verified resolution note.
- Contrast this by toggling to **Traditional Keyword (SQL LIKE)** to demonstrate how semantic search finds conceptually related records even when the exact words differ.

---

### Step 6: Interactive DBMS Demonstration Lab (3 minutes)
- Switch evaluator role to **ADMIN** and open the **DBMS Academic Lab** tab.
- Demonstrate predefined SQL queries:
  1. **DDL Lifecycle**: Executes CREATE TABLE, ALTER TABLE, and safe educational DROP TABLE on a demonstration object.
  2. **Multi-Table Joins**: Executes the 5-table join across buildings, rooms, assets, complaints, and technicians.
  3. **Aggregates & HAVING**: Shows room capacity calculations with `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`, `GROUP BY`, and `HAVING`.
  4. **Subqueries**: Demonstrates nested correlated and scalar subqueries.
  5. **Views**: Queries `open_complaints_view` and `room_utilization_view`.
  6. **Stored Functions**: Calls `calculate_room_availability()` and `get_staff_workload_summary()`.
- Note the live execution time in milliseconds and formatted tabular output.

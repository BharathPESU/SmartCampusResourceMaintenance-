# Test Plan & Verification Report

## 1. Unit Testing Suite (`node:test`)
The test suite in `lib/dbms-logic.test.ts` executes pure domain logic with zero external I/O overhead.

Run command:
```bash
npx --yes tsx --test lib/dbms-logic.test.ts
```

### Verified Test Cases:
1. **`doIntervalsOverlap`**:
   - Confirms that colliding slots (10:00-11:00 and 10:30-11:30) evaluate to `true`.
   - Confirms that consecutive half-open slots ([10:00, 11:00) and [11:00, 12:00)) evaluate to `false` (allowing consecutive bookings without collision).
   - Confirms that disjoint slots evaluate to `false`.
2. **`validateBookingTime`**:
   - Rejects reversed dates (end before start).
   - Rejects reservations shorter than 15 minutes.
   - Accepts valid reservations within the allowed window.
3. **`isValidComplaintTransition`**:
   - Enforces valid progression: `OPEN -> ASSIGNED -> IN_PROGRESS -> RESOLVED`.
   - Rejects illegal skipping: `OPEN -> IN_PROGRESS` (fails validation).
   - Permits reopening: `RESOLVED -> OPEN`.
4. **`checkPermission` (Authorization Matrix)**:
   - Validates that CAMPUS_USER can book and report issues, but cannot assign technicians, execute DB Lab queries, or view staff compensation.
   - Validates that users can only cancel bookings they own, while ADMIN can cancel any reservation.
   - Validates that MAINTENANCE_STAFF can update work order status.
5. **`cosineSimilarity`**:
   - Verifies mathematical accuracy: identical vectors yield `1.0`, orthogonal vectors yield `0.0`.
   - Verifies semantic clustering: HVAC descriptions yield significantly higher similarity scores against ventilation issues than against projector display issues.

## 2. Integration & End-to-End Verification
- **Booking Conflict Prevention**: Attempting to book an already reserved space triggers a database rejection (HTTP 409 Conflict) and displays an in-UI error alert.
- **Transactional Outbox Sync**: Submitting a booking or complaint registers an event in `outbox_events` and immediately reflects in the MongoDB activity event stream.
- **Staff Salary Masking**: Verified that switching identity from Admin (Eleanor) to Campus User (Alex) masks all salary fields to `•••••• [RESTRICTED]`.
- **DBMS Lab Query Runner**: Tested all predefined queries (DDL create/alter/drop, DML, Joins, Aggregates, Views, Stored Functions) returning live tabular outputs.

# Database Justification & Polyglot Persistence Architecture

## 1. Why PostgreSQL for Authoritative Business Data?

PostgreSQL was selected as the foundational transactional system of record for the Smart Campus platform because:

1. **ACID Transactional Guarantees**: Campus room bookings and asset inventory cannot tolerate dirty reads, non-repeatable reads, or phantom states. A student booking a classroom must atomically commit the reservation record, generate a confirmation code, and emit an outbox event.
2. **Advanced Concurrency & Exclusion Constraints**: Through `btree_gist` and half-open range types `tsrange(start_time, end_time, '[)')`, PostgreSQL guarantees at the storage engine level that two overlapping bookings for the same room are physically rejected. Client-side checks alone are prone to race conditions under concurrent network requests.
3. **Complex Integrity Constraints**: Relational foreign keys with cascading policies, `CHECK (capacity > 0)`, `CHECK (end_time > start_time)`, and self-referencing supervisor checks (`supervisor_staff_id != staff_id`) prevent data corruption.
4. **Relational Views, Triggers & PL/pgSQL Stored Functions**: PostgreSQL allows business rules to be executed and audited directly in the database engine, reducing network round-trips and ensuring compliance.

## 2. Why MongoDB for Activity Events and Auditing?

MongoDB was selected as the NoSQL document store to handle the campus event timeline:

1. **Schema Flexibility for Heterogeneous Payloads**: Event types (`BOOKING_CONFIRMED`, `COMPLAINT_ASSIGNED`, `ASSET_STATUS_CHANGED`) carry radically different metadata structures. Storing them in a polymorphic document format avoids creating sparse or denormalized SQL columns.
2. **High-Throughput Append-Only Event Sinks**: MongoDB efficiently ingests continuous streams of telemetry and campus audit records.
3. **Powerful Aggregation Pipelines**: MongoDB's `$group`, `$sort`, and `$match` stages provide fast multi-dimensional analytical reporting across event types, timestamps, and staff actors.
4. **Idempotent Delivery via Unique Indexing**: The unique index on `eventId` guarantees that outbox retries from PostgreSQL never produce duplicate timeline events in MongoDB.

## 3. Why pgvector for Semantic Search?

Vector similarity search was embedded directly inside PostgreSQL using `pgvector`:

1. **Unified Storage & Zero Sync Latency**: Rather than managing an external standalone vector database (such as Pinecone or Milvus) with complex dual-write consistency problems, vectors live side-by-side with the `complaints` table.
2. **Combined Relational & Vector Filtering**: Queries can filter by building, room, technician, or date *while simultaneously* computing cosine similarity distance (`<->`).
3. **Data Protection & Governance**: Complaint descriptions and maintenance resolution notes remain inside the institutional database perimeter without sending confidential records to external third-party vector clouds.

## 4. The Transactional Outbox Pattern

To prevent distributed two-phase commit (2PC) failures between PostgreSQL and MongoDB:
1. Business actions write their authoritative records and an event into the PostgreSQL `outbox_events` table within a **single local transaction**.
2. An asynchronous Outbox Worker periodically queries `outbox_events WHERE status = 'PENDING'`.
3. The worker delivers each document to MongoDB using an idempotent `upsert`.
4. Upon successful MongoDB acknowledgment, the PostgreSQL outbox row is updated to `PROCESSED`.
5. If MongoDB is temporarily offline, PostgreSQL transactions succeed without error, and events accumulate safely in the outbox ready for automatic retry.

# Smart Campus Resource & Maintenance Management System

An academic DBMS Level 3 experiential-learning full-stack application demonstrating realistic campus management workflows, a well-designed relational database with PostgreSQL and Drizzle ORM, a NoSQL event document store with MongoDB, vector similarity search with pgvector, advanced DBMS concepts, and role-based access control.

---

## 1. Project Overview & Scope

The **Smart Campus Resource & Maintenance Management System** streamlines university facilities operations by unifying:
- **Spatial Infrastructure**: Buildings, floors, lecture halls, computer labs, and research facilities.
- **Physical Asset Inventory**: AV systems, central HVAC units, network switches, and electrical panels.
- **Room Booking & Concurrency**: Atomic reservation transactions and database-enforced conflict exclusion preventing double-bookings.
- **Maintenance Lifecycle**: Incident reporting, technician assignment, status progression, and automated PostgreSQL trigger audit logging.
- **Semantic Intelligence**: Natural-language similarity search for past maintenance tickets using PostgreSQL `pgvector` embeddings.
- **Polyglot Persistence**: The Transactional Outbox pattern streaming committed relational events into MongoDB for timeline analytics.

---

## 2. Core Entities (Preserving the 9 Chen ER Entities)

1. **`BUILDING`**: Campus buildings with locations, floor counts, and infrastructure metrics.
2. **`ROOM`**: Learning and collaborative spaces with capacity constraints and unique numbers per building.
3. **`ASSET`**: Equipment inventory installed in rooms, categorized by system type with operational health status.
4. **`FACILITY`**: Departmental specialized facilities (robotics labs, supercomputing clusters) with operating hours.
5. **`STAFF`**: Technical personnel specializing in facility domains with supervisory hierarchies (`supervisor_staff_id != staff_id`).
6. **`USER`**: Campus identities (`CAMPUS_USER`, `MAINTENANCE_STAFF`, `ADMIN`) with role-based permissions.
7. **`COMPLAINT`**: Work orders linked to reporting users and affected assets with lifecycle status progression.
8. **`BOOKING`**: Room reservations with start/end timestamps and conflict prevention.
9. **`CONFIRMATION`**: Unique confirmation records issued atomically upon successful booking creation.

---

## 3. Technology Stack

- **Frontend**: Next.js 15 App Router, TypeScript (strict mode), Tailwind CSS, Lucide icons, Recharts.
- **Relational Database**: PostgreSQL 16 with Drizzle ORM, explicit SQL migrations, views, triggers, and stored functions.
- **NoSQL Event Store**: MongoDB using the official Node.js driver for timeline aggregation pipelines.
- **Vector Search**: PostgreSQL `pgvector` with Google Gemini embeddings (`text-embedding-004`).
- **Containerization**: Docker Compose (`docker-compose.yml`) for multi-service local deployment.
- **Testing**: Node's built-in test runner (`node:test`) for zero-overhead pure logic verification.

---

## 4. Implemented Advanced DBMS Concepts

1. **Atomic Transactions & The Outbox Pattern**: Atomic insertion of bookings, confirmation records, and outbox events in a single transaction.
2. **Booking Exclusion Constraints**: Half-open intervals `[start_time, end_time)` preventing double-bookings at the database layer.
3. **Database Triggers**: `trg_audit_complaint_status` automatically recording status changes into `complaint_audit_log`.
4. **Relational Views**: `open_complaints_view`, `room_utilization_view`, and `asset_maintenance_summary_view`.
5. **PL/pgSQL Stored Functions**: `calculate_room_availability()` and `get_staff_workload_summary()`.
6. **Vector Cosine Similarity**: Embedding vectors stored directly in PostgreSQL and queried via cosine distance.

---

## 5. Quick Start & Setup

### Prerequisites
- Node.js v20+
- (Optional) Docker & Docker Compose for running dedicated PostgreSQL and MongoDB services locally.

### Installation
```bash
# Install dependencies
npm install

# Run pure logic unit tests
npm test

# Run development server
npm run dev
```

Visit `http://localhost:3000` in your browser.

### Running with Local Docker Containers
```bash
# Start PostgreSQL (with pgvector) and MongoDB
docker-compose up -d

# Run the database seed script
npm run db:seed

# Start the web app
npm run dev
```

---

## 6. Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server on port 3000 |
| `npm run build` | Compiles the production build of the Next.js application |
| `npm run start` | Starts the compiled production application |
| `npm test` | Runs the pure logic unit test suite via `node:test` |
| `npm run worker:outbox` | Runs the standalone transactional outbox worker |
| `npm run db:seed` | Seeds the database with all 9 entities, bookings, complaints, and embeddings |

---

## 7. Documentation Directory

Detailed specifications are available in the [`docs/`](docs/) directory:
- [`docs/architecture.md`](docs/architecture.md): System architecture, layers, and request flow.
- [`docs/erd.md`](docs/erd.md): Corrected Chen ER diagram with cardinalities and Mermaid model.
- [`docs/relational-schema.md`](docs/relational-schema.md): 3NF normalized schema, keys, and CHECK constraints.
- [`docs/database-justification.md`](docs/database-justification.md): Polyglot persistence rationale (PostgreSQL, MongoDB, pgvector).
- [`docs/advanced-dbms.md`](docs/advanced-dbms.md): Proof of transactions, exclusion constraints, triggers, views, and functions.
- [`docs/queries.sql`](docs/queries.sql): SQL query catalogue for DDL, DML, multi-table JOINs, and aggregates.
- [`docs/mongodb-aggregation.js`](docs/mongodb-aggregation.js): Runnable MongoDB aggregation pipelines.
- [`docs/vector-search.md`](docs/vector-search.md): Embedding generation, dimensionality, and cosine similarity metric.
- [`docs/testing.md`](docs/testing.md): Unit test assertions and integration test reports.
- [`docs/demo-script.md`](docs/demo-script.md): Step-by-step oral presentation guide for project evaluation.
- [`docs/limitations.md`](docs/limitations.md): Production deployment considerations and credential handling.

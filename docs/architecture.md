# System Architecture — Smart Campus Resource & Maintenance Management System

## 1. Architectural Overview

The **Smart Campus Resource & Maintenance Management System** is designed as a high-integrity, modular monolith that rigorously separates concerns across presentation, business orchestration, and persistence layers.

```
+--------------------------------------------------------------------------+
|                     PRESENTATION LAYER (Next.js 15)                      |
|  - Role-Aware App Shell & Evaluator Role Switcher                        |
|  - Dashboards, Bookings, Complaints, Facilities, Assets, Staff, Lab UI   |
+--------------------------------------------------------------------------+
                                    |
                                    v
+--------------------------------------------------------------------------+
|                 NEXT.JS ROUTE HANDLERS & SERVER API                      |
|  - /api/bookings, /api/complaints, /api/search, /api/db-lab, /api/worker |
|  - Zod Request Body & Query Validation                                   |
|  - Role-Based Authorization & Session Enforcement                        |
+--------------------------------------------------------------------------+
                                    |
                                    v
+--------------------------------------------------------------------------+
|                         APPLICATION SERVICE LAYER                        |
|  - BookingService: Atomic transactions, concurrency conflict check       |
|  - ComplaintService: Lifecycle transitions, audit logs, re-embedding     |
|  - VectorService: pgvector cosine similarity ranking & Gemini embeddings |
|  - AnalyticsService: SQL aggregates & MongoDB event reporting            |
+--------------------------------------------------------------------------+
                  |                                     |
                  v                                     v
+-----------------------------------+   +----------------------------------+
|    POSTGRESQL (AUTHORITATIVE)     |   |         OUTBOX WORKER            |
|  - Drizzle ORM + Raw SQL DDL/DML  |   |  - Reads outbox_events           |
|  - 9 Normalized Entities          |   |  - Idempotent delivery to Mongo  |
|  - Exclusion Overlap Constraints  |   |  - Marks events PROCESSED        |
|  - Triggers & Stored Functions    |   +----------------------------------+
|  - Views & pgvector Embeddings    |                    |
+-----------------------------------+                    v
                                        +----------------------------------+
                                        |         MONGODB (NOSQL)          |
                                        |  - collection: activity_events   |
                                        |  - Unique index on eventId       |
                                        |  - Aggregation Pipelines         |
                                        +----------------------------------+
```

## 2. Layer Responsibilities

### Presentation Layer
- Built with Next.js 15 App Router, TypeScript, Tailwind CSS, Lucide icons, and Recharts.
- Implements role-aware interfaces: Campus Users can reserve spaces and raise complaints; Maintenance Technicians can update ticket statuses with notes; Administrators have full oversight, staff assignment, salary visibility, and Database Lab access.

### API & Validation Layer
- Standardized REST Route Handlers under `/app/api/*`.
- Enforces strict schema validation using Zod before any domain logic executes.
- Masks confidential staff compensation for non-administrative roles.

### Service & Transaction Layer
- Encapsulates domain logic.
- Booking reservations run inside an atomic transaction: room availability is verified at the database level, booking record is inserted, unique confirmation code is generated, and a transactional outbox event is created. If any step fails, the entire transaction rolls back.

### Persistence Strategy
- **PostgreSQL**: Serves as the single authoritative source of truth for all relational business records (buildings, rooms, assets, facilities, staff, bookings, confirmations, complaints, and audit logs).
- **MongoDB**: Used exclusively for append-only, flexible activity event timelines and analytical event aggregations.
- **pgvector**: Stores high-dimensional semantic embeddings for complaint descriptions and resolutions directly linked to relational records.
- **Transactional Outbox Pattern**: Decouples the primary relational database from MongoDB, ensuring zero event loss if the NoSQL store experiences intermittent network latency.

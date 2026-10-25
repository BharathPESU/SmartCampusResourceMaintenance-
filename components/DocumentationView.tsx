'use client';

import React, { useState } from 'react';
import {
  FileText,
  Database,
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Terminal,
  BookOpen,
} from 'lucide-react';

export const DocumentationView: React.FC = () => {
  const [docTab, setDocTab] = useState<'erd' | 'schema' | 'queries' | 'mongodb' | 'advanced'>('erd');

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 text-white p-6 rounded-xl shadow-xs">
        <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">
          <BookOpen className="h-4 w-4" />
          Academic Level 3 DBMS Documentation
        </div>
        <h2 className="text-xl font-bold tracking-tight">System Specification & Technical Reference</h2>
        <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
          Comprehensive project documentation covering the corrected Chen ER diagram, normalized relational schema, SQL DDL/DML query references, MongoDB aggregation pipelines, and pgvector cosine similarity.
        </p>
      </div>

      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold">
        <button
          onClick={() => setDocTab('erd')}
          className={`pb-3 transition-colors border-b-2 ${
            docTab === 'erd' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          ER Diagram & Cardinality
        </button>
        <button
          onClick={() => setDocTab('schema')}
          className={`pb-3 transition-colors border-b-2 ${
            docTab === 'schema' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Relational Schema & Data Dictionary
        </button>
        <button
          onClick={() => setDocTab('queries')}
          className={`pb-3 transition-colors border-b-2 ${
            docTab === 'queries' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          SQL Query Catalogue (DDL/DML)
        </button>
        <button
          onClick={() => setDocTab('mongodb')}
          className={`pb-3 transition-colors border-b-2 ${
            docTab === 'mongodb' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          MongoDB Outbox & Aggregations
        </button>
        <button
          onClick={() => setDocTab('advanced')}
          className={`pb-3 transition-colors border-b-2 ${
            docTab === 'advanced' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Vector Search & Concurrency
        </button>
      </div>

      {docTab === 'erd' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900">Mermaid Entity-Relationship Model (9 Chen Entities)</h3>
          <div className="p-4 bg-slate-950 text-teal-300 font-mono text-xs rounded-lg overflow-x-auto leading-relaxed">
            <pre>{`erDiagram
    BUILDING ||--o{ ROOM : contains
    BUILDING ||--o{ FACILITY : houses
    ROOM ||--o{ ASSET : installs
    ROOM ||--o{ BOOKING : reserved_in
    USER_PROFILE ||--o{ BOOKING : creates
    USER_PROFILE ||--o{ COMPLAINT : raises
    USER_PROFILE ||--|| STAFF_PROFILE : extends
    USER_PROFILE }o--o{ FACILITY : uses
    STAFF_PROFILE |o--o{ STAFF_PROFILE : supervises
    STAFF_PROFILE ||--o{ COMPLAINT : resolves
    ASSET ||--o{ COMPLAINT : targets
    BOOKING ||--|| CONFIRMATION : confirms
    COMPLAINT ||--|| COMPLAINT_EMBEDDINGS : vector_indexed
    COMPLAINT ||--o{ COMPLAINT_AUDIT_LOG : audits`}</pre>
          </div>
          <div className="text-xs text-slate-600 space-y-2">
            <p className="font-semibold text-slate-800">Cardinality & Relationship Justifications:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>BUILDING to ROOM (1:N):</strong> One building contains many rooms; each room exists in exactly one building.</li>
              <li><strong>ROOM to ASSET (1:N):</strong> Each physical asset (projector, HVAC chiller, switch) is assigned to a specific room.</li>
              <li><strong>USER to BOOKING (1:N) & ROOM to BOOKING (1:N):</strong> Users reserve rooms. Exclusion constraint prevents overlapping time spans for the same room.</li>
              <li><strong>BOOKING to CONFIRMATION (1:1):</strong> Atomically generated confirmation code issued only upon successful database commit.</li>
              <li><strong>STAFF Supervision (1:N self-reference):</strong> Senior supervisors direct junior technicians without self-supervision (CHECK constraint).</li>
            </ul>
          </div>
        </div>
      )}

      {docTab === 'schema' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4 text-xs">
          <h3 className="font-bold text-sm text-slate-900">Normalized Relational Schema (3NF)</h3>
          <div className="space-y-3 font-mono">
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <span className="font-bold text-slate-900">buildings</span>(<u>building_id</u>, building_name [UQ], location, total_floors)
            </div>
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <span className="font-bold text-slate-900">rooms</span>(<u>room_id</u>, <i>building_id</i>, room_number, floor_no, room_type, capacity, status)
            </div>
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <span className="font-bold text-slate-900">assets</span>(<u>asset_id</u>, <i>room_id</i>, asset_name, category, status)
            </div>
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <span className="font-bold text-slate-900">staff_profiles</span>(<u>staff_id</u>, <i>user_id</i>, <i>facility_id</i>, <i>supervisor_staff_id</i>, designation, salary)
            </div>
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <span className="font-bold text-slate-900">bookings</span>(<u>booking_id</u>, <i>user_id</i>, <i>room_id</i>, start_time, end_time, purpose, status)
            </div>
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <span className="font-bold text-slate-900">confirmations</span>(<u>confirmation_id</u>, <i>booking_id</i>, issue_date, confirmation_code [UQ])
            </div>
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <span className="font-bold text-slate-900">complaints</span>(<u>complaint_id</u>, <i>raised_by_user_id</i>, <i>asset_id</i>, description, priority, status, <i>assigned_staff_id</i>)
            </div>
          </div>
        </div>
      )}

      {docTab === 'queries' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4 text-xs">
          <h3 className="font-bold text-sm text-slate-900">Comprehensive SQL Queries Rubric Evidence</h3>
          <p className="text-slate-600">
            All queries are executable directly from the <strong>DBMS Academic Lab</strong> tab with timing and formatted output:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <div className="font-bold text-slate-800 mb-1">DDL Statements</div>
              <p className="text-slate-500">CREATE TABLE with constraints, ALTER TABLE ADD COLUMN/INDEX, and safe educational DROP TABLE.</p>
            </div>
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <div className="font-bold text-slate-800 mb-1">DML Statements</div>
              <p className="text-slate-500">INSERT, UPDATE, DELETE, and SELECT with parameterized arguments and transaction boundaries.</p>
            </div>
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <div className="font-bold text-slate-800 mb-1">Relational Joins</div>
              <p className="text-slate-500">5-table multi-join traversing buildings → rooms → assets → complaints → technicians using INNER and LEFT JOINs.</p>
            </div>
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <div className="font-bold text-slate-800 mb-1">Aggregates & Grouping</div>
              <p className="text-slate-500">GROUP BY with HAVING clause, calculating COUNT, SUM, AVG, MIN, and MAX on room capacities and booking duration.</p>
            </div>
          </div>
        </div>
      )}

      {docTab === 'mongodb' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4 text-xs">
          <h3 className="font-bold text-sm text-slate-900">MongoDB Transactional Outbox & Aggregation Pipelines</h3>
          <p className="text-slate-600">
            Database writes in PostgreSQL insert records into <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">outbox_events</code>. The outbox worker asynchronously streams committed events into MongoDB <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">activity_events</code> with idempotent unique indexing on <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">eventId</code>.
          </p>
          <div className="p-4 bg-slate-950 text-emerald-300 font-mono text-xs rounded-lg overflow-x-auto">
            <pre>{`// MongoDB Aggregation Pipeline: Event Frequency by Category
db.activity_events.aggregate([
  {
    $group: {
      _id: "$eventType",
      totalOccurrences: { $sum: 1 },
      lastOccurred: { $max: "$occurredAt" }
    }
  },
  { $sort: { totalOccurrences: -1 } }
]);`}</pre>
          </div>
        </div>
      )}

      {docTab === 'advanced' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4 text-xs">
          <h3 className="font-bold text-sm text-slate-900">pgvector Cosine Distance & Concurrency Control</h3>
          <p className="text-slate-600 leading-relaxed">
            The system implements vector similarity search using PostgreSQL vector representation and cosine distance scoring:
          </p>
          <div className="p-4 bg-slate-950 text-purple-300 font-mono text-xs rounded-lg overflow-x-auto">
            <pre>{`-- pgvector Cosine Distance Similarity Retrieval
SELECT
    c.complaint_id,
    c.description,
    c.resolution_notes,
    1 - (ce.embedding_vector <=> $1::vector) AS similarity_score
FROM complaints c
JOIN complaint_embeddings ce ON c.complaint_id = ce.complaint_id
ORDER BY ce.embedding_vector <=> $1::vector ASC
LIMIT 5;`}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

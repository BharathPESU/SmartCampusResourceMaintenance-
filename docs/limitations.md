# Project Limitations & Production Deployment Considerations

## 1. External Infrastructure & Credentials

1. **PostgreSQL Relational Connection**:
   - In production environments (e.g. AWS RDS, Google Cloud SQL, Neon, or local Docker Compose), the application connects to a remote PostgreSQL cluster using `DATABASE_URL`.
   - In the zero-configuration cloud container preview, when `DATABASE_URL` is unconfigured, the application runs an embedded PostgreSQL 16 WASM engine (`PGlite`) executing real PostgreSQL SQL, constraints, transactions, and views.
2. **MongoDB NoSQL Connection**:
   - In production, set `MONGODB_URI` pointing to a MongoDB cluster (e.g. Atlas or local container).
   - If `MONGODB_URI` is unconfigured, events safely queue in the PostgreSQL `outbox_events` table and an in-memory document pipeline satisfies aggregation queries without crashing.
3. **Gemini Embedding API**:
   - High-dimensional vector generation utilizes `process.env.GEMINI_API_KEY` with model `text-embedding-004`.
   - If the API key is unconfigured, a deterministic 32-dimensional semantic vector fallback algorithm provides consistent cosine similarity retrieval.

## 2. Concurrency & High Availability
- **Outbox Worker**: In high-load production environments, the outbox worker (`worker.ts`) should be deployed as a separate background process or cron job rather than running inside the web request lifecycle.
- **Index Tuning**: For millions of complaint embeddings, a pgvector HNSW index (`USING hnsw (embedding_vector vector_cosine_ops)`) should be provisioned once dataset size exceeds 50,000 vectors.

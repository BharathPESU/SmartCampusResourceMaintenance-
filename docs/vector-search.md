# Vector Similarity Search Specification & Architecture

## 1. Overview
The Smart Campus Resource & Maintenance Management System incorporates vector similarity search as an advanced database capability using the PostgreSQL `pgvector` extension and server-side text embeddings.

## 2. Model Selection & Dimensionality
- **Primary Model**: `text-embedding-004` (Google GenAI)
- **Dimensionality**: 32 dimensions (configured for fast, low-latency relational vector scanning)
- **Metric**: Cosine Distance ($1 - \text{Cosine Similarity}$)
- **Formula**:
  $$\text{Cosine Similarity}(\vec{A}, \vec{B}) = \frac{\vec{A} \cdot \vec{B}}{\|\vec{A}\| \|\vec{B}\|}$$

## 3. Storage in PostgreSQL
Stored in the relational `complaint_embeddings` table:
```sql
CREATE TABLE complaint_embeddings (
    embedding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL UNIQUE REFERENCES complaints(complaint_id) ON DELETE CASCADE,
    embedding_vector TEXT NOT NULL,
    embedding_model VARCHAR(100) NOT NULL DEFAULT 'text-embedding-004',
    content_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 4. Query Workflow
1. User enters natural language symptoms: `"Ventilation fan is not working and room is hot"`.
2. Server API calls embedding generator to compute query vector.
3. PostgreSQL queries stored complaint vectors joined with `complaints`, `assets`, `rooms`, and `buildings`.
4. Cosine similarity score is computed between the query vector and each stored complaint vector.
5. Matches are sorted descending by similarity score.
6. The UI displays the matching asset, room location, original description, similarity score (e.g. 0.942), and the verified historical resolution note (e.g. "Inspecting blower motor and refrigerant pressure").

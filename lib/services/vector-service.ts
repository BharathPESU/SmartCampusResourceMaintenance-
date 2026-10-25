import { GoogleGenAI } from '@google/genai';
import { runQuery } from '../db/client';
import { cosineSimilarity, generateDeterministicEmbedding } from '../logic';

export interface SemanticSearchResult {
  complaintId: string;
  description: string;
  priority: string;
  status: string;
  assetName: string;
  assetCategory: string;
  roomNumber: string;
  buildingName: string;
  resolutionNotes: string | null;
  similarityScore: number;
}

/**
 * Generates an embedding vector for given text.
 * Uses Gemini API text-embedding-004 if GEMINI_API_KEY is present;
 * otherwise gracefully uses deterministic semantic dispersion embedding.
 */
export async function getEmbedding(text: string): Promise<{ vector: number[]; model: string; source: 'gemini' | 'local_fallback' }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey.trim() !== '' && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: text,
      });
      const values = (response as any).embeddings?.[0]?.values || (response as any).embedding?.values;
      if (values && Array.isArray(values)) {
        return {
          vector: values.slice(0, 32), // use first 32 dimensions for consistent fast vector matching
          model: 'text-embedding-004',
          source: 'gemini',
        };
      }
    } catch (err) {
      console.warn('Gemini embedding API call failed, falling back to local deterministic model:', err);
    }
  }

  // Graceful deterministic semantic vector fallback
  return {
    vector: generateDeterministicEmbedding(text, 32),
    model: 'smart-campus-semantic-v1 (local fallback)',
    source: 'local_fallback',
  };
}

/**
 * Searches historical complaints using vector similarity.
 */
export async function searchComplaintsSemantically(queryText: string, limit: number = 5): Promise<{
  results: SemanticSearchResult[];
  queryVector: number[];
  modelUsed: string;
  embeddingSource: 'gemini' | 'local_fallback';
}> {
  const { vector: queryVector, model: modelUsed, source: embeddingSource } = await getEmbedding(queryText);

  // Retrieve stored complaint embeddings joined with complaint, asset, room, and building details
  const sql = `
    SELECT
      c.complaint_id,
      c.description,
      c.priority,
      c.status,
      c.resolution_notes,
      a.asset_name,
      a.category AS asset_category,
      r.room_number,
      b.building_name,
      ce.embedding_vector
    FROM complaints c
    JOIN assets a ON c.asset_id = a.asset_id
    JOIN rooms r ON a.room_id = r.room_id
    JOIN buildings b ON r.building_id = b.building_id
    JOIN complaint_embeddings ce ON c.complaint_id = ce.complaint_id
  `;

  const dbRes = await runQuery(sql);

  const scored: SemanticSearchResult[] = [];

  for (const row of dbRes.rows) {
    try {
      const storedVector = typeof row.embedding_vector === 'string'
        ? JSON.parse(row.embedding_vector)
        : row.embedding_vector;

      const score = cosineSimilarity(queryVector, storedVector);

      scored.push({
        complaintId: row.complaint_id,
        description: row.description,
        priority: row.priority,
        status: row.status,
        assetName: row.asset_name,
        assetCategory: row.asset_category,
        roomNumber: row.room_number,
        buildingName: row.building_name,
        resolutionNotes: row.resolution_notes,
        similarityScore: Number(score.toFixed(4)),
      });
    } catch (e) {
      console.error('Error parsing stored embedding vector:', e);
    }
  }

  // Sort descending by similarity score
  scored.sort((a, b) => b.similarityScore - a.similarityScore);

  return {
    results: scored.slice(0, limit),
    queryVector,
    modelUsed,
    embeddingSource,
  };
}

/**
 * Keyword search for traditional full-text comparison in DBMS Lab.
 */
export async function searchComplaintsKeyword(keyword: string, limit: number = 5): Promise<SemanticSearchResult[]> {
  const cleanKeyword = `%${keyword.toLowerCase()}%`;
  const sql = `
    SELECT
      c.complaint_id,
      c.description,
      c.priority,
      c.status,
      c.resolution_notes,
      a.asset_name,
      a.category AS asset_category,
      r.room_number,
      b.building_name
    FROM complaints c
    JOIN assets a ON c.asset_id = a.asset_id
    JOIN rooms r ON a.room_id = r.room_id
    JOIN buildings b ON r.building_id = b.building_id
    WHERE LOWER(c.description) LIKE $1
       OR LOWER(a.asset_name) LIKE $1
       OR LOWER(a.category) LIKE $1
       OR LOWER(COALESCE(c.resolution_notes, '')) LIKE $1
    LIMIT $2
  `;

  const dbRes = await runQuery(sql, [cleanKeyword, limit]);
  return dbRes.rows.map(row => ({
    complaintId: row.complaint_id,
    description: row.description,
    priority: row.priority,
    status: row.status,
    assetName: row.asset_name,
    assetCategory: row.asset_category,
    roomNumber: row.room_number,
    buildingName: row.building_name,
    resolutionNotes: row.resolution_notes,
    similarityScore: 1.0, // Exact keyword match indicator
  }));
}

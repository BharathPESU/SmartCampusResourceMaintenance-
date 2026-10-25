import { NextRequest, NextResponse } from 'next/server';
import { searchComplaintsSemantically, searchComplaintsKeyword } from '@/lib/services/vector-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, mode = 'semantic', limit = 5 } = body;

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return NextResponse.json({ success: false, error: 'Query text is required' }, { status: 400 });
    }

    if (mode === 'keyword') {
      const results = await searchComplaintsKeyword(query, limit);
      return NextResponse.json({
        success: true,
        mode: 'keyword',
        query,
        count: results.length,
        results,
      });
    }

    // Semantic vector search
    const { results, queryVector, modelUsed, embeddingSource } = await searchComplaintsSemantically(query, limit);

    return NextResponse.json({
      success: true,
      mode: 'semantic',
      query,
      modelUsed,
      embeddingSource,
      vectorDimension: queryVector.length,
      sampleVectorCoordinates: queryVector.slice(0, 5),
      count: results.length,
      results,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

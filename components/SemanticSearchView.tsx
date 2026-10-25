'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  Database,
  Cpu,
} from 'lucide-react';

export const SemanticSearchView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'semantic' | 'keyword'>('semantic');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searchMeta, setSearchMeta] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sampleQueries = [
    'Ventilation fan is not working and room is hot',
    'Laser projector shuts down unexpectedly with amber light',
    'Workstation ethernet port dropping network packets',
    'Ceiling LED panels flickering during presentations',
  ];

  const handleSearch = async (textToSearch?: string) => {
    const q = textToSearch !== undefined ? textToSearch : query;
    if (!q.trim()) return;

    setIsSearching(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q.trim(),
          mode: searchMode,
          limit: 5,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Search failed');
        setSearchResults([]);
      } else {
        setSearchResults(data.results || []);
        setSearchMeta({
          modelUsed: data.modelUsed,
          embeddingSource: data.embeddingSource,
          vectorDimension: data.vectorDimension,
          sampleCoords: data.sampleVectorCoordinates,
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error occurred');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-xl shadow-xs">
        <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">
          <Sparkles className="h-4 w-4" />
          pgvector & Gemini Embedding Intelligence
        </div>
        <h2 className="text-xl font-bold tracking-tight">Semantic Maintenance Search</h2>
        <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
          Retrieve past campus maintenance incidents by natural meaning rather than exact word matching. Cosine distance queries over PostgreSQL complaint vectors surface prior diagnoses and verified resolutions.
        </p>
      </div>

      {/* Search Input Box & Mode Toggle */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">Search Strategy:</span>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setSearchMode('semantic')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                searchMode === 'semantic'
                  ? 'bg-slate-900 text-teal-400 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Vector Semantic Search (pgvector)
            </button>
            <button
              onClick={() => setSearchMode('keyword')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                searchMode === 'keyword'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Traditional Keyword (SQL LIKE)
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Describe symptoms in plain natural English (e.g. 'Air circulation fan stopped operating')..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-full text-xs pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
            />
          </div>

          <button
            onClick={() => handleSearch()}
            disabled={isSearching || !query.trim()}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition-colors shrink-0 flex items-center gap-2"
          >
            {isSearching ? 'Vector Searching...' : 'Run Search'}
            <ArrowRight className="h-4 w-4 text-teal-400" />
          </button>
        </div>

        {/* Suggested Queries */}
        <div>
          <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
            Academic Demo Queries (click to test):
          </span>
          <div className="flex flex-wrap gap-2">
            {sampleQueries.map((sq, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuery(sq);
                  handleSearch(sq);
                }}
                className="text-[11px] font-medium bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 rounded-md px-2.5 py-1 transition-colors text-left"
              >
                &ldquo;{sq}&rdquo;
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Vector Metadata Display if Semantic Search Ran */}
      {searchMeta && searchMode === 'semantic' && (
        <div className="bg-teal-50/60 p-4 rounded-xl border border-teal-200 text-xs text-teal-900 space-y-1">
          <div className="flex items-center gap-2 font-bold text-teal-950">
            <Cpu className="h-4 w-4 text-teal-700" />
            Vector Embedding Model: <span className="font-mono text-teal-800">{searchMeta.modelUsed}</span>
          </div>
          <p className="text-[11px] text-teal-800">
            Dimension: {searchMeta.vectorDimension}-D vector generated. First 5 sample coordinates:{' '}
            <span className="font-mono bg-teal-100 px-1 py-0.5 rounded">
              [{searchMeta.sampleCoords?.map((n: number) => n.toFixed(3)).join(', ')}...]
            </span>
          </p>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs">
          {errorMsg}
        </div>
      )}

      {/* Results List */}
      {searchResults !== null && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Similar Historical Incident Records</h3>
              <p className="text-xs text-slate-500">Ranked by Cosine Similarity Metric in PostgreSQL</p>
            </div>
            <span className="text-xs font-semibold text-slate-500">{searchResults.length} matches found</span>
          </div>

          <div className="divide-y divide-slate-100">
            {searchResults.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No matching historical tickets found for this query.
              </div>
            ) : (
              searchResults.map((item, idx) => {
                const scorePercent = Math.min(100, Math.max(0, Math.round(item.similarityScore * 100)));
                return (
                  <div key={item.complaintId || idx} className="p-5 hover:bg-slate-50/70 transition-colors space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{item.assetName}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-600 font-medium">
                          Room {item.roomNumber} ({item.buildingName})
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {item.assetCategory}
                        </span>
                      </div>

                      {/* Similarity Score Pill */}
                      {searchMode === 'semantic' && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-teal-800">
                            Similarity: {(item.similarityScore).toFixed(3)}
                          </span>
                          <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-teal-600 h-full rounded-full"
                              style={{ width: `${scorePercent}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                      &ldquo;{item.description}&rdquo;
                    </p>

                    {item.resolutionNotes ? (
                      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-950 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          Verified Historical Resolution:
                        </div>
                        <p className="text-[11px] leading-relaxed text-emerald-900">{item.resolutionNotes}</p>
                      </div>
                    ) : (
                      <div className="text-[11px] text-amber-700 font-medium italic">
                        Status: {item.status} (Resolution notes currently pending completion)
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

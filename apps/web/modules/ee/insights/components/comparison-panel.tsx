"use client";

import { Loader2, SearchIcon } from "lucide-react";
import { Badge } from "@/modules/ui/components/badge";
import { Button } from "@/modules/ui/components/button";
import { useSemanticSearch } from "../hooks/use-semantic-search";
import type { SearchResult } from "../types";

interface ComparisonPanelProps {
  environmentId: string;
  surveys: Array<{ id: string; name: string }>;
}

const stripHtml = (html: string): string => html.replace(/<[^>]*>/g, "").trim();

const formatScore = (score: number): string => `${(score * 100).toFixed(1)}%`;

const getScoreBadgeType = (score: number): "success" | "warning" | "gray" => {
  if (score >= 0.7) return "success";
  if (score >= 0.4) return "warning";
  return "gray";
};

const ComparisonResultCard = ({ result }: { result: SearchResult }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:border-slate-300">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        {result.field_label && (
          <p className="mb-0.5 text-xs text-slate-500">{stripHtml(result.field_label)}</p>
        )}
        <p className="line-clamp-3 text-sm text-slate-800">{result.value_text || "(no text)"}</p>
      </div>
      <Badge text={formatScore(result.score)} type={getScoreBadgeType(result.score)} size="tiny" />
    </div>
  </div>
);

const SearchPanel = ({ environmentId, label }: { environmentId: string; label: string }) => {
  const { query, setQuery, results, isSearching, hasSearched, search } = useSemanticSearch(environmentId);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      search();
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="mb-3 text-xs font-semibold text-slate-500">{label}</p>

      {/* Search input */}
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="w-full rounded-md border border-slate-300 bg-white py-1.5 pr-3 pl-8 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 focus:outline-none"
            placeholder="Search feedback..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSearching}
          />
        </div>
        <Button size="sm" onClick={search} disabled={isSearching || !query.trim()}>
          {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Search"}
        </Button>
      </div>

      {/* Results */}
      {isSearching && (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      )}

      {!isSearching && hasSearched && results.length > 0 && (
        <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          <p className="text-xs text-slate-400">{results.length} results</p>
          {results.map((result) => (
            <ComparisonResultCard key={result.feedback_record_id} result={result} />
          ))}
        </div>
      )}

      {!isSearching && hasSearched && results.length === 0 && (
        <div className="flex h-40 items-center justify-center text-sm text-slate-400">No results found.</div>
      )}

      {!isSearching && !hasSearched && (
        <div className="flex h-40 items-center justify-center text-sm text-slate-400">
          Enter a query to search.
        </div>
      )}
    </div>
  );
};

export const ComparisonPanel = ({ environmentId }: ComparisonPanelProps) => {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <SearchPanel environmentId={environmentId} label="Search A" />
      <SearchPanel environmentId={environmentId} label="Search B" />
    </div>
  );
};

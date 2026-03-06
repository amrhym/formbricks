"use client";

import { BarChart3Icon, Loader2, SearchIcon, TrendingUpIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { semanticSearchAction } from "@/modules/ee/insights/actions";
import { Badge } from "@/modules/ui/components/badge";
import { Button } from "@/modules/ui/components/button";

interface SemanticSearchResult {
  feedback_record_id: string;
  score: number;
  field_label: string;
  value_text: string;
}

interface SemanticSearchProps {
  environmentId: string;
}

const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>/g, "").trim();
};

export const SemanticSearch = ({ environmentId }: SemanticSearchProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SemanticSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsSearching(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await semanticSearchAction({ environmentId, query: trimmed, limit: 20 });
      if (response?.data) {
        setResults(response.data);
      } else {
        setResults([]);
        if (response?.serverError) {
          setError("Search failed. Please try again.");
        }
      }
    } catch {
      setError("Search failed. Please try again.");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [query, environmentId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const formatScore = (score: number): string => {
    return `${(score * 100).toFixed(1)}%`;
  };

  const getScoreBadgeType = (score: number): "success" | "warning" | "gray" => {
    if (score >= 0.7) return "success";
    if (score >= 0.4) return "warning";
    return "gray";
  };

  const stats = useMemo(() => {
    if (results.length === 0) return null;
    const scores = results.map((r) => r.score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const highRelevance = scores.filter((s) => s >= 0.7).length;
    const medRelevance = scores.filter((s) => s >= 0.4 && s < 0.7).length;
    const lowRelevance = scores.filter((s) => s < 0.4).length;

    // Unique questions
    const questions = new Set(results.map((r) => stripHtml(r.field_label)).filter(Boolean));

    return { avg, max, min, highRelevance, medRelevance, lowRelevance, uniqueQuestions: questions.size };
  }, [results]);

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-4 pl-10 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 focus:outline-none"
            placeholder="Search feedback by meaning... (e.g. 'customer satisfaction with delivery')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSearching}
          />
        </div>
        <Button size="sm" onClick={handleSearch} disabled={isSearching || !query.trim()}>
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Loading State */}
      {isSearching && (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
            <p className="mt-3 text-sm text-slate-500">Searching feedback...</p>
          </div>
        </div>
      )}

      {/* Statistics + Results */}
      {!isSearching && hasSearched && results.length > 0 && (
        <div className="space-y-4">
          {/* Statistics Bar */}
          {stats && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <SearchIcon className="h-3.5 w-3.5" />
                  Results
                </div>
                <p className="mt-1 text-lg font-semibold text-slate-800">{results.length}</p>
                <p className="text-xs text-slate-400">
                  from {stats.uniqueQuestions} question{stats.uniqueQuestions !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <TrendingUpIcon className="h-3.5 w-3.5" />
                  Avg. Relevance
                </div>
                <p className="mt-1 text-lg font-semibold text-slate-800">{formatScore(stats.avg)}</p>
                <p className="text-xs text-slate-400">
                  {formatScore(stats.min)} — {formatScore(stats.max)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <BarChart3Icon className="h-3.5 w-3.5" />
                  Relevance Breakdown
                </div>
                <div className="mt-1.5 flex gap-1.5">
                  {stats.highRelevance > 0 && (
                    <Badge text={`${stats.highRelevance} high`} type="success" size="tiny" />
                  )}
                  {stats.medRelevance > 0 && (
                    <Badge text={`${stats.medRelevance} med`} type="warning" size="tiny" />
                  )}
                  {stats.lowRelevance > 0 && (
                    <Badge text={`${stats.lowRelevance} low`} type="gray" size="tiny" />
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <TrendingUpIcon className="h-3.5 w-3.5" />
                  Best Match
                </div>
                <p className="mt-1 text-lg font-semibold text-slate-800">{formatScore(stats.max)}</p>
                <p className="mt-0.5 truncate text-xs text-slate-400">
                  {stripHtml(results[0].field_label) || "—"}
                </p>
              </div>
            </div>
          )}

          {/* Relevance Score Legend */}
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>Relevance:</span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              70%+ High
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
              40–70% Medium
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-slate-400" />
              &lt;40% Low
            </span>
          </div>

          {/* Result Cards */}
          {results.map((result) => (
            <div
              key={result.feedback_record_id}
              className="rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {/* Question Label — strip HTML */}
                  {result.field_label && (
                    <p className="mb-1 text-xs font-medium text-slate-500">{stripHtml(result.field_label)}</p>
                  )}

                  {/* Answer Text */}
                  <p className="text-sm leading-relaxed text-slate-800">{result.value_text || "(no text)"}</p>
                </div>

                {/* Score Badge */}
                <Badge text={formatScore(result.score)} type={getScoreBadgeType(result.score)} size="tiny" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isSearching && hasSearched && results.length === 0 && !error && (
        <div className="flex h-64 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
          <div className="text-center">
            <SearchIcon className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-3 text-sm font-medium text-slate-600">No results found</h3>
            <p className="mt-1 text-xs text-slate-400">Try a different search query</p>
          </div>
        </div>
      )}

      {/* Initial State */}
      {!isSearching && !hasSearched && (
        <div className="flex h-64 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
          <div className="text-center">
            <SearchIcon className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-3 text-sm font-medium text-slate-600">Search your feedback</h3>
            <p className="mt-1 text-xs text-slate-400">
              Enter a query to find feedback by meaning, not just keywords
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

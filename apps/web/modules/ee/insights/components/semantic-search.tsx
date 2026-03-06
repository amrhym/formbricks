"use client";

import { ColumnsIcon, Loader2, SearchIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/modules/ui/components/button";
import { useSemanticSearch } from "../hooks/use-semantic-search";
import type { SearchResult, ViewMode } from "../types";
import { ComparisonPanel } from "./comparison-panel";
import { SearchFiltersPanel } from "./search-filters";
import { SearchInput } from "./search-input";
import { SearchResultsList } from "./search-results-list";
import { SearchStats } from "./search-stats";
import { SearchToolbar } from "./search-toolbar";
import { SimilarModal } from "./similar-modal";
import { TimelineView } from "./timeline-view";

interface SemanticSearchProps {
  environmentId: string;
  surveys: Array<{ id: string; name: string }>;
}

function exportResultsToCsv(results: SearchResult[]) {
  const headers = ["Question", "Answer", "Score", "Survey", "Sentiment", "Date"];
  const rows = results.map((r) => [
    r.field_label.replace(/<[^>]*>/g, ""),
    r.value_text,
    String(r.score),
    r.source_name,
    r.sentiment || "",
    r.collected_at,
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `semantic-search-results-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export const SemanticSearch = ({ environmentId, surveys }: SemanticSearchProps) => {
  const {
    query,
    setQuery,
    results,
    isSearching,
    hasSearched,
    error,
    nextCursor,
    filters,
    setFilters,
    recentSearches,
    selectedIds,
    toggleSelected,
    selectAll,
    clearSelection,
    search,
    loadMore,
    findSimilar,
  } = useSemanticSearch(environmentId);

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [showComparison, setShowComparison] = useState(false);
  const [similarModalOpen, setSimilarModalOpen] = useState(false);
  const [similarResults, setSimilarResults] = useState<SearchResult[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarSource, setSimilarSource] = useState<SearchResult | null>(null);

  const handleFindSimilar = useCallback(
    async (recordId: string) => {
      const source = results.find((r) => r.feedback_record_id === recordId) ?? null;
      setSimilarSource(source);
      setSimilarModalOpen(true);
      setSimilarLoading(true);
      setSimilarResults([]);

      try {
        const similar = await findSimilar(recordId);
        setSimilarResults(similar);
      } catch {
        setSimilarResults([]);
      } finally {
        setSimilarLoading(false);
      }
    },
    [results, findSimilar]
  );

  const handleExport = useCallback(() => {
    exportResultsToCsv(results);
  }, [results]);

  const handleExportSelected = useCallback(() => {
    const selected = results.filter((r) => selectedIds.has(r.feedback_record_id));
    exportResultsToCsv(selected);
  }, [results, selectedIds]);

  if (showComparison) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-700">Comparison Mode</h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowComparison(false)}
            className="text-xs text-slate-500">
            <ColumnsIcon className="mr-1 h-3 w-3" />
            Exit Comparison
          </Button>
        </div>
        <ComparisonPanel environmentId={environmentId} surveys={surveys} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <SearchInput
        query={query}
        onQueryChange={setQuery}
        onSearch={search}
        isSearching={isSearching}
        recentSearches={recentSearches}
      />

      {/* Filters */}
      <SearchFiltersPanel filters={filters} onFiltersChange={setFilters} surveys={surveys} />

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Loading State */}
      {isSearching && !hasSearched && (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
            <p className="mt-3 text-sm text-slate-500">Searching feedback...</p>
          </div>
        </div>
      )}

      {/* Statistics + Toolbar + Results */}
      {hasSearched && results.length > 0 && (
        <div className="space-y-4">
          {/* Statistics */}
          <SearchStats results={results} />

          {/* Toolbar */}
          <SearchToolbar
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onExport={handleExport}
            onToggleComparison={() => setShowComparison(true)}
            showComparison={false}
            selectedCount={selectedIds.size}
            onExportSelected={handleExportSelected}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            resultCount={results.length}
          />

          {/* Results */}
          {viewMode === "timeline" ? (
            <TimelineView
              results={results}
              query={query}
              environmentId={environmentId}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelected}
              onFindSimilar={handleFindSimilar}
            />
          ) : (
            <SearchResultsList
              results={results}
              query={query}
              environmentId={environmentId}
              viewMode={viewMode}
              nextCursor={nextCursor}
              isSearching={isSearching}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelected}
              onLoadMore={loadMore}
              onFindSimilar={handleFindSimilar}
            />
          )}
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

      {/* Similar Modal */}
      <SimilarModal
        isOpen={similarModalOpen}
        onClose={() => setSimilarModalOpen(false)}
        results={similarResults}
        isLoading={similarLoading}
        sourceResult={similarSource}
        environmentId={environmentId}
      />
    </div>
  );
};

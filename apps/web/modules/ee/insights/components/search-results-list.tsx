"use client";

import { ChevronDownIcon, ChevronRightIcon, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/modules/ui/components/button";
import type { SearchResult, ViewMode } from "../types";
import { SearchResultCard } from "./search-result-card";

interface SearchResultsListProps {
  results: SearchResult[];
  query: string;
  environmentId: string;
  viewMode: ViewMode;
  nextCursor: string | null;
  isSearching: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onLoadMore: () => void;
  onFindSimilar: (recordId: string) => void;
}

const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>/g, "").trim();
};

interface GroupedResults {
  label: string;
  results: SearchResult[];
}

export const SearchResultsList = ({
  results,
  query,
  environmentId,
  viewMode,
  nextCursor,
  isSearching,
  selectedIds,
  onToggleSelect,
  onLoadMore,
  onFindSimilar,
}: SearchResultsListProps) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const grouped = useMemo<GroupedResults[]>(() => {
    if (viewMode !== "grouped") return [];

    const groupMap = new Map<string, SearchResult[]>();
    for (const result of results) {
      const label = stripHtml(result.field_label) || "Unlabeled";
      const group = groupMap.get(label);
      if (group) {
        group.push(result);
      } else {
        groupMap.set(label, [result]);
      }
    }

    return Array.from(groupMap.entries()).map(([label, items]) => ({
      label,
      results: items,
    }));
  }, [results, viewMode]);

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const renderCard = (result: SearchResult) => (
    <SearchResultCard
      key={result.feedback_record_id}
      result={result}
      query={query}
      environmentId={environmentId}
      isSelected={selectedIds.has(result.feedback_record_id)}
      onToggleSelect={() => onToggleSelect(result.feedback_record_id)}
      onFindSimilar={onFindSimilar}
    />
  );

  return (
    <div className="space-y-3">
      {viewMode === "grouped"
        ? grouped.map((group) => {
            const isCollapsed = collapsedGroups.has(group.label);
            return (
              <div key={group.label} className="rounded-lg border border-slate-200">
                <div
                  className="flex cursor-pointer items-center gap-2 px-4 py-3 hover:bg-slate-50"
                  onClick={() => toggleGroup(group.label)}>
                  {isCollapsed ? (
                    <ChevronRightIcon className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDownIcon className="h-4 w-4 text-slate-400" />
                  )}
                  <span className="text-sm font-medium text-slate-700">{group.label}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                    {group.results.length}
                  </span>
                </div>
                {!isCollapsed && <div className="space-y-3 px-4 pb-4">{group.results.map(renderCard)}</div>}
              </div>
            );
          })
        : results.map(renderCard)}

      {/* Load More */}
      {nextCursor && (
        <div className="flex justify-center pt-2">
          <Button size="sm" variant="secondary" onClick={onLoadMore} disabled={isSearching}>
            {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSearching ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
};

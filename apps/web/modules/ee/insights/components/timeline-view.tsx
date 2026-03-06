"use client";

import { useMemo } from "react";
import type { SearchResult } from "../types";
import { SearchResultCard } from "./search-result-card";

interface TimelineViewProps {
  results: SearchResult[];
  query: string;
  environmentId: string;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onFindSimilar: (recordId: string) => void;
}

function groupByDate(results: SearchResult[]): Map<string, SearchResult[]> {
  const groups = new Map<string, SearchResult[]>();

  for (const result of results) {
    const dateKey = result.collected_at ? result.collected_at.split("T")[0] : "Unknown";
    const existing = groups.get(dateKey);
    if (existing) {
      existing.push(result);
    } else {
      groups.set(dateKey, [result]);
    }
  }

  return groups;
}

function formatDateHeader(dateKey: string): string {
  if (dateKey === "Unknown") return "Unknown Date";
  const date = new Date(dateKey + "T00:00:00");
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export const TimelineView = ({
  results,
  query,
  environmentId,
  selectedIds,
  onToggleSelect,
  onFindSimilar,
}: TimelineViewProps) => {
  const groupedByDate = useMemo(() => {
    const sorted = [...results].sort(
      (a, b) => new Date(b.collected_at).getTime() - new Date(a.collected_at).getTime()
    );
    return groupByDate(sorted);
  }, [results]);

  if (results.length === 0) return null;

  return (
    <div className="space-y-6">
      {Array.from(groupedByDate.entries()).map(([dateKey, dateResults]) => (
        <div key={dateKey}>
          {/* Date header */}
          <div className="mb-3 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <h3 className="shrink-0 text-xs font-semibold text-slate-500">{formatDateHeader(dateKey)}</h3>
            <span className="text-xs text-slate-400">({dateResults.length})</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Results for this date */}
          <div className="space-y-2">
            {dateResults.map((result) => (
              <SearchResultCard
                key={result.feedback_record_id}
                result={result}
                query={query}
                environmentId={environmentId}
                isSelected={selectedIds.has(result.feedback_record_id)}
                onToggleSelect={() => onToggleSelect(result.feedback_record_id)}
                onFindSimilar={onFindSimilar}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

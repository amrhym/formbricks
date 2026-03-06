"use client";

import { XIcon } from "lucide-react";
import { Button } from "@/modules/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/ui/components/select";
import type { SearchFilters } from "../types";

interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (f: SearchFilters) => void;
  surveys: Array<{ id: string; name: string }>;
}

export const SearchFiltersPanel = ({ filters, onFiltersChange, surveys }: SearchFiltersProps) => {
  const hasFilters = filters.sourceId || filters.since || filters.until || filters.minScore !== undefined;

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Survey filter */}
      <div className="min-w-[160px]">
        <label className="mb-1 block text-xs font-medium text-slate-500">Survey</label>
        <Select
          value={filters.sourceId ?? "all"}
          onValueChange={(val) => onFiltersChange({ ...filters, sourceId: val === "all" ? undefined : val })}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="All Surveys" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Surveys</SelectItem>
            {surveys.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Since date */}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Since</label>
        <input
          type="date"
          className="h-8 rounded-md border border-slate-300 px-2 text-xs text-slate-700 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 focus:outline-none"
          value={filters.since ? filters.since.split("T")[0] : ""}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              since: e.target.value ? new Date(e.target.value).toISOString() : undefined,
            })
          }
        />
      </div>

      {/* Until date */}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Until</label>
        <input
          type="date"
          className="h-8 rounded-md border border-slate-300 px-2 text-xs text-slate-700 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 focus:outline-none"
          value={filters.until ? filters.until.split("T")[0] : ""}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              until: e.target.value ? new Date(e.target.value).toISOString() : undefined,
            })
          }
        />
      </div>

      {/* Min score slider */}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">
          Min Score: {Math.round((filters.minScore ?? 0) * 100)}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          className="h-8 w-28 accent-slate-600"
          value={Math.round((filters.minScore ?? 0) * 100)}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              minScore: Number(e.target.value) / 100,
            })
          }
        />
      </div>

      {/* Clear filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFiltersChange({})}
          className="text-xs text-slate-500">
          <XIcon className="h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  );
};

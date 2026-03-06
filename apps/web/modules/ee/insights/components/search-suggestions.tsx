"use client";

import { ClockIcon, FilterIcon } from "lucide-react";
import { Button } from "@/modules/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/modules/ui/components/popover";

interface SearchSuggestionsProps {
  recentSearches: string[];
  sourceNames: string[];
  onSelectSearch: (q: string) => void;
  onSelectSource: (sourceId: string) => void;
}

export const SearchSuggestions = ({
  recentSearches,
  sourceNames,
  onSelectSearch,
  onSelectSource,
}: SearchSuggestionsProps) => {
  const hasContent = recentSearches.length > 0 || sourceNames.length > 0;

  if (!hasContent) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs text-slate-500">
          <FilterIcon className="h-3.5 w-3.5" />
          Suggestions
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        {recentSearches.length > 0 && (
          <div className="border-b border-slate-100 p-3">
            <p className="mb-2 text-xs font-medium text-slate-500">Recent Searches</p>
            <div className="space-y-1">
              {recentSearches.map((search) => (
                <button
                  key={search}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => onSelectSearch(search)}>
                  <ClockIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{search}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {sourceNames.length > 0 && (
          <div className="p-3">
            <p className="mb-2 text-xs font-medium text-slate-500">Quick Filters</p>
            <div className="flex flex-wrap gap-1.5">
              {sourceNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                  onClick={() => onSelectSource(name)}>
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

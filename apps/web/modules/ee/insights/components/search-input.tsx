"use client";

import { ClockIcon, Loader2, SearchIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/modules/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/modules/ui/components/popover";

interface SearchInputProps {
  query: string;
  onQueryChange: (q: string) => void;
  onSearch: () => void;
  isSearching: boolean;
  recentSearches: string[];
}

export const SearchInput = ({
  query,
  onQueryChange,
  onSearch,
  isSearching,
  recentSearches,
}: SearchInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const showRecent = recentSearches.length > 0 && query === "";

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setPopoverOpen(false);
      onSearch();
    }
  };

  const handleRecentClick = (term: string) => {
    onQueryChange(term);
    setPopoverOpen(false);
    // Trigger search on next tick after query is set
    setTimeout(() => onSearch(), 0);
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (showRecent) {
      setPopoverOpen(true);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onQueryChange(val);
    if (val === "" && isFocused && recentSearches.length > 0) {
      setPopoverOpen(true);
    } else {
      setPopoverOpen(false);
    }
  };

  return (
    <div className="flex gap-3">
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <div className="relative flex-1">
            <SearchIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-4 pl-10 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 focus:outline-none"
              placeholder="Search feedback by meaning... (e.g. 'customer satisfaction with delivery')"
              value={query}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              disabled={isSearching}
            />
          </div>
        </PopoverTrigger>
        {showRecent && (
          <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-2">
            <div className="mb-1.5 px-2 text-xs font-medium text-slate-400">Recent searches</div>
            {recentSearches.map((term) => (
              <button
                key={term}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur from closing popover
                  handleRecentClick(term);
                }}>
                <ClockIcon className="h-3.5 w-3.5 text-slate-400" />
                {term}
              </button>
            ))}
          </PopoverContent>
        )}
      </Popover>
      <Button size="sm" onClick={onSearch} disabled={isSearching || !query.trim()}>
        {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
      </Button>
    </div>
  );
};

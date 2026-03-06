"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { findSimilarAction, semanticSearchAction } from "@/modules/ee/insights/actions";
import type { SearchFilters, SearchResult } from "../types";

const RECENT_SEARCHES_KEY = "semantic-search-recent";
const MAX_RECENT_SEARCHES = 10;

function loadRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
}

function saveRecentSearches(searches: string[]) {
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
  } catch {
    // localStorage may be unavailable
  }
}

export interface UseSemanticSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  results: SearchResult[];
  isSearching: boolean;
  hasSearched: boolean;
  error: string | null;
  nextCursor: string | null;
  filters: SearchFilters;
  setFilters: (f: SearchFilters) => void;
  recentSearches: string[];
  selectedIds: Set<string>;
  toggleSelected: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  search: () => Promise<void>;
  loadMore: () => Promise<void>;
  findSimilar: (recordId: string) => Promise<SearchResult[]>;
  clearResults: () => void;
}

export function useSemanticSearch(environmentId: string): UseSemanticSearchReturn {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [recentSearches, setRecentSearches] = useState<string[]>(loadRecentSearches);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Keep a ref to the latest query for loadMore (prevents stale closure).
  const queryRef = useRef(query);
  queryRef.current = query;

  const addRecentSearch = useCallback(
    (q: string) => {
      const updated = [q, ...recentSearches.filter((s) => s !== q)].slice(0, MAX_RECENT_SEARCHES);
      setRecentSearches(updated);
      saveRecentSearches(updated);
    },
    [recentSearches]
  );

  const search = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsSearching(true);
    setError(null);
    setHasSearched(true);
    setSelectedIds(new Set());

    try {
      const response = await semanticSearchAction({
        environmentId,
        query: trimmed,
        limit: 20,
        sourceId: filters.sourceId,
        since: filters.since,
        until: filters.until,
      });

      if (response?.data) {
        setResults(response.data.data);
        setNextCursor(response.data.next_cursor ?? null);
        addRecentSearch(trimmed);
      } else {
        setResults([]);
        setNextCursor(null);
        if (response?.serverError) {
          setError("Search failed. Please try again.");
        }
      }
    } catch {
      setError("Search failed. Please try again.");
      setResults([]);
      setNextCursor(null);
    } finally {
      setIsSearching(false);
    }
  }, [query, environmentId, filters, addRecentSearch]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);

    try {
      const response = await semanticSearchAction({
        environmentId,
        query: queryRef.current.trim(),
        limit: 20,
        sourceId: filters.sourceId,
        since: filters.since,
        until: filters.until,
        cursor: nextCursor,
      });

      if (response?.data?.data) {
        setResults((prev) => [...prev, ...response.data!.data]);
        setNextCursor(response.data!.next_cursor ?? null);
      }
    } catch {
      setError("Failed to load more results.");
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextCursor, isLoadingMore, environmentId, filters]);

  const findSimilar = useCallback(
    async (recordId: string): Promise<SearchResult[]> => {
      const response = await findSimilarAction({
        environmentId,
        feedbackRecordId: recordId,
        limit: 10,
      });

      if (response?.data) {
        return response.data.data;
      }

      return [];
    },
    [environmentId]
  );

  const clearResults = useCallback(() => {
    setResults([]);
    setHasSearched(false);
    setError(null);
    setNextCursor(null);
    setSelectedIds(new Set());
  }, []);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(results.map((r) => r.feedback_record_id)));
  }, [results]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return useMemo(
    () => ({
      query,
      setQuery,
      results,
      isSearching: isSearching || isLoadingMore,
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
      clearResults,
    }),
    [
      query,
      results,
      isSearching,
      isLoadingMore,
      hasSearched,
      error,
      nextCursor,
      filters,
      recentSearches,
      selectedIds,
      toggleSelected,
      selectAll,
      clearSelection,
      search,
      loadMore,
      findSimilar,
      clearResults,
    ]
  );
}

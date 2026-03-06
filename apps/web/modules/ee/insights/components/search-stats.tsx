"use client";

import { BarChart3Icon, SearchIcon, SmileIcon, TrendingUpIcon } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/modules/ui/components/badge";
import type { SearchResult } from "../types";

interface SearchStatsProps {
  results: SearchResult[];
}

const stripHtml = (html: string): string => html.replace(/<[^>]*>/g, "").trim();

const formatScore = (score: number): string => `${(score * 100).toFixed(1)}%`;

export const SearchStats = ({ results }: SearchStatsProps) => {
  const stats = useMemo(() => {
    if (results.length === 0) return null;

    const scores = results.map((r) => r.score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const highRelevance = scores.filter((s) => s >= 0.7).length;
    const medRelevance = scores.filter((s) => s >= 0.4 && s < 0.7).length;
    const lowRelevance = scores.filter((s) => s < 0.4).length;
    const uniqueQuestions = new Set(results.map((r) => stripHtml(r.field_label)).filter(Boolean)).size;

    // Sentiment breakdown
    const positive = results.filter((r) => r.sentiment === "positive").length;
    const negative = results.filter((r) => r.sentiment === "negative").length;
    const neutral = results.filter((r) => r.sentiment === "neutral").length;
    const hasSentiment = positive > 0 || negative > 0 || neutral > 0;

    return {
      avg,
      max,
      min,
      highRelevance,
      medRelevance,
      lowRelevance,
      uniqueQuestions,
      positive,
      negative,
      neutral,
      hasSentiment,
    };
  }, [results]);

  if (!stats) return null;

  return (
    <div className={`grid grid-cols-2 gap-3 ${stats.hasSentiment ? "sm:grid-cols-5" : "sm:grid-cols-4"}`}>
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
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {stats.highRelevance > 0 && (
            <Badge text={`${stats.highRelevance} high`} type="success" size="tiny" />
          )}
          {stats.medRelevance > 0 && <Badge text={`${stats.medRelevance} med`} type="warning" size="tiny" />}
          {stats.lowRelevance > 0 && <Badge text={`${stats.lowRelevance} low`} type="gray" size="tiny" />}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <TrendingUpIcon className="h-3.5 w-3.5" />
          Best Match
        </div>
        <p className="mt-1 text-lg font-semibold text-slate-800">{formatScore(stats.max)}</p>
        <p className="mt-0.5 truncate text-xs text-slate-400">{stripHtml(results[0].field_label) || "—"}</p>
      </div>

      {stats.hasSentiment && (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <SmileIcon className="h-3.5 w-3.5" />
            Sentiment
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {stats.positive > 0 && <Badge text={`${stats.positive} positive`} type="success" size="tiny" />}
            {stats.neutral > 0 && <Badge text={`${stats.neutral} neutral`} type="gray" size="tiny" />}
            {stats.negative > 0 && <Badge text={`${stats.negative} negative`} type="error" size="tiny" />}
          </div>
        </div>
      )}
    </div>
  );
};

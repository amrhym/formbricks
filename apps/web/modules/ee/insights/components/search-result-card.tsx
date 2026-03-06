"use client";

import { SearchIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/modules/ui/components/badge";
import { Button } from "@/modules/ui/components/button";
import type { SearchResult } from "../types";

interface SearchResultCardProps {
  result: SearchResult;
  query: string;
  environmentId: string;
  isSelected: boolean;
  onToggleSelect: () => void;
  onFindSimilar: (recordId: string) => void;
}

const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>/g, "").trim();
};

const formatScore = (score: number): string => {
  return `${(score * 100).toFixed(1)}%`;
};

const getScoreBadgeType = (score: number): "success" | "warning" | "gray" => {
  if (score >= 0.7) return "success";
  if (score >= 0.4) return "warning";
  return "gray";
};

const getSentimentBadgeType = (sentiment: string): "success" | "error" | "gray" => {
  const s = sentiment.toLowerCase();
  if (s === "positive") return "success";
  if (s === "negative") return "error";
  return "gray";
};

function highlightText(text: string, query: string): ReactNode {
  if (!query.trim()) return text;

  const words = query
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  if (words.length === 0) return text;

  const escapedWords = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escapedWords.join("|")})`, "gi");
  const parts = text.split(pattern);

  return parts.map((part, i) => {
    // Check if this part matches any query word (case-insensitive).
    const isMatch = words.some((w) => part.toLowerCase() === w.toLowerCase());
    if (isMatch) {
      return (
        <mark key={i} className="bg-yellow-100">
          {part}
        </mark>
      );
    }
    return part;
  });
}

const formatDate = (dateStr: string): string => {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const truncate = (str: string, maxLen: number): string => {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + "...";
};

export const SearchResultCard = ({
  result,
  query,
  environmentId,
  isSelected,
  onToggleSelect,
  onFindSimilar,
}: SearchResultCardProps) => {
  const fieldLabel = stripHtml(result.field_label);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300">
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
        />

        <div className="min-w-0 flex-1">
          {/* Question Label */}
          {fieldLabel && <p className="mb-1 text-xs font-medium text-slate-500">{fieldLabel}</p>}

          {/* Answer Text with highlighting */}
          <p className="text-sm leading-relaxed text-slate-800">
            {result.value_text ? highlightText(result.value_text, query) : "(no text)"}
          </p>

          {/* Metadata line */}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <Link
              href={`/environments/${environmentId}/surveys/${result.source_id}/summary`}
              className="text-slate-500 underline hover:text-slate-700">
              {result.source_name}
            </Link>
            {result.collected_at && <span>{formatDate(result.collected_at)}</span>}
            {result.submission_id && <span>ID: {truncate(result.submission_id, 8)}</span>}
          </div>
        </div>

        {/* Badges + Actions */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge text={formatScore(result.score)} type={getScoreBadgeType(result.score)} size="tiny" />
          {result.sentiment && result.sentiment.trim() !== "" && (
            <Badge text={result.sentiment} type={getSentimentBadgeType(result.sentiment)} size="tiny" />
          )}
          <Button
            size="sm"
            variant="ghost"
            className="mt-1 h-7 px-2 text-xs text-slate-500"
            onClick={() => onFindSimilar(result.feedback_record_id)}>
            <SearchIcon className="mr-1 h-3 w-3" />
            Similar
          </Button>
        </div>
      </div>
    </div>
  );
};

"use client";

import { Loader2 } from "lucide-react";
import { Badge } from "@/modules/ui/components/badge";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/modules/ui/components/dialog";
import type { SearchResult } from "../types";

interface SimilarModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: SearchResult[];
  isLoading: boolean;
  sourceResult: SearchResult | null;
  environmentId: string;
}

const stripHtml = (html: string): string => html.replace(/<[^>]*>/g, "").trim();

const formatScore = (score: number): string => `${(score * 100).toFixed(1)}%`;

const getScoreBadgeType = (score: number): "success" | "warning" | "gray" => {
  if (score >= 0.7) return "success";
  if (score >= 0.4) return "warning";
  return "gray";
};

const getSentimentBadgeType = (sentiment: string): "success" | "error" | "gray" => {
  if (sentiment === "positive") return "success";
  if (sentiment === "negative") return "error";
  return "gray";
};

export const SimilarModal = ({ isOpen, onClose, results, isLoading, sourceResult }: SimilarModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent width="wide">
        <DialogHeader>
          <DialogTitle>Find Similar Feedback</DialogTitle>
        </DialogHeader>

        <DialogBody>
          {/* Source result */}
          {sourceResult && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="mb-1 text-xs font-medium text-blue-600">Source feedback</p>
              {sourceResult.field_label && (
                <p className="mb-0.5 text-xs text-slate-500">{stripHtml(sourceResult.field_label)}</p>
              )}
              <p className="text-sm text-slate-800">{sourceResult.value_text || "(no text)"}</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge
                  text={formatScore(sourceResult.score)}
                  type={getScoreBadgeType(sourceResult.score)}
                  size="tiny"
                />
                {sourceResult.sentiment && (
                  <Badge
                    text={sourceResult.sentiment}
                    type={getSentimentBadgeType(sourceResult.sentiment)}
                    size="tiny"
                  />
                )}
                {sourceResult.source_name && (
                  <span className="text-xs text-slate-400">{sourceResult.source_name}</span>
                )}
              </div>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          )}

          {/* Similar results */}
          {!isLoading && results.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500">
                {results.length} similar result{results.length !== 1 ? "s" : ""}
              </p>
              {results.map((result) => (
                <div
                  key={result.feedback_record_id}
                  className="rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:border-slate-300">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {result.field_label && (
                        <p className="mb-0.5 text-xs text-slate-500">{stripHtml(result.field_label)}</p>
                      )}
                      <p className="text-sm text-slate-800">{result.value_text || "(no text)"}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        {result.source_name && (
                          <span className="text-xs text-slate-400">{result.source_name}</span>
                        )}
                        {result.collected_at && (
                          <span className="text-xs text-slate-400">
                            {new Date(result.collected_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge
                        text={formatScore(result.score)}
                        type={getScoreBadgeType(result.score)}
                        size="tiny"
                      />
                      {result.sentiment && (
                        <Badge
                          text={result.sentiment}
                          type={getSentimentBadgeType(result.sentiment)}
                          size="tiny"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && results.length === 0 && (
            <div className="flex h-32 items-center justify-center text-sm text-slate-400">
              No similar feedback found.
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};

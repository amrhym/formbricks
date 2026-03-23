"use client";

import { BrainCircuitIcon, Loader2, SparklesIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { generateInsightsAction } from "@/modules/ai/actions";
import { Button } from "@/modules/ui/components/button";

interface AiInsightsPanelProps {
  surveyId: string;
}

/**
 * Parse markdown-like AI output into styled React elements.
 */
const renderInsights = (text: string) => {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      elements.push(<div key={i} className="h-2" />);
      continue;
    }

    // ## or ### headings
    if (trimmed.startsWith("### ")) {
      elements.push(
        <h4 key={i} className="mb-1.5 mt-4 text-sm font-bold text-slate-800">
          {trimmed.replace(/^###\s*/, "")}
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      elements.push(
        <h3 key={i} className="mb-2 mt-5 text-base font-bold text-slate-900">
          {trimmed.replace(/^##\s*/, "")}
        </h3>
      );
      continue;
    }

    // **Bold heading lines** (standalone bold text = section header)
    if (/^\*\*[^*]+\*\*:?$/.test(trimmed)) {
      const headerText = trimmed.replace(/\*\*/g, "").replace(/:$/, "");
      const sectionColors: Record<string, string> = {
        overview: "text-blue-700 border-blue-200 bg-blue-50",
        "key metrics": "text-emerald-700 border-emerald-200 bg-emerald-50",
        "top themes": "text-amber-700 border-amber-200 bg-amber-50",
        "actionable insights": "text-purple-700 border-purple-200 bg-purple-50",
        alerts: "text-red-700 border-red-200 bg-red-50",
        recommendations: "text-purple-700 border-purple-200 bg-purple-50",
        summary: "text-blue-700 border-blue-200 bg-blue-50",
      };
      const colorKey = Object.keys(sectionColors).find((k) => headerText.toLowerCase().includes(k));
      const colorClass = colorKey ? sectionColors[colorKey] : "text-slate-700 border-slate-200 bg-slate-50";

      const emojis: Record<string, string> = {
        overview: "📊",
        "key metrics": "📈",
        "top themes": "💡",
        "actionable insights": "🎯",
        alerts: "🚨",
        recommendations: "✅",
        summary: "📋",
        positive: "😊",
        negative: "😟",
        trends: "📉",
      };
      const emojiKey = Object.keys(emojis).find((k) => headerText.toLowerCase().includes(k));
      const emoji = emojiKey ? emojis[emojiKey] : "📌";

      elements.push(
        <div key={i} className={`mb-2 mt-4 rounded-md border px-3 py-2 ${colorClass}`}>
          <span className="text-sm font-semibold">
            {emoji} {headerText}
          </span>
        </div>
      );
      continue;
    }

    // Numbered list items (1. 2. 3.)
    if (/^\d+\.\s/.test(trimmed)) {
      const content = trimmed.replace(/^\d+\.\s*/, "");
      elements.push(
        <div key={i} className="ml-4 flex items-start gap-2 py-0.5">
          <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">
            {trimmed.match(/^(\d+)/)?.[1]}
          </span>
          <span className="text-sm text-slate-700">{renderInlineFormatting(content)}</span>
        </div>
      );
      continue;
    }

    // Bullet points (- or *)
    if (/^[-*]\s/.test(trimmed)) {
      const content = trimmed.replace(/^[-*]\s*/, "");
      const isPositive =
        content.toLowerCase().includes("positive") ||
        content.toLowerCase().includes("high") ||
        content.toLowerCase().includes("good") ||
        content.toLowerCase().includes("excellent");
      const isNegative =
        content.toLowerCase().includes("negative") ||
        content.toLowerCase().includes("low") ||
        content.toLowerCase().includes("poor") ||
        content.toLowerCase().includes("concern") ||
        content.toLowerCase().includes("issue");

      const bulletColor = isPositive ? "text-emerald-500" : isNegative ? "text-red-400" : "text-slate-400";

      elements.push(
        <div key={i} className="ml-3 flex items-start gap-2 py-0.5">
          <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${bulletColor} bg-current`} />
          <span className="text-sm text-slate-700">{renderInlineFormatting(content)}</span>
        </div>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-sm leading-relaxed text-slate-700">
        {renderInlineFormatting(trimmed)}
      </p>
    );
  }

  return elements;
};

/**
 * Handle inline **bold** and *italic* formatting.
 */
const renderInlineFormatting = (text: string): React.ReactNode => {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={i} className="text-slate-600">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
};

export const AiInsightsPanel = ({ surveyId }: AiInsightsPanelProps) => {
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseCount, setResponseCount] = useState(0);

  const generateInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateInsightsAction(surveyId);
      if (!result) {
        setError("No response from AI service");
        return;
      }
      if (result.ok) {
        setInsights(result.insights.summary);
        setResponseCount(result.insights.responseCount);
      } else {
        setError(result.error || "Unknown error");
      }
    } catch (err: any) {
      setError(String(err?.message || err || "Failed to generate insights"));
    } finally {
      setLoading(false);
    }
  };

  const renderedInsights = useMemo(() => {
    if (!insights) return null;
    return renderInsights(insights);
  }, [insights]);

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
            <BrainCircuitIcon className="h-4.5 w-4.5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">AI Insights</h3>
            {responseCount > 0 && (
              <p className="text-xs text-slate-500">Based on {responseCount} responses</p>
            )}
          </div>
        </div>
        <Button
          size="sm"
          onClick={generateInsights}
          disabled={loading}
          className={
            insights
              ? "border-purple-200 bg-white text-purple-700 hover:bg-purple-50"
              : "bg-purple-600 text-white hover:bg-purple-700"
          }
          variant={insights ? "secondary" : "default"}>
          {loading ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Analyzing...
            </>
          ) : insights ? (
            <>
              <SparklesIcon className="mr-1.5 h-3.5 w-3.5" />
              Regenerate
            </>
          ) : (
            <>
              <SparklesIcon className="mr-1.5 h-3.5 w-3.5" />
              Generate Insights
            </>
          )}
        </Button>
      </div>
      <div className="px-5 py-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">⚠️ {error}</p>
          </div>
        )}
        {!insights && !error && !loading && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-50">
              <SparklesIcon className="h-6 w-6 text-purple-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">No insights generated yet</p>
            <p className="mt-1 text-xs text-slate-400">
              Click &quot;Generate Insights&quot; to analyze your survey responses with AI
            </p>
          </div>
        )}
        {loading && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-purple-500" />
            <p className="text-sm font-medium text-slate-600">Analyzing responses...</p>
            <p className="mt-1 text-xs text-slate-400">This may take a few seconds</p>
          </div>
        )}
        {insights && !loading && <div className="space-y-0.5">{renderedInsights}</div>}
      </div>
    </div>
  );
};

"use client";

import { BrainCircuitIcon, Loader2, SparklesIcon } from "lucide-react";
import { useState } from "react";
import { generateInsightsAction } from "@/modules/ai/actions";
import { Button } from "@/modules/ui/components/button";

interface AiInsightsPanelProps {
  surveyId: string;
}

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
      if (result) {
        setInsights(result.summary);
        setResponseCount(result.responseCount);
      } else {
        setError("No responses found to analyze");
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate insights");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <BrainCircuitIcon className="h-5 w-5 text-purple-600" />
          <h3 className="text-sm font-semibold text-slate-800">AI Insights</h3>
        </div>
        <Button size="sm" variant="secondary" onClick={generateInsights} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <SparklesIcon className="mr-1 h-3 w-3" />
              Generate
            </>
          )}
        </Button>
      </div>
      <div className="p-4">
        {error && <p className="text-sm text-red-500">{error}</p>}
        {!insights && !error && !loading && (
          <p className="text-sm text-slate-500">
            Click &quot;Generate&quot; to get AI-powered insights from your survey responses.
          </p>
        )}
        {insights && (
          <div>
            <p className="mb-3 text-xs text-slate-400">Based on {responseCount} responses</p>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm text-slate-700">
              {insights}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

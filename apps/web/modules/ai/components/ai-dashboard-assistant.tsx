"use client";

import { BotIcon, CopyIcon, Loader2, SendIcon } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { dashboardQueryAction } from "@/modules/ai/actions";
import { Button } from "@/modules/ui/components/button";
import { Input } from "@/modules/ui/components/input";

interface QueryResult {
  sql: string;
  chartType: string;
  title: string;
  explanation: string;
}

export const AiDashboardAssistant = () => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [history, setHistory] = useState<{ query: string; result: QueryResult }[]>([]);

  const askQuestion = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const actionResult = await dashboardQueryAction(query);
      if (!actionResult.ok) {
        toast.error(actionResult.error);
        return;
      }
      setResult(actionResult.result);
      setHistory((prev) => [{ query, result: actionResult.result }, ...prev]);
      setQuery("");
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const copySql = (sql: string) => {
    navigator.clipboard.writeText(sql);
    toast.success("SQL copied to clipboard");
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
        <BotIcon className="h-5 w-5 text-purple-600" />
        <h3 className="text-sm font-semibold text-slate-800">AI Dashboard Assistant</h3>
      </div>
      <div className="p-4">
        <p className="mb-3 text-xs text-slate-500">
          Ask questions in natural language and get SQL queries for your dashboards.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. Show me NPS score by month for the last 6 months"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && askQuestion()}
            className="flex-1"
          />
          <Button size="sm" onClick={askQuestion} disabled={loading || !query.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {[
            "Response count per survey",
            "Average rating this month",
            "NPS trend by week",
            "Top tags by count",
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setQuery(suggestion)}
              className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-50">
              {suggestion}
            </button>
          ))}
        </div>
        {result && (
          <div className="mt-4 space-y-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">{result.title}</span>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700">
                    {result.chartType}
                  </span>
                  <button onClick={() => copySql(result.sql)} className="text-slate-400 hover:text-slate-600">
                    <CopyIcon className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <pre className="overflow-x-auto rounded bg-slate-900 p-2 text-xs text-green-400">
                {result.sql}
              </pre>
            </div>
            <p className="text-xs text-slate-400">
              Copy this SQL into Superset &gt; SQL Lab to create a chart, or use it in a new dataset.
            </p>
          </div>
        )}
        {history.length > 1 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-slate-500">History</p>
            <div className="max-h-40 space-y-2 overflow-y-auto">
              {history.slice(1).map((item, i) => (
                <div key={i} className="rounded border border-slate-100 p-2">
                  <p className="text-xs text-slate-600">{item.query}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-slate-400">{item.result.title}</span>
                    <button
                      onClick={() => copySql(item.result.sql)}
                      className="text-slate-400 hover:text-slate-600">
                      <CopyIcon className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

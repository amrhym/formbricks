"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  BarChart3Icon,
  CheckCircleIcon,
  FileTextIcon,
  MinusIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { getEnvironmentSurveyMetricsAction } from "@/modules/survey/list/actions";
import type { TEnvironmentSurveyMetrics } from "@/modules/survey/list/lib/metrics";

interface EnvironmentMetricsDashboardProps {
  environmentId: string;
}

const MetricCard = ({
  label,
  value,
  subValue,
  icon,
  isLoading,
}: {
  label: string;
  value: React.ReactNode;
  subValue?: React.ReactNode;
  icon?: React.ReactNode;
  isLoading: boolean;
}) => (
  <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between">
      <p className="text-sm text-slate-600">{label}</p>
      {icon && <span className="text-slate-400">{icon}</span>}
    </div>
    {isLoading ? (
      <div className="mt-2 h-7 w-16 animate-pulse rounded-md bg-slate-200" />
    ) : (
      <div className="mt-2">
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        {subValue && <div className="mt-1">{subValue}</div>}
      </div>
    )}
  </div>
);

const TrendIndicator = ({ trend }: { trend: number }) => {
  if (trend === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-slate-500">
        <MinusIcon className="h-3 w-3" />
        No change
      </span>
    );
  }

  const isPositive = trend > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        isPositive ? "text-emerald-600" : "text-red-500"
      )}>
      {isPositive ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />}
      {Math.abs(trend)}% vs last month
    </span>
  );
};

const DailyResponsesChart = ({
  data,
  isLoading,
}: {
  data: { date: string; count: number }[];
  isLoading: boolean;
}) => {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm text-slate-600">Daily Responses (Last 30 Days)</p>
        <div className="flex h-24 items-end gap-px">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="flex-1 animate-pulse rounded-t bg-slate-200" style={{ height: "40%" }} />
          ))}
        </div>
      </div>
    );
  }

  const totalResponses = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3Icon className="h-4 w-4 text-slate-400" />
          <p className="text-sm text-slate-600">Daily Responses (Last 30 Days)</p>
        </div>
        <p className="text-xs text-slate-400">{totalResponses} total</p>
      </div>
      <div className="flex h-24 items-end gap-px">
        {data.map((day) => {
          const height = maxCount > 0 ? Math.max((day.count / maxCount) * 100, day.count > 0 ? 4 : 0) : 0;
          return (
            <div key={day.date} className="group relative flex-1" title={`${day.date}: ${day.count}`}>
              <div
                className="w-full rounded-t bg-slate-300 transition-colors group-hover:bg-slate-500"
                style={{ height: `${height}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>{data[0]?.date.slice(5)}</span>
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
};

const StatusBreakdown = ({
  counts,
  isLoading,
}: {
  counts: TEnvironmentSurveyMetrics["surveyStatusCounts"];
  isLoading: boolean;
}) => {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm text-slate-600">Survey Status</p>
        <div className="h-3 w-full animate-pulse rounded-full bg-slate-200" />
      </div>
    );
  }

  const total = counts.total || 1;
  const segments = [
    { label: "Active", count: counts.inProgress, color: "bg-emerald-500" },
    { label: "Draft", count: counts.draft, color: "bg-slate-300" },
    { label: "Completed", count: counts.completed, color: "bg-blue-400" },
    { label: "Paused", count: counts.paused, color: "bg-amber-400" },
    { label: "In Review", count: counts.underReview, color: "bg-purple-400" },
  ].filter((s) => s.count > 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-600">Survey Status</p>
        <p className="text-xs text-slate-400">{counts.total} total</p>
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
        {segments.map((seg) => (
          <div
            key={seg.label}
            className={cn("h-full transition-all", seg.color)}
            style={{ width: `${(seg.count / total) * 100}%` }}
            title={`${seg.label}: ${seg.count}`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1.5 text-xs text-slate-600">
            <div className={cn("h-2 w-2 rounded-full", seg.color)} />
            <span>
              {seg.label}: {seg.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const EnvironmentMetricsDashboard = ({ environmentId }: EnvironmentMetricsDashboardProps) => {
  const [metrics, setMetrics] = useState<TEnvironmentSurveyMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    const fetchMetrics = async () => {
      setIsLoading(true);
      try {
        const result = await getEnvironmentSurveyMetricsAction({ environmentId });
        if (result?.data) {
          setMetrics(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch environment metrics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, [environmentId]);

  const emptyMetrics: TEnvironmentSurveyMetrics = {
    surveyStatusCounts: { draft: 0, inProgress: 0, completed: 0, paused: 0, underReview: 0, total: 0 },
    responsesThisMonth: 0,
    responsesLastMonth: 0,
    responsesTrend: 0,
    averageResponseRate: 0,
    averageCompletionRate: 0,
    dailyResponses: [],
  };

  const data = metrics ?? emptyMetrics;

  return (
    <div className="mb-6 space-y-4 px-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={t("common.surveys")}
          value={data.surveyStatusCounts.total}
          subValue={
            !isLoading && (
              <span className="text-xs text-slate-500">{data.surveyStatusCounts.inProgress} active</span>
            )
          }
          icon={<FileTextIcon className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <MetricCard
          label="Responses This Month"
          value={data.responsesThisMonth}
          subValue={!isLoading && <TrendIndicator trend={data.responsesTrend} />}
          icon={<BarChart3Icon className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <MetricCard
          label="Response Rate"
          value={`${data.averageResponseRate}%`}
          subValue={!isLoading && <span className="text-xs text-slate-500">responses / impressions</span>}
          isLoading={isLoading}
        />
        <MetricCard
          label="Completion Rate"
          value={`${data.averageCompletionRate}%`}
          subValue={!isLoading && <span className="text-xs text-slate-500">finished / started</span>}
          icon={<CheckCircleIcon className="h-4 w-4" />}
          isLoading={isLoading}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatusBreakdown counts={data.surveyStatusCounts} isLoading={isLoading} />
        <DailyResponsesChart data={data.dailyResponses} isLoading={isLoading} />
      </div>
    </div>
  );
};

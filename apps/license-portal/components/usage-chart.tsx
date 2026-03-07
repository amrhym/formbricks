"use client";

import { cn } from "@/lib/utils";

interface UsageBarProps {
  label: string;
  current: number;
  max: number;
}

export function UsageBar({ label, current, max }: UsageBarProps) {
  const percentage = Math.min((current / max) * 100, 100);
  const isHigh = percentage > 80;
  const isCritical = percentage > 95;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">
          {current.toLocaleString()} / {max.toLocaleString()}
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-slate-100">
        <div
          className={cn(
            "h-2.5 rounded-full transition-all",
            isCritical ? "bg-red-500" : isHigh ? "bg-amber-500" : "bg-brand"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-slate-400">{percentage.toFixed(1)}% used</p>
    </div>
  );
}

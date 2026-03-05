"use client";

import { BarChart3Icon, MailIcon, SendIcon, UsersIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TCampaignWithRelations } from "@hivecfm/types/campaign";
import { cn } from "@/lib/cn";

interface CampaignMetricsDashboardProps {
  campaigns: TCampaignWithRelations[];
}

const MetricCard = ({
  label,
  value,
  subValue,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  subValue?: React.ReactNode;
  icon?: React.ReactNode;
}) => (
  <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between">
      <p className="text-sm text-slate-600">{label}</p>
      {icon && <span className="text-slate-400">{icon}</span>}
    </div>
    <div className="mt-2">
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      {subValue && <div className="mt-1">{subValue}</div>}
    </div>
  </div>
);

export const CampaignMetricsDashboard = ({ campaigns }: CampaignMetricsDashboardProps) => {
  const { t } = useTranslation();

  const totalCampaigns = campaigns.length;
  const sentCampaigns = campaigns.filter((c) => c.status === "sent").length;
  const totalRecipients = campaigns.reduce((sum, c) => sum + c.totalCount, 0);
  const totalSent = campaigns.reduce((sum, c) => sum + c.sentCount, 0);
  const totalFailed = campaigns.reduce((sum, c) => sum + c.failedCount, 0);
  const deliveryRate = totalRecipients > 0 ? Math.round((totalSent / totalRecipients) * 100) : 0;

  const statusCounts = {
    draft: campaigns.filter((c) => c.status === "draft").length,
    scheduled: campaigns.filter((c) => c.status === "scheduled").length,
    sending: campaigns.filter((c) => c.status === "sending").length,
    sent: sentCampaigns,
    failed: campaigns.filter((c) => c.status === "failed").length,
  };

  const statusSegments = [
    { label: "Sent", count: statusCounts.sent, color: "bg-emerald-500" },
    { label: "Draft", count: statusCounts.draft, color: "bg-slate-300" },
    { label: "Scheduled", count: statusCounts.scheduled, color: "bg-blue-400" },
    { label: "Sending", count: statusCounts.sending, color: "bg-amber-400" },
    { label: "Failed", count: statusCounts.failed, color: "bg-red-400" },
  ].filter((s) => s.count > 0);

  return (
    <div className="mb-6 space-y-4 px-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={t("common.campaigns")}
          value={totalCampaigns}
          subValue={<span className="text-xs text-slate-500">{sentCampaigns} sent</span>}
          icon={<MailIcon className="h-4 w-4" />}
        />
        <MetricCard
          label="Total Recipients"
          value={totalRecipients}
          subValue={<span className="text-xs text-slate-500">across all campaigns</span>}
          icon={<UsersIcon className="h-4 w-4" />}
        />
        <MetricCard
          label="Total Sent"
          value={totalSent}
          subValue={
            totalFailed > 0 ? (
              <span className="text-xs text-red-500">{totalFailed} failed</span>
            ) : (
              <span className="text-xs text-slate-500">0 failed</span>
            )
          }
          icon={<SendIcon className="h-4 w-4" />}
        />
        <MetricCard
          label="Delivery Rate"
          value={`${deliveryRate}%`}
          subValue={<span className="text-xs text-slate-500">sent / recipients</span>}
          icon={<BarChart3Icon className="h-4 w-4" />}
        />
      </div>
      {totalCampaigns > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-600">Campaign Status</p>
            <p className="text-xs text-slate-400">{totalCampaigns} total</p>
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
            {statusSegments.map((seg) => (
              <div
                key={seg.label}
                className={cn("h-full transition-all", seg.color)}
                style={{ width: `${(seg.count / totalCampaigns) * 100}%` }}
                title={`${seg.label}: ${seg.count}`}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {statusSegments.map((seg) => (
              <div key={seg.label} className="flex items-center gap-1.5 text-xs text-slate-600">
                <div className={cn("h-2 w-2 rounded-full", seg.color)} />
                <span>
                  {seg.label}: {seg.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

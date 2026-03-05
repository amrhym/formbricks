"use client";

import { useEffect, useState } from "react";
import type { TCampaignDetail, TCampaignNovuMessage, TCampaignNovuStats } from "@hivecfm/types/campaign";
import { getCampaignNovuStatsAction } from "@/modules/campaigns/actions";
import { Badge } from "@/modules/ui/components/badge";

interface CampaignDetailProps {
  campaign: TCampaignDetail;
}

const statusConfig: Record<string, { type: "warning" | "success" | "error" | "gray"; label: string }> = {
  draft: { type: "gray", label: "Draft" },
  scheduled: { type: "warning", label: "Scheduled" },
  sending: { type: "warning", label: "Sending" },
  sent: { type: "success", label: "Sent" },
  failed: { type: "error", label: "Failed" },
};

function formatDate(date: Date | string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatCard({
  label,
  value,
  isLoading,
}: {
  label: string;
  value: string | number;
  isLoading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      {isLoading ? (
        <div className="mt-1 h-8 w-16 animate-pulse rounded bg-slate-200" />
      ) : (
        <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
      )}
    </div>
  );
}

export const CampaignDetail = ({ campaign }: CampaignDetailProps) => {
  const [novuStats, setNovuStats] = useState<TCampaignNovuStats | null>(null);
  const [novuLoading, setNovuLoading] = useState(true);

  useEffect(() => {
    const fetchNovuStats = async () => {
      try {
        const result = await getCampaignNovuStatsAction({ campaignId: campaign.id });
        if (result?.data) {
          setNovuStats(result.data);
        }
      } catch {
        // Novu stats are best-effort
      } finally {
        setNovuLoading(false);
      }
    };

    fetchNovuStats();
  }, [campaign.id]);

  const status = statusConfig[campaign.status] ?? statusConfig.draft;

  // Build a lookup map: email -> Novu message
  const novuMessageMap = new Map<string, TCampaignNovuMessage>();
  if (novuStats?.messages) {
    for (const msg of novuStats.messages) {
      novuMessageMap.set(msg.email.toLowerCase(), msg);
    }
  }

  return (
    <div className="space-y-8">
      {/* Campaign Metadata */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge text={status.label} type={status.type} size="normal" />
        <Badge text={campaign.providerType === "sms" ? "SMS" : "Email"} type="gray" size="normal" />
        <span className="text-sm text-slate-600">
          Survey: <span className="font-medium">{campaign.survey.name}</span>
        </span>
        {campaign.segment && (
          <span className="text-sm text-slate-600">
            Segment: <span className="font-medium">{campaign.segment.title}</span>
          </span>
        )}
        <span className="text-sm text-slate-500">Created {formatDate(campaign.createdAt)}</span>
        {campaign.sentAt && (
          <span className="text-sm text-slate-500">Sent {formatDate(campaign.sentAt)}</span>
        )}
        {campaign.scheduledAt && campaign.status === "scheduled" && (
          <span className="text-sm text-slate-500">Scheduled {formatDate(campaign.scheduledAt)}</span>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total Recipients" value={campaign.totalCount} />
        <StatCard label="Sent" value={campaign.sentCount} />
        <StatCard label="Failed" value={campaign.failedCount} />
        <StatCard label="Delivered" value={novuStats?.delivered ?? "-"} isLoading={novuLoading} />
        <StatCard label="Seen / Opened" value={novuStats?.seen ?? "-"} isLoading={novuLoading} />
        <StatCard label="Read" value={novuStats?.read ?? "-"} isLoading={novuLoading} />
      </div>

      {/* Recipients Table */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Recipients</h2>
        {campaign.sends.length === 0 ? (
          <p className="text-sm text-slate-500">No recipients recorded for this campaign.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Recipient</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Novu Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Provider</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Sent At</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Seen</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Read</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {campaign.sends.map((send) => {
                    const novuMsg = novuMessageMap.get(send.recipient.toLowerCase());
                    return (
                      <tr key={send.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{send.recipient}</td>
                        <td className="px-4 py-3">
                          <Badge
                            text={send.status}
                            type={
                              send.status === "sent"
                                ? "success"
                                : send.status === "failed" || send.status === "bounced"
                                  ? "error"
                                  : "gray"
                            }
                            size="tiny"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {novuLoading ? (
                            <div className="h-4 w-12 animate-pulse rounded bg-slate-200" />
                          ) : novuMsg ? (
                            <Badge
                              text={novuMsg.status}
                              type={novuMsg.status === "sent" ? "success" : "error"}
                              size="tiny"
                            />
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {novuLoading ? (
                            <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
                          ) : (
                            novuMsg?.provider || "-"
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{formatDate(send.sentAt)}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {novuLoading ? (
                            <div className="h-4 w-8 animate-pulse rounded bg-slate-200" />
                          ) : novuMsg ? (
                            novuMsg.seen ? (
                              "Yes"
                            ) : (
                              "No"
                            )
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {novuLoading ? (
                            <div className="h-4 w-8 animate-pulse rounded bg-slate-200" />
                          ) : novuMsg ? (
                            novuMsg.read ? (
                              "Yes"
                            ) : (
                              "No"
                            )
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-red-600">{send.error || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

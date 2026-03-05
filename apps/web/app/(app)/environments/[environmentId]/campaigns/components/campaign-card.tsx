"use client";

import Link from "next/link";
import type { TCampaignWithRelations } from "@hivecfm/types/campaign";
import { cn } from "@/lib/cn";
import { convertDateString } from "@/lib/time";
import { CampaignDropdownMenu } from "./campaign-dropdown-menu";

interface CampaignCardProps {
  campaign: TCampaignWithRelations;
  environmentId: string;
  isReadOnly: boolean;
  onSend: (campaign: TCampaignWithRelations) => void;
  onDelete: (campaignId: string) => void;
  isDeleting: boolean;
}

const statusConfig: Record<string, { bgClass: string; label: string }> = {
  draft: { bgClass: "bg-slate-100", label: "Draft" },
  scheduled: { bgClass: "bg-amber-50", label: "Scheduled" },
  sending: { bgClass: "bg-amber-50", label: "Sending" },
  sent: { bgClass: "bg-emerald-50", label: "Sent" },
  failed: { bgClass: "bg-red-50", label: "Failed" },
};

export const CampaignCard = ({
  campaign,
  environmentId,
  isReadOnly,
  onSend,
  onDelete,
  isDeleting,
}: CampaignCardProps) => {
  const status = statusConfig[campaign.status] ?? statusConfig.draft;

  return (
    <Link href={`/environments/${environmentId}/campaigns/${campaign.id}`} className="relative block">
      <div className="grid w-full grid-cols-8 place-items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 pr-8 shadow-sm transition-colors ease-in-out hover:border-slate-400">
        <div className="col-span-2 flex max-w-full items-center justify-self-start text-sm font-medium text-slate-900">
          <div className="w-full truncate">{campaign.name}</div>
        </div>
        <div className="col-span-1 max-w-full overflow-hidden text-sm text-ellipsis whitespace-nowrap text-slate-600">
          {campaign.providerType === "sms" ? "SMS" : "Email"}
        </div>
        <div className="col-span-1 max-w-full overflow-hidden text-sm text-ellipsis whitespace-nowrap text-slate-600">
          {campaign.survey.name}
        </div>
        <div className="col-span-1 max-w-full overflow-hidden text-sm text-ellipsis whitespace-nowrap text-slate-600">
          {campaign.segment?.title ?? "-"}
        </div>
        <div
          className={cn(
            "col-span-1 flex w-fit items-center gap-2 rounded-full px-2 py-1 text-sm whitespace-nowrap text-slate-800",
            status.bgClass
          )}>
          {status.label}
        </div>
        <div className="col-span-1 max-w-full overflow-hidden text-sm text-ellipsis whitespace-nowrap text-slate-600">
          {campaign.sentCount}/{campaign.totalCount}
        </div>
        <div className="col-span-1 max-w-full overflow-hidden text-sm text-ellipsis whitespace-nowrap text-slate-600">
          {convertDateString(campaign.createdAt.toString())}
        </div>
      </div>
      {!isReadOnly && (
        <button className="absolute top-3.5 right-3" onClick={(e) => e.stopPropagation()}>
          <CampaignDropdownMenu
            campaign={campaign}
            onSend={onSend}
            onDelete={onDelete}
            isDeleting={isDeleting}
          />
        </button>
      )}
    </Link>
  );
};

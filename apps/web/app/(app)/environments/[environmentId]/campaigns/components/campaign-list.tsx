"use client";

import { PlusIcon, SendIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TCampaignWithRelations } from "@hivecfm/types/campaign";
import { getFormattedErrorMessage } from "@/lib/utils/helper";
import { deleteCampaignAction, getCampaignsAction } from "@/modules/campaigns/actions";
import { Badge } from "@/modules/ui/components/badge";
import { Button } from "@/modules/ui/components/button";
import { CreateCampaignDialog } from "./create-campaign-dialog";
import { SendCampaignDialog } from "./send-campaign-dialog";

interface CampaignListProps {
  environmentId: string;
  initialCampaigns: TCampaignWithRelations[];
  surveys: { id: string; name: string }[];
  segments: { id: string; title: string }[];
  isReadOnly: boolean;
}

const statusConfig: Record<string, { type: "warning" | "success" | "error" | "gray"; label: string }> = {
  draft: { type: "gray", label: "Draft" },
  scheduled: { type: "warning", label: "Scheduled" },
  sending: { type: "warning", label: "Sending" },
  sent: { type: "success", label: "Sent" },
  failed: { type: "error", label: "Failed" },
};

export const CampaignList = ({
  environmentId,
  initialCampaigns,
  surveys,
  segments,
  isReadOnly,
}: CampaignListProps) => {
  const { t } = useTranslation();
  const [campaigns, setCampaigns] = useState<TCampaignWithRelations[]>(initialCampaigns);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sendCampaign, setSendCampaign] = useState<TCampaignWithRelations | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const refreshCampaigns = async () => {
    const result = await getCampaignsAction({ environmentId });
    if (result?.data) {
      setCampaigns(result.data);
    }
  };

  const handleDelete = async (campaignId: string) => {
    setIsDeleting(campaignId);
    try {
      const result = await deleteCampaignAction({ campaignId });
      if (result?.data) {
        await refreshCampaigns();
      } else {
        const errorMessage = getFormattedErrorMessage(result);
        alert(errorMessage);
      }
    } finally {
      setIsDeleting(null);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        {!isReadOnly && (
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <PlusIcon className="mr-1 h-4 w-4" />
            {t("environments.campaigns.create_campaign")}
          </Button>
        )}
      </div>

      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 p-12 text-center">
          <SendIcon className="mb-4 h-12 w-12 text-slate-400" />
          <h3 className="mb-2 text-lg font-medium text-slate-700">
            {t("environments.campaigns.no_campaigns_yet")}
          </h3>
          <p className="mb-4 text-sm text-slate-500">
            {t("environments.campaigns.no_campaigns_description")}
          </p>
          {!isReadOnly && (
            <Button size="sm" onClick={() => setIsCreateOpen(true)}>
              <PlusIcon className="mr-1 h-4 w-4" />
              {t("environments.campaigns.create_campaign")}
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">
                  {t("environments.campaigns.name")}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Provider</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">
                  {t("common.surveys")}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Segment</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">
                  {t("environments.campaigns.sent")}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Created</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {campaigns.map((campaign) => {
                const status = statusConfig[campaign.status] ?? statusConfig.draft;
                return (
                  <tr key={campaign.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{campaign.name}</td>
                    <td className="px-4 py-3">
                      <Badge
                        text={campaign.providerType === "sms" ? "SMS" : "Email"}
                        type="gray"
                        size="tiny"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{campaign.survey.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{campaign.segment?.title ?? "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge text={status.label} type={status.type} size="tiny" />
                        {campaign.status === "scheduled" && campaign.scheduledAt && (
                          <span className="text-xs text-slate-500">{formatDate(campaign.scheduledAt)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {campaign.sentCount}/{campaign.totalCount}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatDate(campaign.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {!isReadOnly && (
                        <div className="flex items-center justify-end gap-2">
                          {(campaign.status === "draft" || campaign.status === "scheduled") && (
                            <Button size="sm" variant="secondary" onClick={() => setSendCampaign(campaign)}>
                              <SendIcon className="mr-1 h-3 w-3" />
                              {t("environments.campaigns.send_campaign")}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isDeleting === campaign.id}
                            onClick={() => handleDelete(campaign.id)}>
                            <TrashIcon className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <CreateCampaignDialog
        environmentId={environmentId}
        surveys={surveys}
        segments={segments}
        open={isCreateOpen}
        setOpen={setIsCreateOpen}
        onCreated={refreshCampaigns}
      />

      {sendCampaign && (
        <SendCampaignDialog
          campaign={sendCampaign}
          open={!!sendCampaign}
          setOpen={(open) => {
            if (!open) setSendCampaign(null);
          }}
          onSent={refreshCampaigns}
        />
      )}
    </div>
  );
};

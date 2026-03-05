"use client";

import { PlusIcon, SendIcon } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import type { TCampaignWithRelations } from "@hivecfm/types/campaign";
import { getFormattedErrorMessage } from "@/lib/utils/helper";
import { deleteCampaignAction, getCampaignsAction } from "@/modules/campaigns/actions";
import { Button } from "@/modules/ui/components/button";
import { CampaignCard } from "./campaign-card";
import { CampaignMetricsDashboard } from "./campaign-metrics-dashboard";
import { CreateCampaignDialog } from "./create-campaign-dialog";
import { SendCampaignDialog } from "./send-campaign-dialog";

interface CampaignListProps {
  environmentId: string;
  initialCampaigns: TCampaignWithRelations[];
  surveys: { id: string; name: string }[];
  segments: { id: string; title: string }[];
  isReadOnly: boolean;
}

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
        toast.success("Campaign deleted successfully");
        await refreshCampaigns();
      } else {
        const errorMessage = getFormattedErrorMessage(result);
        toast.error(errorMessage);
      }
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <CampaignMetricsDashboard campaigns={campaigns} />

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
        <div className="flex-col space-y-3">
          {!isReadOnly && (
            <div className="flex justify-end px-6">
              <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                <PlusIcon className="mr-1 h-4 w-4" />
                {t("environments.campaigns.create_campaign")}
              </Button>
            </div>
          )}
          <div className="mt-6 grid w-full grid-cols-8 place-items-center gap-3 px-6 pr-8 text-sm text-slate-800">
            <div className="col-span-2 place-self-start">{t("environments.campaigns.name")}</div>
            <div className="col-span-1">Provider</div>
            <div className="col-span-1">{t("common.surveys")}</div>
            <div className="col-span-1">Segment</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1">{t("environments.campaigns.sent")}</div>
            <div className="col-span-1">Created</div>
          </div>
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              environmentId={environmentId}
              isReadOnly={isReadOnly}
              onSend={setSendCampaign}
              onDelete={handleDelete}
              isDeleting={isDeleting === campaign.id}
            />
          ))}
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

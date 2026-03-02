"use client";

import { SendIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TCampaignWithRelations } from "@hivecfm/types/campaign";
import { getFormattedErrorMessage } from "@/lib/utils/helper";
import { sendCampaignAction } from "@/modules/campaigns/actions";
import { Button } from "@/modules/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/modules/ui/components/dialog";

interface SendCampaignDialogProps {
  campaign: TCampaignWithRelations;
  open: boolean;
  setOpen: (open: boolean) => void;
  onSent: () => void;
}

export const SendCampaignDialog = ({ campaign, open, setOpen, onSent }: SendCampaignDialogProps) => {
  const { t } = useTranslation();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    setIsSending(true);
    setError(null);

    try {
      const result = await sendCampaignAction({ campaignId: campaign.id });

      if (result?.data) {
        setOpen(false);
        onSent();
      } else {
        setError(getFormattedErrorMessage(result));
      }
    } catch (e) {
      setError("Failed to send campaign");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("environments.campaigns.confirm_send_campaign")}</DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex justify-between rounded-md bg-slate-50 px-4 py-2">
            <span className="text-sm text-slate-600">{t("environments.campaigns.name")}</span>
            <span className="text-sm font-medium text-slate-900">{campaign.name}</span>
          </div>
          <div className="flex justify-between rounded-md bg-slate-50 px-4 py-2">
            <span className="text-sm text-slate-600">{t("common.surveys")}</span>
            <span className="text-sm font-medium text-slate-900">{campaign.survey.name}</span>
          </div>
          <div className="flex justify-between rounded-md bg-slate-50 px-4 py-2">
            <span className="text-sm text-slate-600">Segment</span>
            <span className="text-sm font-medium text-slate-900">{campaign.segment?.title ?? "-"}</span>
          </div>
          <div className="flex justify-between rounded-md bg-slate-50 px-4 py-2">
            <span className="text-sm text-slate-600">{t("environments.campaigns.email_subject")}</span>
            <span className="text-sm font-medium text-slate-900">{campaign.subject}</span>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={isSending}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            <SendIcon className="mr-1 h-4 w-4" />
            {isSending ? t("environments.campaigns.sending") + "..." : t("environments.campaigns.send_now")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

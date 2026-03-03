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
import { Input } from "@/modules/ui/components/input";
import { Label } from "@/modules/ui/components/label";

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
  const [scheduleType, setScheduleType] = useState<"immediate" | "scheduled">("immediate");
  const [scheduledAt, setScheduledAt] = useState("");

  const handleSend = async () => {
    if (scheduleType === "scheduled" && !scheduledAt) {
      setError("Scheduled date and time is required");
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const result = await sendCampaignAction({
        campaignId: campaign.id,
        scheduledAt: scheduleType === "scheduled" ? new Date(scheduledAt) : undefined,
      });

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

          <div className="space-y-2 pt-2">
            <Label>Schedule</Label>
            <div className="flex flex-col gap-2">
              <div
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 ${
                  scheduleType === "immediate" ? "border-brand bg-brand/5" : "border-slate-200"
                }`}
                onClick={() => setScheduleType("immediate")}>
                <div
                  className={`h-4 w-4 rounded-full border-2 ${
                    scheduleType === "immediate" ? "border-brand bg-brand" : "border-slate-300"
                  }`}>
                  {scheduleType === "immediate" && (
                    <div className="flex h-full w-full items-center justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium text-slate-700">Send now</span>
              </div>
              <div
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 ${
                  scheduleType === "scheduled" ? "border-brand bg-brand/5" : "border-slate-200"
                }`}
                onClick={() => setScheduleType("scheduled")}>
                <div
                  className={`h-4 w-4 rounded-full border-2 ${
                    scheduleType === "scheduled" ? "border-brand bg-brand" : "border-slate-300"
                  }`}>
                  {scheduleType === "scheduled" && (
                    <div className="flex h-full w-full items-center justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium text-slate-700">Schedule for later</span>
              </div>
              {scheduleType === "scheduled" && (
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="mt-1"
                />
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={isSending}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSend} disabled={isSending || (scheduleType === "scheduled" && !scheduledAt)}>
            <SendIcon className="mr-1 h-4 w-4" />
            {isSending
              ? t("environments.campaigns.sending") + "..."
              : scheduleType === "scheduled"
                ? "Schedule"
                : t("environments.campaigns.send_now")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

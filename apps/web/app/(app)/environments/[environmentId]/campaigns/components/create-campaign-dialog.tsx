"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getFormattedErrorMessage } from "@/lib/utils/helper";
import { createCampaignAction } from "@/modules/campaigns/actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/ui/components/select";

interface CreateCampaignDialogProps {
  environmentId: string;
  surveys: { id: string; name: string }[];
  segments: { id: string; title: string }[];
  open: boolean;
  setOpen: (open: boolean) => void;
  onCreated: () => void;
}

export const CreateCampaignDialog = ({
  environmentId,
  surveys,
  segments,
  open,
  setOpen,
  onCreated,
}: CreateCampaignDialogProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [surveyId, setSurveyId] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [providerType, setProviderType] = useState<"email" | "sms">("email");
  const [scheduleType, setScheduleType] = useState<"immediate" | "scheduled">("immediate");
  const [scheduledAt, setScheduledAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setSurveyId("");
    setSegmentId("");
    setProviderType("email");
    setScheduleType("immediate");
    setScheduledAt("");
    setError(null);
  };

  const handleSubmit = async () => {
    if (!name || !surveyId || !segmentId) {
      setError("Name, Survey, and Segment are required");
      return;
    }

    if (scheduleType === "scheduled" && !scheduledAt) {
      setError("Scheduled date and time is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createCampaignAction({
        environmentId,
        data: {
          name,
          surveyId,
          segmentId,
          providerType,
          scheduledAt: scheduleType === "scheduled" ? new Date(scheduledAt) : null,
        },
      });

      if (result?.data) {
        resetForm();
        setOpen(false);
        onCreated();
      } else {
        setError(getFormattedErrorMessage(result));
      }
    } catch (e) {
      setError("Failed to create campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = name && surveyId && segmentId && (scheduleType === "immediate" || scheduledAt);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetForm();
        setOpen(isOpen);
      }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("environments.campaigns.create_campaign")}</DialogTitle>
          <DialogDescription>Create a new campaign to send a survey to your contacts.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="campaign-name">{t("environments.campaigns.name")}</Label>
            <Input
              id="campaign-name"
              placeholder="Campaign name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("environments.campaigns.select_survey")}</Label>
            {surveys.length === 0 ? (
              <p className="text-sm text-slate-500">{t("environments.campaigns.no_surveys")}</p>
            ) : (
              <Select value={surveyId} onValueChange={setSurveyId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("environments.campaigns.select_survey")} />
                </SelectTrigger>
                <SelectContent>
                  {surveys.map((survey) => (
                    <SelectItem key={survey.id} value={survey.id}>
                      {survey.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("environments.campaigns.select_segment")}</Label>
            {segments.length === 0 ? (
              <p className="text-sm text-slate-500">{t("environments.campaigns.no_segments")}</p>
            ) : (
              <Select value={segmentId} onValueChange={setSegmentId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("environments.campaigns.select_segment")} />
                </SelectTrigger>
                <SelectContent>
                  {segments.map((segment) => (
                    <SelectItem key={segment.id} value={segment.id}>
                      {segment.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>Provider Type</Label>
            <Select value={providerType} onValueChange={(value) => setProviderType(value as "email" | "sms")}>
              <SelectTrigger>
                <SelectValue placeholder="Select provider type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
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
                <span className="text-sm font-medium text-slate-700">Send immediately</span>
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
          <Button variant="secondary" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !isFormValid}>
            {isSubmitting ? "Creating..." : t("environments.campaigns.create_campaign")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

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
  emailChannels: { id: string; name: string }[];
  open: boolean;
  setOpen: (open: boolean) => void;
  onCreated: () => void;
}

export const CreateCampaignDialog = ({
  environmentId,
  surveys,
  segments,
  emailChannels,
  open,
  setOpen,
  onCreated,
}: CreateCampaignDialogProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [surveyId, setSurveyId] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [channelId, setChannelId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setSubject("");
    setSurveyId("");
    setSegmentId("");
    setChannelId("");
    setError(null);
  };

  const handleSubmit = async () => {
    if (!name || !subject || !surveyId || !segmentId || !channelId) {
      setError("All fields are required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createCampaignAction({
        environmentId,
        data: { name, subject, surveyId, segmentId, channelId },
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
          <DialogDescription>
            Create a new email campaign to send a survey to your contacts.
          </DialogDescription>
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
            <Label htmlFor="campaign-subject">{t("environments.campaigns.email_subject")}</Label>
            <Input
              id="campaign-subject"
              placeholder="Email subject line"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
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
            <Label>{t("environments.campaigns.select_channel")}</Label>
            {emailChannels.length === 0 ? (
              <p className="text-sm text-slate-500">{t("environments.campaigns.no_email_channels")}</p>
            ) : (
              <Select value={channelId} onValueChange={setChannelId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("environments.campaigns.select_channel")} />
                </SelectTrigger>
                <SelectContent>
                  {emailChannels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !name || !subject || !surveyId || !segmentId || !channelId}>
            {isSubmitting ? "Creating..." : t("environments.campaigns.create_campaign")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

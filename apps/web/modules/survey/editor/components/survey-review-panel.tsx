"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { getFormattedErrorMessage } from "@/lib/utils/helper";
import { Button } from "@/modules/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/modules/ui/components/dialog";
import { approveSurveyAction, rejectSurveyAction } from "../actions";

interface SurveyReviewPanelProps {
  surveyId: string;
  environmentId: string;
}

export const SurveyReviewPanel = ({ surveyId, environmentId }: SurveyReviewPanelProps) => {
  const { t } = useTranslation();
  const router = useRouter();
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const result = await approveSurveyAction({ surveyId });
      if (result?.data) {
        toast.success(t("environments.surveys.edit.survey_approved"));
        router.push(`/environments/${environmentId}/surveys/${surveyId}/summary?success=true`);
      } else {
        const errorMessage = getFormattedErrorMessage(result);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error(error);
      toast.error(t("common.error"));
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error(t("environments.surveys.edit.rejection_reason_required"));
      return;
    }

    setIsRejecting(true);
    try {
      const result = await rejectSurveyAction({ surveyId, reviewNote: rejectReason });
      if (result?.data) {
        toast.success(t("environments.surveys.edit.survey_rejected"));
        setShowRejectDialog(false);
        router.refresh();
      } else {
        const errorMessage = getFormattedErrorMessage(result);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error(error);
      toast.error(t("common.error"));
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50 px-5 py-3">
        <p className="text-sm font-medium text-amber-800">{t("environments.surveys.edit.pending_review")}</p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowRejectDialog(true)}>
            {t("common.reject")}
          </Button>
          <Button size="sm" loading={isApproving} onClick={handleApprove}>
            {t("environments.surveys.edit.approve_and_publish")}
          </Button>
        </div>
      </div>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("environments.surveys.edit.rejected")}</DialogTitle>
            <DialogDescription>{t("environments.surveys.edit.enter_rejection_reason")}</DialogDescription>
          </DialogHeader>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={t("environments.surveys.edit.enter_rejection_reason")}
            rows={4}
            className="w-full rounded-md border border-slate-300 p-3 text-sm focus:border-slate-500 focus:outline-none"
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowRejectDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" loading={isRejecting} onClick={handleReject}>
              {t("common.reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

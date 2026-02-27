"use client";

import { CheckIcon, EyeIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { getFormattedErrorMessage } from "@/lib/utils/helper";
import { approveSurveyAction, rejectSurveyAction } from "@/modules/survey/editor/actions";
import { Button } from "@/modules/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/modules/ui/components/dialog";
import { TApprovalQueueSurvey } from "../lib/survey";

interface ApprovalQueueCardProps {
  survey: TApprovalQueueSurvey;
  environmentId: string;
  onActionComplete: () => void;
}

export const ApprovalQueueCard = ({ survey, environmentId, onActionComplete }: ApprovalQueueCardProps) => {
  const { t } = useTranslation();
  const [isApproving, setIsApproving] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const result = await approveSurveyAction({ surveyId: survey.id });
      if (result?.data) {
        toast.success(t("environments.surveys.edit.survey_approved"));
        onActionComplete();
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
      const result = await rejectSurveyAction({ surveyId: survey.id, reviewNote: rejectReason });
      if (result?.data) {
        toast.success(t("environments.surveys.edit.survey_rejected"));
        setShowRejectDialog(false);
        setRejectReason("");
        onActionComplete();
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

  const submittedAt = new Date(survey.updatedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <>
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-400">
        <div className="flex flex-1 items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{survey.name}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {t("environments.surveys.approval_queue.submitted_by")}{" "}
              {survey.creator?.name ?? t("common.unknown")} &middot; {submittedAt}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/environments/${environmentId}/surveys/${survey.id}/edit`}>
              <EyeIcon className="h-4 w-4" />
              {t("common.review")}
            </Link>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowRejectDialog(true)}
            className="text-red-600 hover:text-red-700">
            <XIcon className="h-4 w-4" />
            {t("common.reject")}
          </Button>
          <Button size="sm" loading={isApproving} onClick={handleApprove}>
            <CheckIcon className="h-4 w-4" />
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

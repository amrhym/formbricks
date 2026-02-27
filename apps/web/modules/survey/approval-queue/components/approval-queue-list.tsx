"use client";

import { InboxIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { TApprovalQueueSurvey } from "../lib/survey";
import { ApprovalQueueCard } from "./approval-queue-card";

interface ApprovalQueueListProps {
  surveys: TApprovalQueueSurvey[];
  environmentId: string;
}

export const ApprovalQueueList = ({ surveys, environmentId }: ApprovalQueueListProps) => {
  const { t } = useTranslation();
  const router = useRouter();

  const handleActionComplete = () => {
    router.refresh();
  };

  if (surveys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-16">
        <InboxIcon className="h-12 w-12 text-slate-300" />
        <h3 className="mt-4 text-lg font-medium text-slate-700">
          {t("environments.surveys.approval_queue.no_surveys_pending")}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          {t("environments.surveys.approval_queue.no_surveys_pending_description")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {surveys.map((survey) => (
        <ApprovalQueueCard
          key={survey.id}
          survey={survey}
          environmentId={environmentId}
          onActionComplete={handleActionComplete}
        />
      ))}
    </div>
  );
};

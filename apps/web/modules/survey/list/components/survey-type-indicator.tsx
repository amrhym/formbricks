"use client";

import { Code, HelpCircle, Link2Icon, PhoneIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SurveyTypeIndicatorProps {
  type: string;
}

export const SurveyTypeIndicator = ({ type }: SurveyTypeIndicatorProps) => {
  const { t } = useTranslation();
  const surveyTypeMapping = {
    app: { icon: Code, label: t("common.app") },
    link: { icon: Link2Icon, label: t("common.link") },
    voice: { icon: PhoneIcon, label: t("common.voice") },
  };
  const { icon: Icon, label } = surveyTypeMapping[type] || { icon: HelpCircle, label: "Unknown" };

  return (
    <div className="flex items-center space-x-2 text-sm text-slate-600">
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </div>
  );
};

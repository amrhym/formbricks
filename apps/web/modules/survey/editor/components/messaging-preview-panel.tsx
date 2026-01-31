"use client";

import { MessageCircleIcon, SendIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { TSurveyElementTypeEnum } from "@hivecfm/types/surveys/elements";
import { TSurvey } from "@hivecfm/types/surveys/types";
import { cn } from "@/lib/cn";
import { getElementsFromBlocks } from "@/modules/survey/lib/client-utils";

interface MessagingPreviewPanelProps {
  survey: TSurvey;
  activeElementId: string | null;
  languageCode: string;
}

const getReplyOptions = (element: any, languageCode: string): string[] => {
  switch (element.type) {
    case TSurveyElementTypeEnum.NPS:
      return Array.from({ length: 11 }, (_, i) => `${i}`);
    case TSurveyElementTypeEnum.Rating: {
      const range = element.range ?? 5;
      return Array.from({ length: range }, (_, i) => `${i + 1}`);
    }
    case TSurveyElementTypeEnum.MultipleChoiceSingle:
    case TSurveyElementTypeEnum.MultipleChoiceMulti: {
      const choices = element.choices ?? [];
      return choices.map((choice: any, idx: number) => {
        const label = choice.label?.[languageCode] || choice.label?.default || `Option ${idx + 1}`;
        return `${idx + 1}. ${label}`;
      });
    }
    case TSurveyElementTypeEnum.OpenText:
      return [];
    case TSurveyElementTypeEnum.CTA:
      return ["1. Continue"];
    case TSurveyElementTypeEnum.Consent: {
      const label = element.label?.[languageCode] || element.label?.default || "I agree";
      return [`1. ${label}`];
    }
    default:
      return [];
  }
};

export const MessagingPreviewPanel = ({
  survey,
  activeElementId,
  languageCode,
}: MessagingPreviewPanelProps) => {
  const { t } = useTranslation();

  const elements = useMemo(() => getElementsFromBlocks(survey.blocks), [survey.blocks]);

  const activeElement = useMemo(() => {
    if (!activeElementId) return elements[0] ?? null;
    return elements.find((el) => el.id === activeElementId) ?? null;
  }, [elements, activeElementId]);

  const activeElementIndex = useMemo(() => {
    if (!activeElement) return -1;
    return elements.findIndex((el) => el.id === activeElement.id);
  }, [elements, activeElement]);

  const questionText = useMemo(() => {
    if (!activeElement) return "";
    return activeElement.headline?.[languageCode] || activeElement.headline?.default || "";
  }, [activeElement, languageCode]);

  const subheaderText = useMemo(() => {
    if (!activeElement) return "";
    return activeElement.subheader?.[languageCode] || activeElement.subheader?.default || "";
  }, [activeElement, languageCode]);

  const replyOptions = useMemo(() => {
    if (!activeElement) return [];
    return getReplyOptions(activeElement, languageCode);
  }, [activeElement, languageCode]);

  const isOpenText = activeElement?.type === TSurveyElementTypeEnum.OpenText;

  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-6">
      {/* Phone frame */}
      <div className="w-full max-w-[320px] overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-xl">
        {/* Header */}
        <div className="bg-emerald-500 px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <MessageCircleIcon className="h-4 w-4" />
            <span className="text-sm font-semibold">
              {t("environments.surveys.edit.messaging_preview", "Messaging Preview")}
            </span>
          </div>
          <p className="mt-1 text-xs text-emerald-100">{survey.name}</p>
        </div>

        {/* Chat area */}
        <div className="flex flex-col gap-3 bg-slate-50 p-4" style={{ minHeight: "280px" }}>
          {/* Question counter */}
          {activeElement && (
            <div className="text-center text-xs text-slate-400">
              {t("environments.surveys.edit.question_n_of_total", {
                n: activeElementIndex + 1,
                total: elements.length,
                defaultValue: `Question ${activeElementIndex + 1} of ${elements.length}`,
              })}
            </div>
          )}

          {/* Bot message bubble */}
          {questionText ? (
            <div className="max-w-[85%] self-start">
              <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm">
                <p className="text-sm leading-relaxed text-slate-800">{questionText}</p>
                {subheaderText && <p className="mt-1 text-xs text-slate-500">{subheaderText}</p>}
              </div>

              {/* Reply option buttons (inline) */}
              {replyOptions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {replyOptions.map((option, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700",
                        "shadow-sm"
                      )}>
                      {option}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 rounded-lg border border-dashed border-slate-300 p-3 text-center text-sm text-slate-400">
              {t("environments.surveys.edit.no_question_selected", "Select a question to preview")}
            </div>
          )}

          {/* User reply placeholder */}
          {isOpenText && questionText && (
            <div className="max-w-[75%] self-end">
              <div className="rounded-2xl rounded-tr-sm bg-emerald-500 px-4 py-3 shadow-sm">
                <p className="text-sm text-white/70 italic">
                  {t("environments.surveys.edit.user_types_response", "User types their response...")}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="flex items-center gap-2 border-t border-slate-200 bg-white px-3 py-2">
          <div className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2">
            <span className="text-xs text-slate-400">
              {t("environments.surveys.edit.type_a_message", "Type a message...")}
            </span>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500">
            <SendIcon className="h-3.5 w-3.5 text-white" />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-2">
          <p className="text-center text-[10px] text-slate-400">
            {t(
              "environments.surveys.edit.messaging_preview_note",
              "Visual representation of the messaging experience"
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

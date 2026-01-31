"use client";

import { PhoneIcon, Volume2Icon } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { TSurveyElementTypeEnum } from "@hivecfm/types/surveys/elements";
import { TSurvey } from "@hivecfm/types/surveys/types";
import { cn } from "@/lib/cn";
import { getElementsFromBlocks } from "@/modules/survey/lib/client-utils";

interface VoicePreviewPanelProps {
  survey: TSurvey;
  activeElementId: string | null;
  languageCode: string;
}

const getDtmfMapping = (element: any, languageCode: string): string[] => {
  switch (element.type) {
    case TSurveyElementTypeEnum.NPS:
      return Array.from({ length: 11 }, (_, i) => `Press ${i} for ${i}`);
    case TSurveyElementTypeEnum.Rating: {
      const range = element.range ?? 5;
      return Array.from({ length: range }, (_, i) => `Press ${i + 1} for ${i + 1}`);
    }
    case TSurveyElementTypeEnum.MultipleChoiceSingle: {
      const choices = element.choices ?? [];
      return choices.map((choice: any, idx: number) => {
        const label = choice.label?.[languageCode] || choice.label?.default || `Option ${idx + 1}`;
        return `Press ${idx + 1} for "${label}"`;
      });
    }
    case TSurveyElementTypeEnum.CTA:
      return ["Press 1 to continue"];
    default:
      return [];
  }
};

export const VoicePreviewPanel = ({ survey, activeElementId, languageCode }: VoicePreviewPanelProps) => {
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

  const ttsText = useMemo(() => {
    if (!activeElement) return "";
    return activeElement.headline?.[languageCode] || activeElement.headline?.default || "";
  }, [activeElement, languageCode]);

  const dtmfOptions = useMemo(() => {
    if (!activeElement) return [];
    return getDtmfMapping(activeElement, languageCode);
  }, [activeElement, languageCode]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-6">
      {/* Phone frame */}
      <div className="w-full max-w-[320px] overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-xl">
        {/* Header */}
        <div className="bg-orange-500 px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <PhoneIcon className="h-4 w-4" />
            <span className="text-sm font-semibold">
              {t("environments.surveys.edit.voice_preview", "IVR Caller Preview")}
            </span>
          </div>
          <p className="mt-1 text-xs text-orange-100">{survey.name}</p>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Question counter */}
          {activeElement && (
            <div className="mb-3 text-xs font-medium text-slate-400">
              {t("environments.surveys.edit.question_n_of_total", {
                n: activeElementIndex + 1,
                total: elements.length,
                defaultValue: `Question ${activeElementIndex + 1} of ${elements.length}`,
              })}
            </div>
          )}

          {/* TTS Text */}
          {ttsText ? (
            <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-3">
              <div className="mb-1 flex items-center gap-1.5">
                <Volume2Icon className="h-3.5 w-3.5 text-orange-600" />
                <span className="text-xs font-semibold text-orange-700">
                  {t("environments.surveys.edit.tts_output", "TTS Output")}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-slate-700">{ttsText}</p>
            </div>
          ) : (
            <div className="mb-4 rounded-lg border border-dashed border-slate-300 p-3 text-center text-sm text-slate-400">
              {t("environments.surveys.edit.no_question_selected", "Select a question to preview")}
            </div>
          )}

          {/* DTMF Keypad Mappings */}
          {dtmfOptions.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 text-xs font-semibold text-slate-500">
                {t("environments.surveys.edit.dtmf_input", "DTMF Input")}
              </div>
              <div className="space-y-1.5">
                {dtmfOptions.map((option, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-xs font-bold",
                        "bg-slate-700 text-white"
                      )}>
                      {activeElement?.type === TSurveyElementTypeEnum.NPS ? idx : idx + 1}
                    </div>
                    <span className="text-xs text-slate-600">{option}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Element type badge */}
          {activeElement && (
            <div className="mt-3 text-center">
              <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                {activeElement.type}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-2">
          <p className="text-center text-[10px] text-slate-400">
            {t(
              "environments.surveys.edit.voice_preview_note",
              "This is a visual representation of the IVR caller experience"
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

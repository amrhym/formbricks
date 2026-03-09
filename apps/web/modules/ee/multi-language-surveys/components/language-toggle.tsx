"use client";

import { Language } from "@prisma/client";
import { Loader2, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getLanguageLabel } from "@hivecfm/i18n-utils/src/utils";
import type { TUserLocale } from "@hivecfm/types/user";
import { Label } from "@/modules/ui/components/label";
import { Switch } from "@/modules/ui/components/switch";

interface LanguageToggleProps {
  language: Language;
  isChecked: boolean;
  onToggle: () => void;
  onEdit: () => void;
  isAIEnabled?: boolean;
  onAutoTranslate?: () => void;
  isTranslating?: boolean;
  locale: TUserLocale;
}

export function LanguageToggle({
  language,
  isChecked,
  onToggle,
  onEdit,
  isAIEnabled,
  onAutoTranslate,
  isTranslating,
  locale,
}: LanguageToggleProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col space-y-4">
      <div className="flex max-w-full items-center space-x-4">
        <Switch
          checked={isChecked}
          id={`${language.code}-toggle`}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        />
        <Label className="truncate font-medium text-slate-800" htmlFor={`${language.code}-toggle`}>
          {getLanguageLabel(language.code, locale)}
        </Label>
        {isChecked ? (
          <div className="flex items-center space-x-3">
            <button
              className="truncate text-xs text-slate-600 underline hover:text-slate-800"
              onClick={onEdit}
              type="button">
              {t("environments.surveys.edit.edit_translations", {
                lang: getLanguageLabel(language.code, locale),
              })}
            </button>
            {isAIEnabled && onAutoTranslate ? (
              <button
                className="inline-flex items-center space-x-1 rounded-md bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50"
                onClick={onAutoTranslate}
                disabled={isTranslating}
                type="button">
                {isTranslating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                <span>{isTranslating ? "Translating..." : "Auto-translate"}</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Language } from "@prisma/client";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ArrowUpRight, Languages } from "lucide-react";
import Link from "next/link";
import type { FC } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import type { TSurvey, TSurveyLanguage } from "@hivecfm/types/surveys/types";
import { TUserLocale } from "@hivecfm/types/user";
import { cn } from "@/lib/cn";
import { addMultiLanguageLabels, extractLanguageCodes, getEnabledLanguages } from "@/lib/i18n/utils";
import { translateSurveyContentAction } from "@/modules/ee/multi-language-surveys/lib/ai-translate";
import { AdvancedOptionToggle } from "@/modules/ui/components/advanced-option-toggle";
import { Button } from "@/modules/ui/components/button";
import { ConfirmationModal } from "@/modules/ui/components/confirmation-modal";
import { Label } from "@/modules/ui/components/label";
import { Switch } from "@/modules/ui/components/switch";
import { UpgradePrompt } from "@/modules/ui/components/upgrade-prompt";
import { DefaultLanguageSelect } from "./default-language-select";
import { SecondaryLanguageSelect } from "./secondary-language-select";

interface MultiLanguageCardProps {
  localSurvey: TSurvey;
  projectLanguages: Language[];
  setLocalSurvey: (survey: TSurvey) => void;
  activeElementId: string | null;
  setActiveElementId: (elementId: string | null) => void;
  isMultiLanguageAllowed?: boolean;
  isAIEnabled?: boolean;
  isFormbricksCloud: boolean;
  setSelectedLanguageCode: (language: string) => void;
  locale: TUserLocale;
}

export interface ConfirmationModalProps {
  body: string;
  open: boolean;
  title: string;
  buttonText: string;
  buttonVariant?: "default" | "destructive";
  onConfirm: () => void;
}

export const MultiLanguageCard: FC<MultiLanguageCardProps> = ({
  activeElementId,
  localSurvey,
  setActiveElementId,
  setLocalSurvey,
  projectLanguages,
  isMultiLanguageAllowed,
  isAIEnabled,
  isFormbricksCloud,
  setSelectedLanguageCode,
  locale,
}) => {
  const { t } = useTranslation();
  const environmentId = localSurvey.environmentId;
  const open = activeElementId === "multiLanguage";
  const [isMultiLanguageActivated, setIsMultiLanguageActivated] = useState(localSurvey.languages.length > 1);
  const [confirmationModalInfo, setConfirmationModalInfo] = useState<ConfirmationModalProps>({
    title: "",
    open: false,
    body: "",
    buttonText: "",
    onConfirm: () => {},
  });

  const defaultLanguage = useMemo(
    () => localSurvey.languages.find((language) => language.default)?.language,
    [localSurvey.languages]
  );

  const setOpen = (open: boolean) => {
    if (open) {
      setActiveElementId("multiLanguage");
    } else {
      setActiveElementId(null);
    }
  };

  useEffect(() => {
    if (localSurvey.languages.length === 0) {
      setIsMultiLanguageActivated(false);
    }
  }, [localSurvey.languages]);

  const updateSurveyTranslations = (survey: TSurvey, updatedLanguages: TSurveyLanguage[]) => {
    const translatedSurveyResult = addMultiLanguageLabels(survey, extractLanguageCodes(updatedLanguages));

    const updatedSurvey = { ...translatedSurveyResult, languages: updatedLanguages };
    setLocalSurvey(updatedSurvey as TSurvey);
  };

  const updateSurveyLanguages = (language: Language) => {
    let updatedLanguages = localSurvey.languages;
    const languageIndex = localSurvey.languages.findIndex(
      (surveyLanguage) => surveyLanguage.language.code === language.code
    );
    if (languageIndex >= 0) {
      // Toggle the 'enabled' property of the existing language
      updatedLanguages = updatedLanguages.map((surveyLanguage, index) =>
        index === languageIndex ? { ...surveyLanguage, enabled: !surveyLanguage.enabled } : surveyLanguage
      );
    } else {
      // Add the new language
      updatedLanguages = [
        ...updatedLanguages,
        {
          enabled: true,
          default: false,
          language,
        },
      ];
    }
    updateSurveyTranslations(localSurvey, updatedLanguages);
  };

  const updateSurvey = (data: { languages: TSurveyLanguage[] }) => {
    setLocalSurvey({ ...localSurvey, ...data });
  };

  const handleDefaultLanguageChange = (languageCode: string) => {
    const language = projectLanguages.find((lang) => lang.code === languageCode);
    if (language) {
      let languageExists = false;

      // Update all languages and check if the new default language already exists
      const newLanguages =
        localSurvey.languages.map((lang) => {
          if (lang.language.code === language.code) {
            languageExists = true;
            return { ...lang, default: true };
          }
          return { ...lang, default: false };
        }) ?? [];

      if (!languageExists) {
        // If the language doesn't exist, add it as the default
        newLanguages.push({
          enabled: true,
          default: true,
          language,
        });
      }

      setConfirmationModalInfo({ ...confirmationModalInfo, open: false });
      updateSurvey({ languages: newLanguages });
    }
  };

  const handleActivationSwitchLogic = () => {
    if (isMultiLanguageActivated) {
      if (localSurvey.languages.length > 0) {
        setConfirmationModalInfo({
          open: true,
          title: t("environments.surveys.edit.remove_translations"),
          body: t("environments.surveys.edit.this_action_will_remove_all_the_translations_from_this_survey"),
          buttonText: t("environments.surveys.edit.remove_translations"),
          buttonVariant: "destructive",
          onConfirm: () => {
            updateSurveyTranslations(localSurvey, []);
            setIsMultiLanguageActivated(false);
            setConfirmationModalInfo({ ...confirmationModalInfo, open: false });
          },
        });
      } else {
        setIsMultiLanguageActivated(false);
      }
    } else {
      setIsMultiLanguageActivated(true);
    }
  };

  const handleLanguageSwitchToggle = () => {
    setLocalSurvey({ ...localSurvey, ...{ showLanguageSwitch: !localSurvey.showLanguageSwitch } });
  };

  const [parent] = useAutoAnimate();

  const enabledLanguages = getEnabledLanguages(localSurvey.languages);

  const [translatingLanguage, setTranslatingLanguage] = useState<string | null>(null);

  const handleAutoTranslate = useCallback(
    async (targetLanguage: Language) => {
      if (!defaultLanguage) return;
      setTranslatingLanguage(targetLanguage.code);

      try {
        // Collect all translatable texts from the survey
        const textsToTranslate: { path: string; text: string }[] = [];

        const collectI18nTexts = (obj: any, prefix: string) => {
          if (!obj || typeof obj !== "object") return;
          if (obj.default !== undefined && typeof obj.default === "string") {
            // This is a TI18nString
            if (obj.default.trim()) {
              textsToTranslate.push({ path: prefix, text: obj.default });
            }
            return;
          }
          if (Array.isArray(obj)) {
            obj.forEach((item, i) => collectI18nTexts(item, `${prefix}[${i}]`));
          } else {
            Object.entries(obj).forEach(([key, value]) => collectI18nTexts(value, `${prefix}.${key}`));
          }
        };

        // Collect from welcome card, blocks, and endings
        collectI18nTexts(localSurvey.welcomeCard, "welcomeCard");
        localSurvey.blocks.forEach((block, bi) => {
          block.elements.forEach((element, ei) => {
            collectI18nTexts(element, `blocks[${bi}].elements[${ei}]`);
          });
        });
        localSurvey.endings.forEach((ending, i) => {
          collectI18nTexts(ending, `endings[${i}]`);
        });

        if (textsToTranslate.length === 0) {
          toast.error("No text content found to translate");
          return;
        }

        const result = await translateSurveyContentAction({
          environmentId: localSurvey.environmentId,
          sourceLanguageCode: defaultLanguage.code,
          targetLanguageCode: targetLanguage.code,
          texts: textsToTranslate.map((t) => t.text),
        });

        if (!result?.data) {
          toast.error("Translation failed. Please try again.");
          return;
        }

        const translations = result.data;

        // Apply translations to the survey
        const updatedSurvey = JSON.parse(JSON.stringify(localSurvey)) as TSurvey;

        const applyTranslation = (obj: any, path: string, langCode: string, translatedText: string) => {
          const parts = path.split(/\.|\[(\d+)\]/).filter(Boolean);
          let current: any = obj;
          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            current = current[isNaN(Number(part)) ? part : Number(part)];
            if (!current) return;
          }
          const lastPart = parts[parts.length - 1];
          const target = current[isNaN(Number(lastPart)) ? lastPart : Number(lastPart)];
          if (target && typeof target === "object" && "default" in target) {
            target[langCode] = translatedText;
          }
        };

        const langCode = targetLanguage.code === defaultLanguage.code ? "default" : targetLanguage.code;

        textsToTranslate.forEach((item, i) => {
          if (translations[i]) {
            applyTranslation(updatedSurvey, item.path, langCode, translations[i]);
          }
        });

        setLocalSurvey(updatedSurvey);
        toast.success(`Survey translated to ${targetLanguage.code} successfully`);
      } catch (error) {
        console.error("AI translation failed:", error);
        toast.error("Translation failed. Please try again.");
      } finally {
        setTranslatingLanguage(null);
      }
    },
    [localSurvey, defaultLanguage, setLocalSurvey]
  );

  return (
    <div
      className={cn(
        open ? "shadow-lg" : "shadow-md",
        "group z-10 flex flex-row rounded-lg bg-white text-slate-900"
      )}>
      <div
        className={cn(
          open ? "bg-slate-50" : "bg-white group-hover:bg-slate-50",
          "flex w-10 items-center justify-center rounded-l-lg border-b border-l border-t group-aria-expanded:rounded-bl-none"
        )}>
        <p>
          <Languages className="h-6 w-6 rounded-full bg-indigo-500 p-1 text-white" />
        </p>
      </div>
      <Collapsible.Root
        className="flex-1 rounded-r-lg border border-slate-200 transition-all duration-300 ease-in-out"
        onOpenChange={setOpen}
        open={open}>
        <Collapsible.CollapsibleTrigger
          asChild
          className="flex cursor-pointer justify-between rounded-r-lg p-4 hover:bg-slate-50">
          <div>
            <div className="inline-flex">
              <div>
                <p className="text-sm font-semibold">{t("common.multiple_languages")}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Label htmlFor="multi-lang-toggle">
                {isMultiLanguageActivated ? t("common.on") : t("common.off")}
              </Label>

              <Switch
                checked={isMultiLanguageActivated}
                disabled={!isMultiLanguageAllowed || projectLanguages.length === 0}
                id="multi-lang-toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  handleActivationSwitchLogic();
                }}
              />
            </div>
          </div>
        </Collapsible.CollapsibleTrigger>
        <Collapsible.CollapsibleContent className={`flex flex-col px-4 ${open && "pb-6"}`} ref={parent}>
          <div className="space-y-6 pt-3">
            {!isMultiLanguageAllowed && !isMultiLanguageActivated ? (
              <UpgradePrompt
                title={t("environments.surveys.edit.upgrade_notice_title")}
                description={t("environments.surveys.edit.upgrade_notice_description")}
                buttons={[
                  {
                    text: isFormbricksCloud
                      ? t("common.start_free_trial")
                      : t("common.request_trial_license"),
                    href: isFormbricksCloud ? `/environments/${environmentId}/settings/billing` : "#",
                  },
                  {
                    text: t("common.learn_more"),
                    href: isFormbricksCloud ? `/environments/${environmentId}/settings/billing` : "#",
                  },
                ]}
              />
            ) : (
              <>
                {projectLanguages.length <= 1 && (
                  <div className="mb-4 text-sm italic text-slate-500">
                    {projectLanguages.length === 0
                      ? t("environments.surveys.edit.no_languages_found_add_first_one_to_get_started")
                      : t(
                          "environments.surveys.edit.you_need_to_have_two_or_more_languages_set_up_in_your_workspace_to_work_with_translations"
                        )}
                  </div>
                )}
                {projectLanguages.length > 1 && (
                  <div className="space-y-6">
                    {isMultiLanguageAllowed && !isMultiLanguageActivated ? (
                      <div className="text-sm italic text-slate-500">
                        {t("environments.surveys.edit.switch_multi_language_on_to_get_started")}
                      </div>
                    ) : null}

                    {isMultiLanguageActivated ? (
                      <div className="space-y-6">
                        <DefaultLanguageSelect
                          defaultLanguage={defaultLanguage}
                          handleDefaultLanguageChange={handleDefaultLanguageChange}
                          projectLanguages={projectLanguages}
                          setConfirmationModalInfo={setConfirmationModalInfo}
                          locale={locale}
                        />
                        {defaultLanguage ? (
                          <SecondaryLanguageSelect
                            defaultLanguage={defaultLanguage}
                            localSurvey={localSurvey}
                            projectLanguages={projectLanguages}
                            setActiveElementId={setActiveElementId}
                            setSelectedLanguageCode={setSelectedLanguageCode}
                            updateSurveyLanguages={updateSurveyLanguages}
                            isAIEnabled={isAIEnabled}
                            onAutoTranslate={handleAutoTranslate}
                            translatingLanguage={translatingLanguage}
                            locale={locale}
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )}

                <Button asChild size="sm" variant="secondary">
                  <Link href={`/environments/${environmentId}/workspace/languages`} target="_blank">
                    {t("environments.surveys.edit.manage_languages")}
                    <ArrowUpRight />
                  </Link>
                </Button>
                {isMultiLanguageActivated && (
                  <AdvancedOptionToggle
                    customContainerClass="px-0 pt-0"
                    htmlId="languageSwitch"
                    disabled={enabledLanguages.length <= 1}
                    isChecked={!!localSurvey.showLanguageSwitch}
                    onToggle={handleLanguageSwitchToggle}
                    title={t("environments.surveys.edit.show_language_switch")}
                    description={t(
                      "environments.surveys.edit.enable_participants_to_switch_the_survey_language_at_any_point_during_the_survey"
                    )}
                    childBorder={true}></AdvancedOptionToggle>
                )}
              </>
            )}

            <ConfirmationModal
              buttonText={confirmationModalInfo.buttonText}
              buttonVariant={confirmationModalInfo.buttonVariant}
              onConfirm={confirmationModalInfo.onConfirm}
              open={confirmationModalInfo.open}
              setOpen={() => {
                setConfirmationModalInfo((prev) => ({ ...prev, open: !prev.open }));
              }}
              body={confirmationModalInfo.body}
              title={confirmationModalInfo.title}
            />
          </div>
        </Collapsible.CollapsibleContent>
      </Collapsible.Root>
    </div>
  );
};

"use client";

import * as Collapsible from "@radix-ui/react-collapsible";
import { Hand } from "lucide-react";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { TAudioSource } from "@hivecfm/types/surveys/elements";
import { TSurvey, TSurveyWelcomeCard } from "@hivecfm/types/surveys/types";
import { TUserLocale } from "@hivecfm/types/user";
import { cn } from "@/lib/cn";
import { handleFileUpload } from "@/modules/storage/file-upload";
import { AudioSourceControl } from "@/modules/survey/components/audio-source-control";
import { ElementFormInput } from "@/modules/survey/components/element-form-input";
import { FileInput } from "@/modules/ui/components/file-input";
import { Label } from "@/modules/ui/components/label";
import { Switch } from "@/modules/ui/components/switch";

interface EditWelcomeCardProps {
  localSurvey: TSurvey;
  setLocalSurvey: (survey: TSurvey) => void;
  setActiveElementId: (id: string | null) => void;
  activeElementId: string | null;
  isInvalid: boolean;
  selectedLanguageCode: string;
  setSelectedLanguageCode: (languageCode: string) => void;
  locale: TUserLocale;
  isStorageConfigured: boolean;
  isExternalUrlsAllowed?: boolean;
  isVoiceChannel?: boolean;
}

export const EditWelcomeCard = ({
  localSurvey,
  setLocalSurvey,
  setActiveElementId,
  activeElementId,
  isInvalid,
  selectedLanguageCode,
  setSelectedLanguageCode,
  locale,
  isStorageConfigured = true,
  isExternalUrlsAllowed,
  isVoiceChannel,
}: EditWelcomeCardProps) => {
  const { t } = useTranslation();

  const path = usePathname();
  const environmentId = path?.split("/environments/")[1]?.split("/")[0];

  const defaultLanguageCode = useMemo(
    () => localSurvey.languages.filter((lang) => lang.default)[0]?.language.code ?? "default",
    [localSurvey.languages]
  );
  const currentLanguage = selectedLanguageCode === defaultLanguageCode ? "default" : selectedLanguageCode;

  let open = activeElementId == "start";

  const setOpen = (e) => {
    if (e) {
      setActiveElementId("start");
    } else {
      setActiveElementId(null);
    }
  };

  const updateSurvey = (data: Partial<TSurveyWelcomeCard>) => {
    setLocalSurvey({
      ...localSurvey,
      welcomeCard: {
        ...localSurvey.welcomeCard,
        ...data,
      },
    });
  };

  return (
    <div className={cn(open ? "shadow-lg" : "shadow-md", "group flex flex-row rounded-lg bg-white")}>
      <div
        className={cn(
          open ? "bg-slate-50" : "",
          "flex w-10 items-center justify-center rounded-l-lg border-b border-l border-t group-aria-expanded:rounded-bl-none",
          isInvalid ? "bg-red-400" : "bg-white group-hover:bg-slate-50"
        )}>
        <Hand className="h-4 w-4" />
      </div>
      <Collapsible.Root
        open={open}
        onOpenChange={setOpen}
        className="flex-1 rounded-r-lg border border-slate-200 transition-all duration-200 ease-in-out">
        <Collapsible.CollapsibleTrigger
          asChild
          className="flex cursor-pointer justify-between rounded-r-lg p-4 hover:bg-slate-50">
          <div>
            <div className="inline-flex">
              <div>
                <p className="text-sm font-semibold">{t("common.welcome_card")}</p>
                {!open && (
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {localSurvey?.welcomeCard?.enabled ? t("common.shown") : t("common.hidden")}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Label htmlFor="welcome-toggle">
                {localSurvey?.welcomeCard?.enabled ? t("common.on") : t("common.off")}
              </Label>

              <Switch
                id="welcome-toggle"
                checked={localSurvey?.welcomeCard?.enabled}
                onClick={(e) => {
                  e.stopPropagation();
                  updateSurvey({ enabled: !localSurvey.welcomeCard?.enabled });
                }}
              />
            </div>
          </div>
        </Collapsible.CollapsibleTrigger>
        <Collapsible.CollapsibleContent className={`flex flex-col px-4 ${open && "pb-6"}`}>
          <form>
            {isVoiceChannel ? (
              <div className="mt-3">
                <AudioSourceControl
                  environmentId={localSurvey.environmentId}
                  audioSource={(localSurvey.welcomeCard as any).audioSource || "tts"}
                  audioUrl={localSurvey.welcomeCard.audioUrl as Record<string, string> | undefined}
                  currentLanguage={currentLanguage}
                  scriptLanguageCode={selectedLanguageCode}
                  defaultLanguageCode={defaultLanguageCode}
                  cardType="welcome"
                  cardHeadline={localSurvey.welcomeCard.headline}
                  cardSubheader={localSurvey.welcomeCard.subheader}
                  surveyVoiceConfig={(localSurvey as any).voiceConfig}
                  onAudioSourceChange={(source: TAudioSource) => {
                    updateSurvey({ audioSource: source } as any);
                  }}
                  onAudioUrlChange={(url: Record<string, string>) => {
                    updateSurvey({ audioUrl: url } as any);
                  }}
                  onAudioGenerated={({ audioUrl: url, audioSource: source }) => {
                    updateSurvey({ audioUrl: url, audioSource: source } as any);
                  }}
                  onFileUpload={async (file: File) => {
                    const result = await handleFileUpload(file, localSurvey.environmentId, ["wav", "mp3"]);
                    if (result?.url) {
                      const existingAudioUrl =
                        (localSurvey.welcomeCard.audioUrl as Record<string, string>) || {};
                      const newAudioUrl = { ...existingAudioUrl, [currentLanguage]: result.url };
                      updateSurvey({ audioUrl: newAudioUrl, audioSource: "upload" } as any);
                    }
                  }}
                />
              </div>
            ) : (
              <>
                <div className="mt-2">
                  <Label htmlFor="companyLogo">{t("environments.surveys.edit.company_logo")}</Label>
                </div>
                <div className="mt-3 flex w-full items-center justify-center">
                  <FileInput
                    id="welcome-card-image"
                    allowedFileExtensions={["png", "jpeg", "jpg", "webp", "heic"]}
                    environmentId={environmentId}
                    onFileUpload={(url: string[] | undefined) => {
                      if (url) {
                        updateSurvey({ fileUrl: url[0] });
                      } else {
                        updateSurvey({ fileUrl: undefined });
                      }
                    }}
                    fileUrl={localSurvey?.welcomeCard?.fileUrl}
                    isVideoAllowed={true}
                    isAudioAllowed={false}
                    isStorageConfigured={isStorageConfigured}
                  />
                </div>
              </>
            )}
            <div className="mt-3">
              <ElementFormInput
                id="headline"
                value={localSurvey.welcomeCard.headline}
                label={t("common.note") + "*"}
                localSurvey={localSurvey}
                elementIdx={-1}
                isInvalid={isInvalid}
                updateSurvey={updateSurvey}
                selectedLanguageCode={selectedLanguageCode}
                setSelectedLanguageCode={setSelectedLanguageCode}
                locale={locale}
                isStorageConfigured={isStorageConfigured}
                isExternalUrlsAllowed={isExternalUrlsAllowed}
                isVoiceChannel={isVoiceChannel}
              />
            </div>
            <div className="mt-3">
              <ElementFormInput
                id="subheader"
                value={localSurvey.welcomeCard.subheader}
                label={t("environments.surveys.edit.welcome_message")}
                localSurvey={localSurvey}
                elementIdx={-1}
                isInvalid={isInvalid}
                updateSurvey={updateSurvey}
                selectedLanguageCode={selectedLanguageCode}
                setSelectedLanguageCode={setSelectedLanguageCode}
                locale={locale}
                isStorageConfigured={isStorageConfigured}
                isExternalUrlsAllowed={isExternalUrlsAllowed}
              />
            </div>

            {!isVoiceChannel && (
              <div className="mt-3 flex justify-between gap-8">
                <div className="flex w-full space-x-2">
                  <div className="w-full">
                    <ElementFormInput
                      id="buttonLabel"
                      value={localSurvey.welcomeCard.buttonLabel}
                      localSurvey={localSurvey}
                      elementIdx={-1}
                      maxLength={48}
                      placeholder={t("common.next")}
                      isInvalid={isInvalid}
                      updateSurvey={updateSurvey}
                      selectedLanguageCode={selectedLanguageCode}
                      setSelectedLanguageCode={setSelectedLanguageCode}
                      label={t("environments.surveys.edit.next_button_label")}
                      locale={locale}
                      isStorageConfigured={isStorageConfigured}
                      isExternalUrlsAllowed={isExternalUrlsAllowed}
                    />
                  </div>
                </div>
              </div>
            )}
            {!isVoiceChannel && (
              <div className="mt-8 flex items-center">
                <div className="mr-2">
                  <Switch
                    id="timeToFinish"
                    name="timeToFinish"
                    checked={localSurvey?.welcomeCard?.timeToFinish}
                    onCheckedChange={() =>
                      updateSurvey({ timeToFinish: !localSurvey.welcomeCard.timeToFinish })
                    }
                  />
                </div>
                <div className="flex-column">
                  <Label htmlFor="timeToFinish">{t("common.time_to_finish")}</Label>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {t("environments.surveys.edit.display_an_estimate_of_completion_time_for_survey")}
                  </div>
                </div>
              </div>
            )}
            {localSurvey?.type === "link" && (
              <div className="mt-6 flex items-center">
                <div className="mr-2">
                  <Switch
                    id="showResponseCount"
                    name="showResponseCount"
                    checked={localSurvey?.welcomeCard?.showResponseCount}
                    onCheckedChange={() =>
                      updateSurvey({ showResponseCount: !localSurvey.welcomeCard.showResponseCount })
                    }
                  />
                </div>
                <div className="flex-column">
                  <Label htmlFor="showResponseCount">{t("common.show_response_count")}</Label>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {t("environments.surveys.edit.display_number_of_responses_for_survey")}
                  </div>
                </div>
              </div>
            )}
          </form>
        </Collapsible.CollapsibleContent>
      </Collapsible.Root>
    </div>
  );
};

"use client";

import { OrganizationRole, Project } from "@prisma/client";
import { isEqual } from "lodash";
import { AlertTriangleIcon, ArrowLeftIcon, ClockIcon, SettingsIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { getLanguageLabel } from "@hivecfm/i18n-utils/src/utils";
import { TSegment } from "@hivecfm/types/segment";
import { TSurveyBlock } from "@hivecfm/types/surveys/blocks";
import {
  TSurvey,
  TSurveyEditorTabs,
  ZSurvey,
  ZSurveyEndScreenCard,
  ZSurveyRedirectUrlCard,
} from "@hivecfm/types/surveys/types";
import { getFormattedErrorMessage } from "@/lib/utils/helper";
import { createSegmentAction } from "@/modules/ee/contacts/segments/actions";
import { TSurveyDraft } from "@/modules/survey/editor/types/survey";
import { Alert, AlertButton, AlertTitle } from "@/modules/ui/components/alert";
import { AlertDialog } from "@/modules/ui/components/alert-dialog";
import { Button } from "@/modules/ui/components/button";
import { Input } from "@/modules/ui/components/input";
import { submitForReviewAction, updateSurveyAction, updateSurveyDraftAction } from "../actions";
import { isSurveyValid } from "../lib/validation";

interface SurveyMenuBarProps {
  localSurvey: TSurvey;
  survey: TSurvey;
  setLocalSurvey: (survey: TSurvey) => void;
  environmentId: string;
  activeId: TSurveyEditorTabs;
  setActiveId: React.Dispatch<React.SetStateAction<TSurveyEditorTabs>>;
  setInvalidElements: React.Dispatch<React.SetStateAction<string[]>>;
  project: Project;
  responseCount: number;
  selectedLanguageCode: string;
  setSelectedLanguageCode: (selectedLanguage: string) => void;
  isCxMode: boolean;
  locale: string;
  setIsCautionDialogOpen: (open: boolean) => void;
  isStorageConfigured: boolean;
  membershipRole?: OrganizationRole;
}

export const SurveyMenuBar = ({
  localSurvey,
  survey,
  environmentId,
  setLocalSurvey,
  activeId,
  setActiveId,
  setInvalidElements,
  project,
  responseCount,
  selectedLanguageCode,
  isCxMode,
  locale,
  setIsCautionDialogOpen,
  isStorageConfigured = true,
  membershipRole,
}: SurveyMenuBarProps) => {
  const { t } = useTranslation();
  const isAdmin = membershipRole === "owner" || membershipRole === "manager";
  const router = useRouter();
  const [audiencePrompt, setAudiencePrompt] = useState(true);
  const [isLinkSurvey, setIsLinkSurvey] = useState(true);
  const [isConfirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isSurveyPublishing, setIsSurveyPublishing] = useState(false);
  const [isSurveySaving, setIsSurveySaving] = useState(false);
  const isSuccessfullySavedRef = useRef(false);

  useEffect(() => {
    if (audiencePrompt && activeId === "settings") {
      setAudiencePrompt(false);
    }
  }, [activeId, audiencePrompt]);

  useEffect(() => {
    setIsLinkSurvey(localSurvey.type === "link");
  }, [localSurvey.type]);

  // Reset the successfully saved flag when survey prop updates (page refresh complete)
  useEffect(() => {
    if (isSuccessfullySavedRef.current) {
      isSuccessfullySavedRef.current = false;
    }
  }, [survey]);

  useEffect(() => {
    const warningText = t("environments.surveys.edit.unsaved_changes_warning");
    const handleWindowClose = (e: BeforeUnloadEvent) => {
      // Skip warning if we just successfully saved
      if (isSuccessfullySavedRef.current) {
        return;
      }

      if (!isEqual(localSurvey, survey)) {
        e.preventDefault();
        return (e.returnValue = warningText);
      }
    };

    window.addEventListener("beforeunload", handleWindowClose);
    return () => {
      window.removeEventListener("beforeunload", handleWindowClose);
    };
  }, [localSurvey, survey, t]);

  const clearSurveyLocalStorage = () => {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(`${localSurvey.id}-columnOrder`);
      localStorage.removeItem(`${localSurvey.id}-columnVisibility`);
    }
  };

  const containsEmptyTriggers = useMemo(() => {
    if (localSurvey.type === "link") return false;

    const noTriggers = !localSurvey.triggers || localSurvey.triggers.length === 0 || !localSurvey.triggers[0];

    if (noTriggers) return true;

    return false;
  }, [localSurvey]);

  const disableSave = useMemo(() => {
    if (isSurveySaving) return true;

    if (localSurvey.status !== "draft" && localSurvey.status !== "underReview" && containsEmptyTriggers)
      return true;
  }, [containsEmptyTriggers, isSurveySaving, localSurvey.status]);

  const handleBack = () => {
    const { updatedAt, ...localSurveyRest } = localSurvey;
    const { updatedAt: _, ...surveyRest } = survey;

    if (!isEqual(localSurveyRest, surveyRest)) {
      setConfirmDialogOpen(true);
    } else {
      router.back();
    }
  };

  const handleTemporarySegment = async () => {
    if (localSurvey.segment && localSurvey.type === "app" && localSurvey.segment?.id === "temp") {
      const { filters } = localSurvey.segment;

      // create a new private segment
      const newSegment = await createSegmentAction({
        environmentId: localSurvey.environmentId,
        filters,
        isPrivate: true,
        surveyId: localSurvey.id,
        title: localSurvey.id,
      });

      return newSegment?.data;
    }
  };

  const handleSegmentUpdate = async (): Promise<TSegment | null> => {
    if (localSurvey.segment && localSurvey.segment.id === "temp") {
      const segment = await handleTemporarySegment();
      return segment ?? null;
    }

    return localSurvey.segment;
  };

  const validateSurveyWithZod = (): boolean => {
    const localSurveyValidation = ZSurvey.safeParse(localSurvey);
    if (!localSurveyValidation.success) {
      const currentError = localSurveyValidation.error.errors[0];

      if (currentError.path[0] === "blocks") {
        const blockIdx = currentError.path[1];

        // Check if this is an element-level error (path includes "elements")
        // Element errors: ["blocks", blockIdx, "elements", elementIdx, ...]
        // Block errors: ["blocks", blockIdx, "buttonLabel"] or ["blocks", blockIdx, "logic"]
        if (currentError.path[2] === "elements" && typeof currentError.path[3] === "number") {
          const elementIdx = currentError.path[3];
          const block: TSurveyBlock = localSurvey.blocks?.[blockIdx];
          const element = block?.elements[elementIdx];

          if (element) {
            setInvalidElements((prevInvalidElements) =>
              prevInvalidElements ? [...prevInvalidElements, element.id] : [element.id]
            );
          }
        }
      } else if (currentError.path[0] === "welcomeCard") {
        setInvalidElements((prevInvalidElements) =>
          prevInvalidElements ? [...prevInvalidElements, "start"] : ["start"]
        );
      } else if (currentError.path[0] === "endings") {
        const endingIdx = typeof currentError.path[1] === "number" ? currentError.path[1] : -1;
        setInvalidElements((prevInvalidElements) =>
          prevInvalidElements
            ? [...prevInvalidElements, localSurvey.endings[endingIdx].id]
            : [localSurvey.endings[endingIdx].id]
        );
      }

      if (currentError.code === "custom") {
        const params = currentError.params ?? ({} as { invalidLanguageCodes: string[] });
        if (params.invalidLanguageCodes && params.invalidLanguageCodes.length) {
          const invalidLanguageLabels = params.invalidLanguageCodes.map(
            (invalidLanguage: string) => getLanguageLabel(invalidLanguage, locale) ?? invalidLanguage
          );

          const messageSplit = currentError.message.split("-fLang-")[0];

          toast.error(`${messageSplit} ${invalidLanguageLabels.join(", ")}`);
        } else {
          toast.error(currentError.message, {
            className: "w-fit !max-w-md",
          });
        }

        return false;
      }

      toast.error(currentError.message);
      return false;
    }

    return true;
  };

  // Add new handler after handleSurveySave
  const handleSurveySaveDraft = async (): Promise<boolean> => {
    setIsSurveySaving(true);

    try {
      const segment = await handleSegmentUpdate();
      clearSurveyLocalStorage();
      const updatedSurveyResponse = await updateSurveyDraftAction({
        ...localSurvey,
        segment,
      } as unknown as TSurveyDraft);

      setIsSurveySaving(false);
      if (updatedSurveyResponse?.data) {
        setLocalSurvey(updatedSurveyResponse.data);
        toast.success(t("environments.surveys.edit.changes_saved"));
        isSuccessfullySavedRef.current = true;
        router.refresh();
      } else {
        const errorMessage = getFormattedErrorMessage(updatedSurveyResponse);
        toast.error(errorMessage);
        return false;
      }
      return true;
    } catch (e) {
      console.error(e);
      setIsSurveySaving(false);
      toast.error(t("environments.surveys.edit.error_saving_changes"));
      return false;
    }
  };

  const handleSurveySave = async (): Promise<boolean> => {
    setIsSurveySaving(true);

    const isSurveyValidatedWithZod = validateSurveyWithZod();

    if (!isSurveyValidatedWithZod) {
      setIsSurveySaving(false);
      return false;
    }

    try {
      const isSurveyValidResult = isSurveyValid(localSurvey, selectedLanguageCode, t, responseCount);
      if (!isSurveyValidResult) {
        setIsSurveySaving(false);
        return false;
      }

      // Clean up blocks by removing isDraft from elements
      if (localSurvey.blocks) {
        localSurvey.blocks = localSurvey.blocks.map((block) => ({
          ...block,
          elements: block.elements.map((element) => {
            const { isDraft, ...rest } = element;
            return rest;
          }),
        }));
      }

      // Set questions to empty array for blocks-based surveys
      localSurvey.questions = [];

      localSurvey.endings = localSurvey.endings.map((ending) => {
        if (ending.type === "redirectToUrl") {
          return ZSurveyRedirectUrlCard.parse(ending);
        } else {
          return ZSurveyEndScreenCard.parse(ending);
        }
      });

      if (localSurvey.type === "app" && !localSurvey.triggers?.length) {
        toast.error(t("environments.surveys.edit.please_set_a_survey_trigger"));
        setIsSurveySaving(false);
        return false;
      }

      const segment = await handleSegmentUpdate();
      clearSurveyLocalStorage();
      const updatedSurveyResponse = await updateSurveyAction({ ...localSurvey, segment });

      setIsSurveySaving(false);
      if (updatedSurveyResponse?.data) {
        setLocalSurvey(updatedSurveyResponse.data);
        toast.success(t("environments.surveys.edit.changes_saved"));
        // Set flag to prevent beforeunload warning during router.refresh()
        isSuccessfullySavedRef.current = true;
        router.refresh();
      } else {
        const errorMessage = getFormattedErrorMessage(updatedSurveyResponse);
        toast.error(errorMessage);
        return false;
      }

      return true;
    } catch (e) {
      console.error(e);
      setIsSurveySaving(false);
      toast.error(t("environments.surveys.edit.error_saving_changes"));
      return false;
    }
  };

  const handleSaveAndGoBack = async () => {
    const isSurveySaved = await handleSurveySave();
    if (isSurveySaved) {
      router.back();
    }
  };

  const handleSurveyPublish = async () => {
    setIsSurveyPublishing(true);

    const isSurveyValidatedWithZod = validateSurveyWithZod();

    if (!isSurveyValidatedWithZod) {
      setIsSurveyPublishing(false);
      return;
    }

    try {
      const isSurveyValidResult = isSurveyValid(localSurvey, selectedLanguageCode, t, responseCount);
      if (!isSurveyValidResult) {
        setIsSurveyPublishing(false);
        return;
      }
      const status = "inProgress";
      const segment = await handleSegmentUpdate();
      clearSurveyLocalStorage();

      await updateSurveyAction({
        ...localSurvey,
        status,
        segment,
      });
      setIsSurveyPublishing(false);
      // Set flag to prevent beforeunload warning during navigation
      isSuccessfullySavedRef.current = true;
      router.push(`/environments/${environmentId}/surveys/${localSurvey.id}/summary?success=true`);
    } catch (error) {
      console.error(error);
      toast.error(t("environments.surveys.edit.error_publishing_survey"));
      setIsSurveyPublishing(false);
    }
  };

  const handleSubmitForReview = async () => {
    setIsSurveyPublishing(true);

    const isSurveyValidatedWithZod = validateSurveyWithZod();
    if (!isSurveyValidatedWithZod) {
      setIsSurveyPublishing(false);
      return;
    }

    try {
      const isSurveyValidResult = isSurveyValid(localSurvey, selectedLanguageCode, t, responseCount);
      if (!isSurveyValidResult) {
        setIsSurveyPublishing(false);
        return;
      }

      // Save the draft first
      const segment = await handleSegmentUpdate();
      clearSurveyLocalStorage();
      await updateSurveyDraftAction({
        ...localSurvey,
        segment,
      } as unknown as TSurveyDraft);

      // Submit for review
      const result = await submitForReviewAction({ surveyId: localSurvey.id });

      setIsSurveyPublishing(false);

      if (result?.data) {
        toast.success(t("environments.surveys.edit.submitted_for_review"));
        isSuccessfullySavedRef.current = true;
        router.push(`/environments/${environmentId}/surveys/${localSurvey.id}/summary`);
      } else {
        const errorMessage = getFormattedErrorMessage(result);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error(error);
      toast.error(t("environments.surveys.edit.error_publishing_survey"));
      setIsSurveyPublishing(false);
    }
  };

  return (
    <div className="border-b border-slate-200 bg-white px-5 py-2.5 sm:flex sm:items-center sm:justify-between">
      <div className="flex h-full items-center space-x-2 whitespace-nowrap">
        {!isCxMode && (
          <Button
            size="sm"
            variant="secondary"
            className="h-full"
            onClick={() => {
              handleBack();
            }}>
            <ArrowLeftIcon />
            {t("common.back")}
          </Button>
        )}
        <p className="hidden pl-4 font-semibold md:block">{project.name} / </p>
        <Input
          defaultValue={localSurvey.name}
          onChange={(e) => {
            const updatedSurvey = { ...localSurvey, name: e.target.value };
            setLocalSurvey(updatedSurvey);
          }}
          className="h-8 w-72 border-white py-0 hover:border-slate-200"
        />
      </div>

      <div className="mt-3 flex items-center gap-2 sm:mt-0 sm:ml-4">
        {!isStorageConfigured && (
          <div>
            <Alert variant="warning" size="small">
              <AlertTitle>{t("common.storage_not_configured")}</AlertTitle>
              <AlertButton className="flex items-center justify-center">
                <a
                  className="flex h-full w-full items-center justify-center !bg-white"
                  href="https://formbricks.com/docs/self-hosting/configuration/file-uploads"
                  target="_blank"
                  rel="noopener noreferrer">
                  <span>{t("common.learn_more")}</span>
                </a>
              </AlertButton>
            </Alert>
          </div>
        )}
        {responseCount > 0 && (
          <div>
            <Alert variant="warning" size="small">
              <AlertTitle>{t("environments.surveys.edit.caution_text")}</AlertTitle>
              <AlertButton onClick={() => setIsCautionDialogOpen(true)}>{t("common.learn_more")}</AlertButton>
            </Alert>
          </div>
        )}
        {/* Rejection reason banner */}
        {localSurvey.status === "draft" && localSurvey.reviewNote && (
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-800">
            <AlertTriangleIcon className="h-4 w-4 shrink-0" />
            <span className="max-w-xs truncate">{localSurvey.reviewNote}</span>
          </div>
        )}
        {/* Under Review badge */}
        {localSurvey.status === "underReview" && (
          <div className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
            <ClockIcon className="h-3.5 w-3.5" />
            {t("environments.surveys.edit.under_review")}
          </div>
        )}
        {/* Save button: show for draft and non-underReview statuses for non-admin members */}
        {!isCxMode && localSurvey.status !== "underReview" && (
          <Button
            disabled={disableSave}
            variant="secondary"
            size="sm"
            loading={isSurveySaving}
            onClick={() => (localSurvey.status === "draft" ? handleSurveySaveDraft() : handleSurveySave())}
            type="submit">
            {localSurvey.status === "draft" ? t("common.save_as_draft") : t("common.save")}
          </Button>
        )}
        {localSurvey.status !== "draft" && localSurvey.status !== "underReview" && (
          <Button
            disabled={disableSave}
            className="mr-3"
            size="sm"
            loading={isSurveySaving}
            onClick={() => handleSaveAndGoBack()}>
            {t("environments.surveys.edit.save_and_close")}
          </Button>
        )}
        {localSurvey.status === "draft" && audiencePrompt && !isLinkSurvey && (
          <Button
            size="sm"
            onClick={() => {
              setAudiencePrompt(false);
              setActiveId("settings");
            }}>
            {t("environments.surveys.edit.continue_to_settings")}
            <SettingsIcon />
          </Button>
        )}
        {/* Publish / Submit for Review button based on role */}
        {localSurvey.status === "draft" && (!audiencePrompt || isLinkSurvey) && (
          <Button
            size="sm"
            disabled={isSurveySaving || containsEmptyTriggers}
            loading={isSurveyPublishing}
            onClick={isAdmin ? handleSurveyPublish : handleSubmitForReview}>
            {isCxMode
              ? t("environments.surveys.edit.save_and_close")
              : isAdmin
                ? t("environments.surveys.edit.publish")
                : t("environments.surveys.edit.submit_for_review")}
          </Button>
        )}
      </div>
      <AlertDialog
        headerText={t("environments.surveys.edit.confirm_survey_changes")}
        open={isConfirmDialogOpen}
        setOpen={setConfirmDialogOpen}
        mainText={t("environments.surveys.edit.unsaved_changes_warning")}
        confirmBtnLabel={t("common.save")}
        declineBtnLabel={t("common.discard")}
        declineBtnVariant="destructive"
        onDecline={() => {
          setConfirmDialogOpen(false);
          router.back();
        }}
        onConfirm={handleSaveAndGoBack}
      />
    </div>
  );
};

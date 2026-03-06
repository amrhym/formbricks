"use client";

import { DndContext } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { createId } from "@paralleldrive/cuid2";
import { PlusIcon } from "lucide-react";
import { type JSX, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { getLanguageLabel } from "@hivecfm/i18n-utils/src/utils";
import { VOICE_MAX_MULTIPLE_CHOICE_OPTIONS } from "@hivecfm/types/channel";
import { TI18nString } from "@hivecfm/types/i18n";
import { TSurveyElementTypeEnum, TSurveyMultipleChoiceElement } from "@hivecfm/types/surveys/elements";
import { TShuffleOption, TSurvey } from "@hivecfm/types/surveys/types";
import { TUserLocale } from "@hivecfm/types/user";
import { createI18nString, extractLanguageCodes } from "@/lib/i18n/utils";
import { ElementFormInput } from "@/modules/survey/components/element-form-input";
import { BulkEditOptionsModal } from "@/modules/survey/editor/components/bulk-edit-options-modal";
import { ElementOptionChoice } from "@/modules/survey/editor/components/element-option-choice";
import { findOptionUsedInLogic } from "@/modules/survey/editor/lib/utils";
import { Button } from "@/modules/ui/components/button";
import { Label } from "@/modules/ui/components/label";
import { ShuffleOptionSelect } from "@/modules/ui/components/shuffle-option-select";

interface MultipleChoiceElementFormProps {
  localSurvey: TSurvey;
  element: TSurveyMultipleChoiceElement;
  elementIdx: number;
  updateElement: (elementIdx: number, updatedAttributes: Partial<TSurveyMultipleChoiceElement>) => void;
  selectedLanguageCode: string;
  setSelectedLanguageCode: (language: string) => void;
  isInvalid: boolean;
  locale: TUserLocale;
  isStorageConfigured: boolean;
  isExternalUrlsAllowed?: boolean;
  isVoiceChannel?: boolean;
}

export const MultipleChoiceElementForm = ({
  element,
  elementIdx,
  updateElement,
  isInvalid,
  localSurvey,
  selectedLanguageCode,
  setSelectedLanguageCode,
  locale,
  isStorageConfigured = true,
  isExternalUrlsAllowed,
  isVoiceChannel,
}: MultipleChoiceElementFormProps): JSX.Element => {
  const { t } = useTranslation();
  const lastChoiceRef = useRef<HTMLInputElement>(null);
  const [isNew, setIsNew] = useState(true);
  const [isInvalidValue, setisInvalidValue] = useState<string | null>(null);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

  const elementRef = useRef<HTMLInputElement>(null);
  const surveyLanguageCodes = extractLanguageCodes(localSurvey.languages);
  const surveyLanguages = localSurvey.languages ?? [];
  const shuffleOptionsTypes = {
    none: {
      id: "none",
      label: t("environments.surveys.edit.keep_current_order"),
      show: true,
    },
    all: {
      id: "all",
      label: t("environments.surveys.edit.randomize_all"),
      show: element.choices.every((c) => c.id !== "other" && c.id !== "none"),
    },
    exceptLast: {
      id: "exceptLast",
      label: t("environments.surveys.edit.randomize_all_except_last"),
      show: true,
    },
  };

  const updateChoice = (choiceIdx: number, updatedAttributes: { label: TI18nString }) => {
    let newChoices: any[] = [];
    if (element.choices) {
      newChoices = element.choices.map((choice, idx) => {
        if (idx !== choiceIdx) return choice;
        return { ...choice, ...updatedAttributes };
      });
    }

    updateElement(elementIdx, {
      choices: newChoices,
    });
  };

  const regularChoices = useMemo(
    () => element.choices?.filter((c) => c.id !== "other" && c.id !== "none"),
    [element.choices]
  );

  // Get the display name for the selected language (for multi-language surveys)
  const bulkEditButtonLabel = useMemo(() => {
    if (localSurvey.languages.length <= 1) {
      return t("environments.surveys.edit.bulk_edit");
    }

    const languageCode =
      selectedLanguageCode === "default"
        ? localSurvey.languages.find((lang) => lang.default)?.language.code
        : selectedLanguageCode;

    const languageName = languageCode ? getLanguageLabel(languageCode, locale) : "";
    return `${t("environments.surveys.edit.bulk_edit")} (${languageName})`;
  }, [localSurvey.languages, selectedLanguageCode, locale, t]);

  const ensureSpecialChoicesOrder = (choices: TSurveyMultipleChoiceElement["choices"]) => {
    const regularChoicesFromInput = choices.filter((c) => c.id !== "other" && c.id !== "none");
    const otherChoice = choices.find((c) => c.id === "other");
    const noneChoice = choices.find((c) => c.id === "none");
    // [regularChoices, otherChoice, noneChoice]
    return [
      ...regularChoicesFromInput,
      ...(otherChoice ? [otherChoice] : []),
      ...(noneChoice ? [noneChoice] : []),
    ];
  };

  const addChoice = (choiceIdx?: number) => {
    // Enforce max 9 options for voice channels (DTMF keys 1-9)
    if (isVoiceChannel) {
      const regularCount = element.choices.filter((c) => c.id !== "other" && c.id !== "none").length;
      if (regularCount >= VOICE_MAX_MULTIPLE_CHOICE_OPTIONS) {
        toast.error(
          t("environments.surveys.edit.voice_max_options", {
            max: VOICE_MAX_MULTIPLE_CHOICE_OPTIONS,
            defaultValue: `Voice channels support a maximum of ${VOICE_MAX_MULTIPLE_CHOICE_OPTIONS} options (DTMF keys 1-9)`,
          })
        );
        return;
      }
    }

    setIsNew(false);

    const newChoice = {
      id: createId(),
      label: createI18nString("", surveyLanguageCodes),
    };

    if (choiceIdx !== undefined) {
      regularChoices.splice(choiceIdx + 1, 0, newChoice);
    } else {
      regularChoices.push(newChoice);
    }

    const newChoices = ensureSpecialChoicesOrder([
      ...regularChoices,
      ...element.choices.filter((c) => c.id === "other" || c.id === "none"),
    ]);

    updateElement(elementIdx, { choices: newChoices });
  };

  const addSpecialChoice = (choiceId: "other" | "none", labelText: string) => {
    if (element.choices.some((c) => c.id === choiceId)) return;

    const newChoice = {
      id: choiceId,
      label: createI18nString(labelText, surveyLanguageCodes),
    };

    const newChoices = ensureSpecialChoicesOrder([...element.choices, newChoice]);

    updateElement(elementIdx, {
      choices: newChoices,
      ...(element.shuffleOption === shuffleOptionsTypes.all.id && {
        shuffleOption: shuffleOptionsTypes.exceptLast.id as TShuffleOption,
      }),
    });
  };

  const deleteChoice = (choiceIdx: number) => {
    const choiceToDelete = element.choices[choiceIdx].id;

    if (choiceToDelete !== "other" && choiceToDelete !== "none") {
      const idx = findOptionUsedInLogic(localSurvey, element.id, choiceToDelete);
      if (idx !== -1) {
        toast.error(
          t("environments.surveys.edit.option_used_in_logic_error", {
            questionIndex: idx + 1,
          })
        );
        return;
      }
    }

    const newChoices = !element.choices ? [] : element.choices.filter((_, idx) => idx !== choiceIdx);
    const choiceValue = element.choices[choiceIdx].label[selectedLanguageCode];
    if (isInvalidValue === choiceValue) {
      setisInvalidValue(null);
    }

    updateElement(elementIdx, {
      choices: newChoices,
    });
  };

  useEffect(() => {
    if (lastChoiceRef.current) {
      lastChoiceRef.current?.focus();
    }
  }, [element.choices?.length]);

  // This effect will run once on initial render, setting focus to the element input.
  useEffect(() => {
    if (isNew && elementRef.current) {
      elementRef.current.focus();
    }
  }, [isNew]);

  const specialChoices = [
    {
      id: "other",
      label: t("common.other"),
      addChoice: () => addSpecialChoice("other", t("common.other")),
      addButtonText: t("environments.surveys.edit.add_other"),
    },
    {
      id: "none",
      label: t("common.none_of_the_above"),
      addChoice: () => addSpecialChoice("none", t("common.none_of_the_above")),
      addButtonText: t("environments.surveys.edit.add_none_of_the_above"),
    },
  ];

  // Auto animate
  const [parent] = useAutoAnimate();

  return (
    <form>
      <ElementFormInput
        id="headline"
        value={element.headline}
        label={t("environments.surveys.edit.question") + "*"}
        localSurvey={localSurvey}
        elementIdx={elementIdx}
        isInvalid={isInvalid}
        updateElement={updateElement}
        selectedLanguageCode={selectedLanguageCode}
        setSelectedLanguageCode={setSelectedLanguageCode}
        locale={locale}
        isStorageConfigured={isStorageConfigured}
        autoFocus={!element.headline?.default || element.headline.default.trim() === ""}
        isExternalUrlsAllowed={isExternalUrlsAllowed}
        isVoiceChannel={isVoiceChannel}
      />

      <div ref={parent}>
        {element.subheader !== undefined && (
          <div className="inline-flex w-full items-center">
            <div className="w-full">
              <ElementFormInput
                id="subheader"
                value={element.subheader}
                label={t("common.description")}
                localSurvey={localSurvey}
                elementIdx={elementIdx}
                isInvalid={isInvalid}
                updateElement={updateElement}
                selectedLanguageCode={selectedLanguageCode}
                setSelectedLanguageCode={setSelectedLanguageCode}
                locale={locale}
                isStorageConfigured={isStorageConfigured}
                autoFocus={!element.subheader?.default || element.subheader.default.trim() === ""}
                isExternalUrlsAllowed={isExternalUrlsAllowed}
              />
            </div>
          </div>
        )}
        {element.subheader === undefined && (
          <Button
            size="sm"
            variant="secondary"
            className="mt-3"
            type="button"
            onClick={() => {
              updateElement(elementIdx, {
                subheader: createI18nString("", surveyLanguageCodes),
              });
            }}>
            <PlusIcon className="mr-1 h-4 w-4" />
            {t("environments.surveys.edit.add_description")}
          </Button>
        )}
      </div>

      <div className="mt-3">
        <Label htmlFor="choices">Options*</Label>
        {isVoiceChannel && (
          <div className="mt-1 mb-2 flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
            <span className="font-semibold">IVR:</span>
            <span>
              {t("environments.surveys.edit.voice_dtmf_hint", {
                max: VOICE_MAX_MULTIPLE_CHOICE_OPTIONS,
                defaultValue: `Options map to DTMF keys 1-${VOICE_MAX_MULTIPLE_CHOICE_OPTIONS}. Callers press the number to select.`,
              })}
            </span>
            <span className="ml-auto font-medium">
              {element.choices.filter((c) => c.id !== "other" && c.id !== "none").length}/
              {VOICE_MAX_MULTIPLE_CHOICE_OPTIONS}
            </span>
          </div>
        )}
        <div className="mt-2" id="choices">
          <DndContext
            id="multi-choice-choices"
            onDragEnd={(event) => {
              const { active, over } = event;

              if (
                active.id === "other" ||
                over?.id === "other" ||
                active.id === "none" ||
                over?.id === "none"
              ) {
                return;
              }

              if (!active || !over) {
                return;
              }

              const activeIndex = element.choices.findIndex((choice) => choice.id === active.id);
              const overIndex = element.choices.findIndex((choice) => choice.id === over.id);

              const newChoices = [...element.choices];

              newChoices.splice(activeIndex, 1);
              newChoices.splice(overIndex, 0, element.choices[activeIndex]);

              updateElement(elementIdx, { choices: newChoices });
            }}>
            <SortableContext items={element.choices} strategy={verticalListSortingStrategy}>
              <div className="flex max-h-[25dvh] flex-col gap-2 overflow-y-auto py-1 pr-1" ref={parent}>
                {element.choices?.map((choice, choiceIdx) => (
                  <div key={choice.id} className="flex items-center gap-1.5">
                    {isVoiceChannel && choice.id !== "other" && choice.id !== "none" && (
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-slate-700 text-xs font-bold text-white">
                        {choiceIdx + 1}
                      </div>
                    )}
                    <div className="flex-1">
                      <ElementOptionChoice
                        choice={choice}
                        choiceIdx={choiceIdx}
                        elementIdx={elementIdx}
                        updateChoice={updateChoice}
                        deleteChoice={deleteChoice}
                        addChoice={addChoice}
                        isInvalid={isInvalid}
                        localSurvey={localSurvey}
                        selectedLanguageCode={selectedLanguageCode}
                        setSelectedLanguageCode={setSelectedLanguageCode}
                        surveyLanguages={surveyLanguages}
                        element={element}
                        updateElement={updateElement}
                        surveyLanguageCodes={surveyLanguageCodes}
                        locale={locale}
                        isStorageConfigured={isStorageConfigured}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="mt-2">
          <div className="mt-2 flex items-center justify-between space-x-2">
            <div className="flex gap-2">
              {specialChoices.map((specialChoice) => {
                if (element.choices.some((c) => c.id === specialChoice.id)) return null;
                return (
                  <Button
                    size="sm"
                    key={specialChoice.id}
                    variant="secondary"
                    type="button"
                    onClick={() => specialChoice.addChoice()}>
                    {specialChoice.addButtonText}
                  </Button>
                );
              })}
              <Button size="sm" variant="secondary" type="button" onClick={() => setIsBulkEditOpen(true)}>
                {bulkEditButtonLabel}
              </Button>
            </div>
            <Button
              size="sm"
              variant="secondary"
              type="button"
              onClick={() => {
                updateElement(elementIdx, {
                  type:
                    element.type === TSurveyElementTypeEnum.MultipleChoiceMulti
                      ? TSurveyElementTypeEnum.MultipleChoiceSingle
                      : TSurveyElementTypeEnum.MultipleChoiceMulti,
                });
              }}>
              {element.type === TSurveyElementTypeEnum.MultipleChoiceSingle
                ? t("environments.surveys.edit.convert_to_multiple_choice")
                : t("environments.surveys.edit.convert_to_single_choice")}
            </Button>

            <div className="flex flex-1 items-center justify-end gap-2">
              <ShuffleOptionSelect
                elementIdx={elementIdx}
                shuffleOption={element.shuffleOption}
                updateElement={updateElement}
                shuffleOptionsTypes={shuffleOptionsTypes}
              />
            </div>
          </div>
        </div>
      </div>
      <BulkEditOptionsModal
        isOpen={isBulkEditOpen}
        onClose={() => setIsBulkEditOpen(false)}
        regularChoices={regularChoices}
        onSave={(updatedChoices) => {
          const newChoices = ensureSpecialChoicesOrder([
            ...updatedChoices,
            ...element.choices.filter((c) => c.id === "other" || c.id === "none"),
          ]);
          updateElement(elementIdx, { choices: newChoices });
        }}
        element={element}
        localSurvey={localSurvey}
        selectedLanguageCode={selectedLanguageCode}
        surveyLanguageCodes={surveyLanguageCodes}
        locale={locale}
      />
    </form>
  );
};

import { VOICE_COMPATIBLE_ELEMENT_TYPES, VOICE_MAX_MULTIPLE_CHOICE_OPTIONS } from "@hivecfm/types/channel";
import { TSurveyBlock } from "@hivecfm/types/surveys/blocks";
import {
  TSurveyElement,
  TSurveyElementTypeEnum,
  TSurveyMultipleChoiceElement,
  TSurveyRatingElement,
} from "@hivecfm/types/surveys/elements";
import { TConditionGroup, TSingleCondition } from "@hivecfm/types/surveys/logic";
import { TSurvey } from "@hivecfm/types/surveys/types";
import { parseRecallInfo } from "@/lib/utils/recall";

interface IvrInputConfigNumeric {
  inputType: "numeric";
  min: number;
  max: number;
}

interface IvrInputConfigDtmfOption {
  key: string;
  label: string;
}

interface IvrInputConfigDtmfChoice {
  inputType: "dtmf_choice";
  min: number;
  max: number;
  options: IvrInputConfigDtmfOption[];
}

interface IvrInputConfigSpeech {
  inputType: "speech";
  min: number;
  max: number;
  maxDurationSeconds: number;
  silenceTimeoutSeconds: number;
}

type IvrInputConfig = IvrInputConfigNumeric | IvrInputConfigDtmfChoice | IvrInputConfigSpeech;

export interface IvrQuestion {
  questionId: string;
  questionIndex: number;
  blockId: string;
  blockName: string;
  questionText: string;
  subheader: string | null;
  audioUrl: string | null;
  audioSource: string;
  genesysPromptName: string | null;
  type: string;
  required: boolean;
  inputConfig: IvrInputConfig;
}

export interface IvrSurveyConfig {
  id: string;
  name: string;
  totalQuestions: number;
  language: string;
  availableLanguages: string[];
  welcomeMessage: string | null;
  welcomeAudioUrl: string | null;
  welcomeAudioSource: string;
  welcomeGenesysPromptName: string | null;
  thankYouMessage: string | null;
  thankYouAudioUrl: string | null;
  thankYouAudioSource: string;
  thankYouGenesysPromptName: string | null;
  errorMessage: string | null;
  inputTimeout: number;
  maxRetries: number;
  bargeinEnabled: boolean;
  hiddenFields: Record<string, string>;
}

export interface IvrSurveyResponse {
  survey: IvrSurveyConfig;
  questions: IvrQuestion[];
}

const getLanguageText = (
  i18nString?: Record<string, string>,
  langCode?: string,
  hiddenFields?: Record<string, string>
): string | null => {
  if (!i18nString) return null;
  const text = (langCode && i18nString[langCode]) || i18nString.default || null;
  if (!text || !hiddenFields || Object.keys(hiddenFields).length === 0) return text;
  return text.includes("#recall:") ? parseRecallInfo(text, hiddenFields) : text;
};

const buildInputConfig = (
  element: TSurveyElement,
  hiddenFields?: Record<string, string>,
  lang?: string
): IvrInputConfig | null => {
  switch (element.type) {
    case TSurveyElementTypeEnum.NPS:
      return { inputType: "numeric", min: 0, max: 10 };

    case TSurveyElementTypeEnum.Rating: {
      const ratingElement = element as TSurveyRatingElement;
      return { inputType: "numeric", min: 1, max: ratingElement.range };
    }

    case TSurveyElementTypeEnum.MultipleChoiceSingle: {
      const mcElement = element as TSurveyMultipleChoiceElement;
      const choices = mcElement.choices.slice(0, VOICE_MAX_MULTIPLE_CHOICE_OPTIONS);
      return {
        inputType: "dtmf_choice",
        min: 1,
        max: choices.length,
        options: choices.map((choice, index) => ({
          key: String(index + 1),
          label: getLanguageText(choice.label, lang, hiddenFields) || `Option ${index + 1}`,
        })),
      };
    }

    case TSurveyElementTypeEnum.CTA:
      return {
        inputType: "dtmf_choice",
        min: 1,
        max: 1,
        options: [{ key: "1", label: "Continue" }],
      };

    case TSurveyElementTypeEnum.OpenText:
      return {
        inputType: "speech",
        min: 0,
        max: 0,
        maxDurationSeconds: 30,
        silenceTimeoutSeconds: 3,
      };

    default:
      return null;
  }
};

/**
 * Builds the IVR media endpoint URL for a given question's audio.
 */
const buildMediaUrl = (
  baseUrl: string,
  environmentId: string,
  surveyId: string,
  questionId: string,
  lang?: string
): string => {
  const url = `${baseUrl}/api/v1/client/${environmentId}/ivr/${surveyId}/media/${questionId}`;
  return lang ? `${url}?lang=${lang}` : url;
};

// ─── Lightweight condition evaluator for hidden fields at IVR GET time ───

type ConditionNode = TSingleCondition | TConditionGroup;

const isConditionGroup = (node: ConditionNode): node is TConditionGroup => {
  return "connector" in node && "conditions" in node;
};

const getOperandValue = (
  operand: { type: string; value: string } | undefined,
  data: Record<string, string>
): string | undefined => {
  if (!operand) return undefined;
  if (operand.type === "hiddenField") return data[operand.value];
  if (operand.type === "static") return operand.value;
  // At GET time we don't have element answers or variable state
  return undefined;
};

const evaluateSingleCondition = (condition: TSingleCondition, data: Record<string, string>): boolean => {
  const left = getOperandValue(condition.leftOperand, data);
  const right = getOperandValue(condition.rightOperand as any, data);

  switch (condition.operator) {
    case "equals":
      return left === right;
    case "doesNotEqual":
      return left !== right;
    case "contains":
      return left != null && right != null && String(left).includes(String(right));
    case "doesNotContain":
      return left != null && right != null && !String(left).includes(String(right));
    case "startsWith":
      return left != null && right != null && String(left).startsWith(String(right));
    case "doesNotStartWith":
      return left != null && right != null && !String(left).startsWith(String(right));
    case "endsWith":
      return left != null && right != null && String(left).endsWith(String(right));
    case "doesNotEndWith":
      return left != null && right != null && !String(left).endsWith(String(right));
    case "isGreaterThan":
      return Number(left) > Number(right);
    case "isLessThan":
      return Number(left) < Number(right);
    case "isGreaterThanOrEqual":
      return Number(left) >= Number(right);
    case "isLessThanOrEqual":
      return Number(left) <= Number(right);
    case "isSet":
    case "isNotEmpty":
      return left !== undefined && left !== null && left !== "";
    case "isNotSet":
      return left === undefined || left === null || left === "";
    case "isEmpty":
      return left === "";
    default:
      // For operators that need element/variable context, default to true (include block)
      return true;
  }
};

const evaluateConditionGroup = (group: TConditionGroup, data: Record<string, string>): boolean => {
  const results = group.conditions.map((condition) => {
    if (isConditionGroup(condition)) {
      return evaluateConditionGroup(condition, data);
    }
    return evaluateSingleCondition(condition as TSingleCondition, data);
  });

  return group.connector === "or" ? results.some((r) => r) : results.every((r) => r);
};

/**
 * Evaluates block logic conditions using hidden fields to determine which blocks
 * to include and in what order, following jumpToBlock directives.
 */
const filterBlocksByLogic = (survey: TSurvey, hiddenFields: Record<string, string>): TSurveyBlock[] => {
  const hasAnyLogic = survey.blocks.some((block) => block.logic && block.logic.length > 0);
  if (Object.keys(hiddenFields).length === 0 || !hasAnyLogic) {
    return survey.blocks;
  }

  const result: TSurveyBlock[] = [];
  let currentBlockIndex = 0;
  const visited = new Set<number>();

  while (currentBlockIndex < survey.blocks.length && !visited.has(currentBlockIndex)) {
    visited.add(currentBlockIndex);
    const block = survey.blocks[currentBlockIndex];
    let jumpTarget: string | undefined;

    // Evaluate block logic rules
    if (block.logic && block.logic.length > 0) {
      for (const rule of block.logic) {
        if (evaluateConditionGroup(rule.conditions, hiddenFields)) {
          // Find jumpToBlock action
          for (const action of rule.actions) {
            if (action.objective === "jumpToBlock" && !jumpTarget) {
              jumpTarget = action.target;
            }
          }
          break; // First matching rule wins
        }
      }
    }

    result.push(block);

    if (jumpTarget) {
      const targetIndex = survey.blocks.findIndex((b) => b.id === jumpTarget);
      currentBlockIndex = targetIndex >= 0 ? targetIndex : currentBlockIndex + 1;
    } else if (block.logicFallback) {
      const fallbackIndex = survey.blocks.findIndex((b) => b.id === block.logicFallback);
      currentBlockIndex = fallbackIndex >= 0 ? fallbackIndex : currentBlockIndex + 1;
    } else {
      currentBlockIndex++;
    }
  }

  return result;
};

/**
 * Linearizes a survey into a flat list of IVR-compatible questions.
 * Iterates through blocks → elements, filtering to voice-compatible types only.
 * Builds DTMF input configuration per question type.
 *
 * When hiddenFields are provided, block logic conditions are evaluated server-side
 * to determine which blocks to include and in what order.
 *
 * @param baseUrl - The base URL of the app used to construct media endpoint URLs.
 * @param hiddenFields - Hidden field values passed as query params for logic evaluation.
 */
export const linearizeSurveyForIvr = (
  survey: TSurvey,
  baseUrl: string,
  hiddenFields: Record<string, string> = {},
  lang?: string
): IvrSurveyResponse => {
  const questions: IvrQuestion[] = [];
  let questionIndex = 0;

  // Compute language metadata
  const defaultLangCode = survey.languages?.find((l: any) => l.default)?.language?.code || "default";
  const availableLanguages = survey.languages
    ?.filter((l: any) => l.enabled)
    .map((l: any) => l.language?.code) || ["default"];

  // Get voice channel config if available
  const channelConfig = survey.channelId ? (survey as any).channel?.config : null;
  const voiceConfig =
    channelConfig && channelConfig.type === "voice"
      ? channelConfig
      : {
          inputTimeout: 5,
          maxRetries: 3,
          bargeinEnabled: true,
          welcomeMessage: null,
          thankYouMessage: null,
          errorMessage: null,
        };

  // Filter blocks based on logic conditions and hidden fields
  const blocks = filterBlocksByLogic(survey, hiddenFields);

  // Iterate blocks to build linearized question list
  for (const block of blocks) {
    for (const element of block.elements) {
      if (!VOICE_COMPATIBLE_ELEMENT_TYPES.includes(element.type)) {
        continue;
      }

      const inputConfig = buildInputConfig(element, hiddenFields, lang);
      if (!inputConfig) continue;

      questionIndex++;

      // Resolve audio URL from i18n map
      const audioUrlMap = element.audioUrl as Record<string, string> | undefined;
      const resolvedAudioKey = lang && audioUrlMap?.[lang] ? lang : "default";
      const rawAudioUrl = audioUrlMap?.[resolvedAudioKey] || null;

      // Single prompt per element — Genesys uses flow language to pick the right resource
      questions.push({
        questionId: element.id,
        questionIndex,
        blockId: block.id,
        blockName: block.name,
        questionText: getLanguageText(element.headline, lang, hiddenFields) || "",
        subheader: getLanguageText(element.subheader, lang, hiddenFields) || null,
        audioUrl: rawAudioUrl
          ? buildMediaUrl(baseUrl, survey.environmentId, survey.id, element.id, lang)
          : null,
        audioSource: element.audioSource || "tts",
        genesysPromptName: rawAudioUrl
          ? `hivecfm_${survey.id}_${element.id}`.replace(/[^a-zA-Z0-9_]/g, "_")
          : null,
        type: element.type,
        required: element.required,
        inputConfig,
      });
    }
  }

  // Build welcome/thank you messages from survey endings
  const firstEndingMessage =
    survey.endings.length > 0 && survey.endings[0].type === "endScreen"
      ? getLanguageText(survey.endings[0].headline, lang, hiddenFields)
      : null;

  // Resolve welcome card audio from i18n map
  const welcomeAudioUrlMap = (survey.welcomeCard as any)?.audioUrl as Record<string, string> | undefined;
  const welcomeAudioKey = lang && welcomeAudioUrlMap?.[lang] ? lang : "default";
  const welcomeRawAudioUrl = welcomeAudioUrlMap?.[welcomeAudioKey] || null;

  // Resolve ending card audio from i18n map
  const endingAudioUrlMap =
    survey.endings.length > 0 && survey.endings[0].type === "endScreen"
      ? ((survey.endings[0] as any)?.audioUrl as Record<string, string> | undefined)
      : undefined;
  const endingAudioKey = lang && endingAudioUrlMap?.[lang] ? lang : "default";
  const endingRawAudioUrl = endingAudioUrlMap?.[endingAudioKey] || null;

  // Build prompt suffix for non-default languages
  // No language suffix — single prompt per element, Genesys uses flow language to pick resource

  const surveyConfig: IvrSurveyConfig = {
    id: survey.id,
    name: survey.name,
    totalQuestions: questions.length,
    language: lang || defaultLangCode,
    availableLanguages,
    welcomeMessage: survey.welcomeCard.enabled
      ? getLanguageText(survey.welcomeCard.headline, lang, hiddenFields) || null
      : null,
    welcomeAudioUrl: welcomeRawAudioUrl
      ? buildMediaUrl(baseUrl, survey.environmentId, survey.id, "welcome", lang)
      : null,
    welcomeAudioSource: (survey.welcomeCard as any)?.audioSource || "tts",
    welcomeGenesysPromptName: welcomeRawAudioUrl
      ? `hivecfm_${survey.id}_welcome`.replace(/[^a-zA-Z0-9_]/g, "_")
      : null,
    thankYouMessage: voiceConfig.thankYouMessage || firstEndingMessage,
    thankYouAudioUrl: endingRawAudioUrl
      ? buildMediaUrl(baseUrl, survey.environmentId, survey.id, "ending", lang)
      : null,
    thankYouAudioSource:
      survey.endings.length > 0 && survey.endings[0].type === "endScreen"
        ? (survey.endings[0] as any).audioSource || "tts"
        : "tts",
    thankYouGenesysPromptName: endingRawAudioUrl
      ? `hivecfm_${survey.id}_ending`.replace(/[^a-zA-Z0-9_]/g, "_")
      : null,
    errorMessage: voiceConfig.errorMessage || "Invalid input, please try again",
    inputTimeout: voiceConfig.inputTimeout,
    maxRetries: voiceConfig.maxRetries,
    bargeinEnabled: voiceConfig.bargeinEnabled,
    hiddenFields,
  };

  return {
    survey: surveyConfig,
    questions,
  };
};

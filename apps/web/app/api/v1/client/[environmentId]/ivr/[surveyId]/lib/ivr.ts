import { VOICE_COMPATIBLE_ELEMENT_TYPES, VOICE_MAX_MULTIPLE_CHOICE_OPTIONS } from "@hivecfm/types/channel";
import {
  TSurveyElement,
  TSurveyElementTypeEnum,
  TSurveyMultipleChoiceElement,
  TSurveyRatingElement,
} from "@hivecfm/types/surveys/elements";
import { TSurvey } from "@hivecfm/types/surveys/types";

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
  options: IvrInputConfigDtmfOption[];
}

type IvrInputConfig = IvrInputConfigNumeric | IvrInputConfigDtmfChoice;

export interface IvrQuestion {
  questionId: string;
  questionIndex: number;
  blockId: string;
  blockName: string;
  questionText: string;
  subheader: string | null;
  audioUrl: string | null;
  type: string;
  required: boolean;
  inputConfig: IvrInputConfig;
}

export interface IvrSurveyConfig {
  id: string;
  name: string;
  totalQuestions: number;
  welcomeMessage: string | null;
  welcomeAudioUrl: string | null;
  thankYouMessage: string | null;
  thankYouAudioUrl: string | null;
  errorMessage: string | null;
  inputTimeout: number;
  maxRetries: number;
  bargeinEnabled: boolean;
}

export interface IvrSurveyResponse {
  survey: IvrSurveyConfig;
  questions: IvrQuestion[];
}

const getDefaultLanguageText = (i18nString?: Record<string, string>): string | null => {
  if (!i18nString) return null;
  return i18nString.default || null;
};

const buildInputConfig = (element: TSurveyElement): IvrInputConfig | null => {
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
        options: choices.map((choice, index) => ({
          key: String(index + 1),
          label: getDefaultLanguageText(choice.label) || `Option ${index + 1}`,
        })),
      };
    }

    case TSurveyElementTypeEnum.CTA:
      return {
        inputType: "dtmf_choice",
        options: [{ key: "1", label: "Continue" }],
      };

    default:
      return null;
  }
};

/**
 * Builds the IVR media endpoint URL for a given question's audio.
 * This URL proxies the audio file from S3 with proper audio headers and CORS,
 * so external IVR systems can fetch it directly without auth.
 */
const buildMediaUrl = (
  baseUrl: string,
  environmentId: string,
  surveyId: string,
  questionId: string
): string => {
  return `${baseUrl}/api/v1/client/${environmentId}/ivr/${surveyId}/media/${questionId}`;
};

/**
 * Linearizes a survey into a flat list of IVR-compatible questions.
 * Iterates through blocks → elements, filtering to voice-compatible types only.
 * Builds DTMF input configuration per question type.
 *
 * @param baseUrl - The base URL of the app (e.g. https://app.example.com) used to
 *                  construct media endpoint URLs for audio files.
 */
export const linearizeSurveyForIvr = (survey: TSurvey, baseUrl: string): IvrSurveyResponse => {
  const questions: IvrQuestion[] = [];
  let questionIndex = 0;

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

  // Iterate blocks to build linearized question list
  for (const block of survey.blocks) {
    for (const element of block.elements) {
      if (!VOICE_COMPATIBLE_ELEMENT_TYPES.includes(element.type)) {
        continue;
      }

      const inputConfig = buildInputConfig(element);
      if (!inputConfig) continue;

      questionIndex++;

      questions.push({
        questionId: element.id,
        questionIndex,
        blockId: block.id,
        blockName: block.name,
        questionText: getDefaultLanguageText(element.headline) || "",
        subheader: getDefaultLanguageText(element.subheader) || null,
        audioUrl: element.audioUrl
          ? buildMediaUrl(baseUrl, survey.environmentId, survey.id, element.id)
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
      ? getDefaultLanguageText(survey.endings[0].headline)
      : null;

  const surveyConfig: IvrSurveyConfig = {
    id: survey.id,
    name: survey.name,
    totalQuestions: questions.length,
    welcomeMessage: survey.welcomeCard.enabled
      ? getDefaultLanguageText(survey.welcomeCard.headline) || null
      : null,
    welcomeAudioUrl: null,
    thankYouMessage: voiceConfig.thankYouMessage || firstEndingMessage,
    thankYouAudioUrl: null,
    errorMessage: voiceConfig.errorMessage || "Invalid input, please try again",
    inputTimeout: voiceConfig.inputTimeout,
    maxRetries: voiceConfig.maxRetries,
    bargeinEnabled: voiceConfig.bargeinEnabled,
  };

  return {
    survey: surveyConfig,
    questions,
  };
};

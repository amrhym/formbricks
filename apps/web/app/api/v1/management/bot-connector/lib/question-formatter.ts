/**
 * Bot Connector Question Formatter
 *
 * Converts HiveCFM survey questions into Genesys Bot Connector reply messages
 * with quick reply buttons where applicable.
 */
import type { TI18nString } from "@hivecfm/types/i18n";
import { TSurveyQuestionTypeEnum } from "@hivecfm/types/surveys/types";
import type { TBotReplyContent, TBotReplyMessage } from "./types";

/** Strip HTML tags from a string, returning plain text */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

/** Extract text from i18n string, falling back to "default" key */
function getText(i18nStr: TI18nString | string | undefined, language: string = "default"): string {
  if (!i18nStr) return "";
  if (typeof i18nStr === "string") return stripHtml(i18nStr);
  const raw = i18nStr[language] || i18nStr["default"] || Object.values(i18nStr)[0] || "";
  return stripHtml(raw);
}

/**
 * Format a survey question as a Genesys Bot Connector reply message
 */
export function formatQuestionAsReply(question: any, language: string = "default"): TBotReplyMessage {
  const headline = getText(question.headline, language);
  const content: TBotReplyContent[] = [{ contentType: "Text", text: headline }];

  switch (question.type) {
    case TSurveyQuestionTypeEnum.Rating: {
      const range = question.range || 5;
      for (let i = 1; i <= range; i++) {
        content.push({
          contentType: "QuickReply",
          quickReply: { text: String(i), payload: String(i), action: "Message" },
        });
      }
      break;
    }

    case TSurveyQuestionTypeEnum.NPS: {
      // NPS is 0-10, too many for quick replies. Use key points.
      for (const val of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
        content.push({
          contentType: "QuickReply",
          quickReply: { text: String(val), payload: String(val), action: "Message" },
        });
      }
      break;
    }

    case TSurveyQuestionTypeEnum.MultipleChoiceSingle:
    case TSurveyQuestionTypeEnum.MultipleChoiceMulti: {
      const choices = question.choices || [];
      for (const choice of choices) {
        const label = getText(choice.label, language);
        content.push({
          contentType: "QuickReply",
          quickReply: { text: label, payload: choice.id, action: "Message" },
        });
      }
      break;
    }

    case TSurveyQuestionTypeEnum.CTA: {
      const buttonLabel = getText(question.buttonLabel, language) || "Continue";
      content.push({
        contentType: "QuickReply",
        quickReply: { text: buttonLabel, payload: "clicked", action: "Message" },
      });
      if (question.dismissButtonLabel) {
        const dismissLabel = getText(question.dismissButtonLabel, language);
        content.push({
          contentType: "QuickReply",
          quickReply: { text: dismissLabel, payload: "dismissed", action: "Message" },
        });
      }
      break;
    }

    case TSurveyQuestionTypeEnum.Consent: {
      content.push({
        contentType: "QuickReply",
        quickReply: { text: "Yes", payload: "accepted", action: "Message" },
      });
      content.push({
        contentType: "QuickReply",
        quickReply: { text: "No", payload: "dismissed", action: "Message" },
      });
      break;
    }

    case TSurveyQuestionTypeEnum.OpenText:
    case TSurveyQuestionTypeEnum.Date:
    case TSurveyQuestionTypeEnum.Address:
    case TSurveyQuestionTypeEnum.ContactInfo:
      // No buttons - customer types free text
      break;

    case TSurveyQuestionTypeEnum.Ranking: {
      // For ranking, show the options and instruct ordering
      const choices = question.choices || [];
      const choiceLabels = choices.map((c: any) => getText(c.label, language));
      if (choiceLabels.length > 0) {
        content[0].text = `${headline}\n\nOptions: ${choiceLabels.join(", ")}\nPlease rank them by typing them in order, separated by commas.`;
      }
      break;
    }

    default:
      // Unknown type - just show the headline as text
      break;
  }

  return { type: "Structured", content };
}

/**
 * Parse customer response for a given question type and return the normalized value
 */
export function parseAnswer(question: any, utterance: string, language: string = "default"): unknown {
  const trimmed = utterance.trim();

  switch (question.type) {
    case TSurveyQuestionTypeEnum.Rating: {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num)) return num;
      return trimmed;
    }

    case TSurveyQuestionTypeEnum.NPS: {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num)) return num;
      return trimmed;
    }

    case TSurveyQuestionTypeEnum.MultipleChoiceSingle: {
      // Try matching by choice ID (payload from quick reply)
      const choices = question.choices || [];
      const matchById = choices.find((c: any) => c.id === trimmed);
      if (matchById) return getText(matchById.label, language);

      // Try matching by label text
      const matchByLabel = choices.find(
        (c: any) => getText(c.label, language).toLowerCase() === trimmed.toLowerCase()
      );
      if (matchByLabel) return getText(matchByLabel.label, language);

      // Try matching by index (1-based)
      const idx = parseInt(trimmed, 10);
      if (!isNaN(idx) && idx >= 1 && idx <= choices.length) {
        return getText(choices[idx - 1].label, language);
      }

      return trimmed;
    }

    case TSurveyQuestionTypeEnum.MultipleChoiceMulti: {
      // Multiple selections separated by comma
      const selections = trimmed.split(",").map((s) => s.trim());
      const choices = question.choices || [];
      return selections.map((sel) => {
        const matchById = choices.find((c: any) => c.id === sel);
        if (matchById) return getText(matchById.label, language);
        const matchByLabel = choices.find(
          (c: any) => getText(c.label, language).toLowerCase() === sel.toLowerCase()
        );
        if (matchByLabel) return getText(matchByLabel.label, language);
        return sel;
      });
    }

    case TSurveyQuestionTypeEnum.CTA: {
      return trimmed.toLowerCase() === "dismissed" ? "dismissed" : "clicked";
    }

    case TSurveyQuestionTypeEnum.Consent: {
      const lower = trimmed.toLowerCase();
      if (["yes", "y", "accepted", "agree", "1"].includes(lower)) return "accepted";
      return "dismissed";
    }

    case TSurveyQuestionTypeEnum.Ranking: {
      return trimmed.split(",").map((s) => s.trim());
    }

    case TSurveyQuestionTypeEnum.OpenText:
    case TSurveyQuestionTypeEnum.Date:
    default:
      return trimmed;
  }
}

/**
 * Check if the question type is supported in bot connector (chat) channel
 */
export function isSupportedInChat(questionType: string): boolean {
  const unsupported = [
    TSurveyQuestionTypeEnum.FileUpload,
    TSurveyQuestionTypeEnum.PictureSelection,
    TSurveyQuestionTypeEnum.Cal,
    TSurveyQuestionTypeEnum.Matrix,
  ];
  return !unsupported.includes(questionType as TSurveyQuestionTypeEnum);
}

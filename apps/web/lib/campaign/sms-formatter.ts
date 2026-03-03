/**
 * SMS Campaign Question Formatter
 *
 * Converts HiveCFM survey questions into plain-text SMS messages.
 * Adapted from the bot connector question formatter at
 * apps/web/app/api/v1/management/bot-connector/lib/question-formatter.ts
 *
 * Unlike the bot connector formatter which uses Genesys QuickReply buttons,
 * this formatter produces plain text with numbered options and instructions
 * suitable for SMS delivery.
 */
import type { TI18nString } from "@hivecfm/types/i18n";
import { TSurveyQuestionTypeEnum } from "@hivecfm/types/surveys/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Strip HTML tags from a string, returning plain text */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

/** Extract text from an i18n string, falling back to the "default" key */
function getText(i18nStr: TI18nString | string | undefined, language: string = "default"): string {
  if (!i18nStr) return "";
  if (typeof i18nStr === "string") return stripHtml(i18nStr);
  const raw = i18nStr[language] || i18nStr["default"] || Object.values(i18nStr)[0] || "";
  return stripHtml(raw);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Format a survey question as a plain-text SMS message.
 *
 * Returns a string ready to send via SMS, with numbered options and
 * reply instructions where applicable.
 */
export function formatQuestionForSms(question: any, language: string = "default"): string {
  const headline = getText(question.headline, language);

  switch (question.type) {
    case TSurveyQuestionTypeEnum.Rating: {
      const range = question.range || 5;
      return `${headline}\nReply with a number from 1 to ${range}`;
    }

    case TSurveyQuestionTypeEnum.NPS: {
      return `${headline}\nReply with a number from 0 to 10`;
    }

    case TSurveyQuestionTypeEnum.MultipleChoiceSingle: {
      const choices = question.choices || [];
      const lines = choices.map((c: any, i: number) => `${i + 1}. ${getText(c.label, language)}`);
      return `${headline}\n${lines.join("\n")}\nReply with the number of your choice`;
    }

    case TSurveyQuestionTypeEnum.MultipleChoiceMulti: {
      const choices = question.choices || [];
      const lines = choices.map((c: any, i: number) => `${i + 1}. ${getText(c.label, language)}`);
      return `${headline}\n${lines.join("\n")}\nReply with numbers separated by commas`;
    }

    case TSurveyQuestionTypeEnum.CTA: {
      return `${headline}\nReply YES to continue or NO to dismiss`;
    }

    case TSurveyQuestionTypeEnum.Consent: {
      return `${headline}\nReply YES or NO`;
    }

    case TSurveyQuestionTypeEnum.OpenText:
    case TSurveyQuestionTypeEnum.Date:
    case TSurveyQuestionTypeEnum.Address:
    case TSurveyQuestionTypeEnum.ContactInfo: {
      return headline;
    }

    case TSurveyQuestionTypeEnum.Ranking: {
      const choices = question.choices || [];
      const choiceLabels = choices.map((c: any) => getText(c.label, language));
      if (choiceLabels.length > 0) {
        return `${headline}\nOptions: ${choiceLabels.join(", ")}\nReply with them in order, separated by commas`;
      }
      return headline;
    }

    default:
      // Unknown question type - just show the headline
      return headline;
  }
}

/**
 * Check if the question type is supported in chat / SMS channels.
 *
 * Unsupported types: FileUpload, PictureSelection, Cal, Matrix
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

/**
 * Parse a customer's SMS reply for a given question type and return the
 * normalized value suitable for storing in a response.
 *
 * Follows the same logic as the bot connector's parseAnswer.
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
      // Try matching by choice ID
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

        // Try matching by index (1-based)
        const idx = parseInt(sel, 10);
        if (!isNaN(idx) && idx >= 1 && idx <= choices.length) {
          return getText(choices[idx - 1].label, language);
        }

        return sel;
      });
    }

    case TSurveyQuestionTypeEnum.CTA: {
      const lower = trimmed.toLowerCase();
      if (["no", "n", "dismiss", "dismissed", "0"].includes(lower)) return "dismissed";
      return "clicked";
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
    case TSurveyQuestionTypeEnum.Address:
    case TSurveyQuestionTypeEnum.ContactInfo:
    default:
      return trimmed;
  }
}

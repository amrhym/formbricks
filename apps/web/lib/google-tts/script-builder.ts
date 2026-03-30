import { TSurveyElement, TSurveyElementTypeEnum } from "@hivecfm/types/surveys/elements";
import { getTemplate } from "./script-templates";

/** Strip HTML tags and decode common entities */
function stripHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getI18nText(obj: any, lang: string): string {
  const raw = obj?.[lang] || obj?.default || "";
  return stripHtml(raw);
}

export function buildIvrScript(element: TSurveyElement, lang: string = "default"): string {
  const headline = getI18nText(element.headline, lang);

  switch (element.type) {
    case TSurveyElementTypeEnum.NPS: {
      const lowerLabel = getI18nText((element as any).lowerLabel, lang);
      const upperLabel = getI18nText((element as any).upperLabel, lang);
      return `${headline}. ${getTemplate("selectNumberFromZeroToTen", lang)} ${lowerLabel} ${getTemplate("andTenMeans", lang)} ${upperLabel}.`;
    }
    case TSurveyElementTypeEnum.Rating: {
      const lowerLabel = getI18nText((element as any).lowerLabel, lang);
      const upperLabel = getI18nText((element as any).upperLabel, lang);
      const range = (element as any).range || 5;
      return `${headline}. ${getTemplate("pressPrompt", lang)} 1 ${getTemplate("ifPrompt", lang)} ${lowerLabel}, ${getTemplate("andPress", lang)} ${range} ${getTemplate("ifPrompt", lang)} ${upperLabel}.`;
    }
    case TSurveyElementTypeEnum.MultipleChoiceSingle: {
      const choices = ((element as any).choices || []).slice(0, 9);
      const choiceTexts = choices.map((choice: any, i: number) => {
        const label = getI18nText(choice.label, lang);
        return `${getTemplate("pressPrompt", lang)} ${i + 1} ${getTemplate("forPrompt", lang)} ${label}`;
      });
      return `${headline}. ${choiceTexts.join(". ")}.`;
    }
    case TSurveyElementTypeEnum.CTA:
      return `${headline}. ${getTemplate("pressToContinue", lang)}.`;
    case TSurveyElementTypeEnum.OpenText:
      return `${headline}. ${getTemplate("speakAfterBeep", lang)}.`;
    default:
      return headline;
  }
}

export function buildCardScript(
  headline?: Record<string, string>,
  subheader?: Record<string, string>,
  lang: string = "default"
): string {
  const h = stripHtml(headline?.[lang] || headline?.default || "");
  const s = stripHtml(subheader?.[lang] || subheader?.default || "");
  return s ? `${h}. ${s}` : h;
}

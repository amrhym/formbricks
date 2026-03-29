import { TSurveyElement, TSurveyElementTypeEnum } from "@hivecfm/types/surveys/elements";
import { getTemplate } from "./script-templates";

export function buildIvrScript(element: TSurveyElement, lang: string = "default"): string {
  const headline =
    (element.headline as Record<string, string>)?.[lang] ||
    (element.headline as Record<string, string>)?.default ||
    "";

  switch (element.type) {
    case TSurveyElementTypeEnum.NPS: {
      const lowerLabel = (element as any).lowerLabel?.[lang] || (element as any).lowerLabel?.default || "";
      const upperLabel = (element as any).upperLabel?.[lang] || (element as any).upperLabel?.default || "";
      return `${headline}. ${getTemplate("selectNumberFromZeroToTen", lang)} ${lowerLabel} ${getTemplate("andTenMeans", lang)} ${upperLabel}.`;
    }
    case TSurveyElementTypeEnum.Rating: {
      const lowerLabel = (element as any).lowerLabel?.[lang] || (element as any).lowerLabel?.default || "";
      const upperLabel = (element as any).upperLabel?.[lang] || (element as any).upperLabel?.default || "";
      const range = (element as any).range || 5;
      return `${headline}. ${getTemplate("pressPrompt", lang)} 1 ${getTemplate("ifPrompt", lang)} ${lowerLabel}, ${getTemplate("andPress", lang)} ${range} ${getTemplate("ifPrompt", lang)} ${upperLabel}.`;
    }
    case TSurveyElementTypeEnum.MultipleChoiceSingle: {
      const choices = ((element as any).choices || []).slice(0, 9);
      const choiceTexts = choices.map((choice: any, i: number) => {
        const label = choice.label?.[lang] || choice.label?.default || "";
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
  const h = headline?.[lang] || headline?.default || "";
  const s = subheader?.[lang] || subheader?.default || "";
  return s ? `${h}. ${s}` : h;
}

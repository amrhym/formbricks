export const IVR_SCRIPT_TEMPLATES: Record<string, Record<string, string>> = {
  pressPrompt: { ar: "اضغط", en: "Press" },
  forPrompt: { ar: "لاختيار", en: "for" },
  selectNumberFromZeroToTen: {
    ar: "اختر رقم من صفر إلى عشرة. صفر يعني",
    en: "Select a number from zero to ten. Zero means",
  },
  andTenMeans: { ar: "وعشرة يعني", en: "and ten means" },
  ifPrompt: { ar: "إذا", en: "if" },
  andPress: { ar: "واضغط", en: "and press" },
  pressToContinue: { ar: "اضغط 1 للمتابعة", en: "Press 1 to continue" },
  speakAfterBeep: {
    ar: "تفضل بالإجابة بعد الصافرة",
    en: "Please speak your answer after the beep",
  },
};

/**
 * Get a template phrase in the given language.
 * If lang is "default", detect from the first available key (fallback to "en").
 */
export function getTemplate(key: string, lang: string): string {
  const template = IVR_SCRIPT_TEMPLATES[key];
  if (!template) return "";

  // "default" is not a valid template key — resolve to actual language
  if (lang === "default") {
    // Fallback: try "ar" first (most HiveCFM deployments), then "en"
    return template.ar || template.en || "";
  }

  return template[lang] || template.en || "";
}

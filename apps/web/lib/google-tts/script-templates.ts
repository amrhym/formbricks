export const IVR_SCRIPT_TEMPLATES: Record<string, Record<string, string>> = {
  pressPrompt: { default: "اضغط", en: "Press" },
  forPrompt: { default: "لاختيار", en: "for" },
  selectNumberFromZeroToTen: {
    default: "اختر رقم من صفر إلى عشرة. صفر يعني",
    en: "Select a number from zero to ten. Zero means",
  },
  andTenMeans: { default: "وعشرة يعني", en: "and ten means" },
  ifPrompt: { default: "إذا", en: "if" },
  andPress: { default: "واضغط", en: "and press" },
  pressToContinue: { default: "اضغط 1 للمتابعة", en: "Press 1 to continue" },
  speakAfterBeep: {
    default: "تفضل بالإجابة بعد الصافرة",
    en: "Please speak your answer after the beep",
  },
};

export function getTemplate(key: string, lang: string): string {
  const template = IVR_SCRIPT_TEMPLATES[key];
  if (!template) return "";
  return template[lang] || template.default || "";
}

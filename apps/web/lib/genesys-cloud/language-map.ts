const LANG_TO_GENESYS: Record<string, string> = {
  ar: "ar-sa",
  en: "en-us",
  fr: "fr-fr",
  es: "es-es",
  de: "de-de",
  pt: "pt-br",
  tr: "tr-tr",
  hi: "hi-in",
  ur: "ur-pk",
  ja: "ja-jp",
  ko: "ko-kr",
  zh: "zh-cn",
};

export function toGenesysLanguage(langCode: string): string {
  return LANG_TO_GENESYS[langCode] || `${langCode}-${langCode}`;
}

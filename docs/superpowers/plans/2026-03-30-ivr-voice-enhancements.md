# IVR Voice Survey Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add TTS/audio toggle, audio player preview, ending card audio, OpenText for voice, multi-language audio, Google TTS generation, and Genesys language-aware API — all shipped as one release.

**Architecture:** Data model changes go first (types package), then API changes (IVR endpoints), then Genesys integration, then UI components. The `audioUrl` field changes from `ZUrl` (string) to a `z.preprocess()` wrapper that accepts both string and `Record<string, string>`, ensuring zero breakage for existing data. Google TTS is a new server-side client that generates WAV files and uploads to MinIO.

**Tech Stack:** TypeScript, Zod, Next.js API routes, React, Google Cloud TTS API, AWS SDK (S3/MinIO), Genesys Cloud Platform API

**Spec:** `docs/superpowers/specs/2026-03-30-ivr-voice-enhancements-design.md`

---

## Task 1: Data Model — audioUrl preprocess wrapper and audioSource field

**Files:**
- Modify: `packages/types/surveys/elements.ts:53-65`
- Modify: `packages/types/surveys/types.ts:58-66` (ZSurveyEndScreenCard)
- Modify: `packages/types/surveys/types.ts:141-156` (ZSurveyWelcomeCard)

- [ ] **Step 1: Add ZAudioUrl preprocess helper and audioSource to ZSurveyElementBase**

In `packages/types/surveys/elements.ts`, add the preprocess wrapper after the imports (line 5), then modify `ZSurveyElementBase`:

```typescript
// After line 5 (after FORBIDDEN_IDS import), add:
export const ZAudioSource = z.enum(["tts", "upload", "generated"]).default("tts");
export type TAudioSource = z.infer<typeof ZAudioSource>;

// Preprocess wrapper: accepts legacy string OR i18n record
export const ZAudioUrl = z.preprocess(
  (val) => {
    if (typeof val === "string") return { default: val };
    return val;
  },
  z.record(z.string(), z.string()).optional()
);
```

Then modify `ZSurveyElementBase` (line 53-65) — replace `audioUrl: ZUrl.optional()` with:
```typescript
export const ZSurveyElementBase = z.object({
  id: ZSurveyElementId,
  type: z.nativeEnum(TSurveyElementTypeEnum),
  headline: ZI18nString,
  subheader: ZI18nString.optional(),
  imageUrl: ZUrl.optional(),
  videoUrl: ZUrl.optional(),
  audioUrl: ZAudioUrl,
  audioSource: ZAudioSource,
  audioGenerationHash: z.record(z.string(), z.string()).optional(),
  required: z.boolean(),
  scale: z.enum(["number", "smiley", "star"]).optional(),
  range: z.union([z.literal(5), z.literal(3), z.literal(4), z.literal(7), z.literal(10)]).optional(),
  isDraft: z.boolean().optional(),
});
```

- [ ] **Step 2: Add audioUrl and audioSource to ZSurveyEndScreenCard**

In `packages/types/surveys/types.ts`, modify `ZSurveyEndScreenCard` (line 58-66):

```typescript
import { ZAudioSource, ZAudioUrl } from "./elements";

// Add after imageUrl (line 64):
export const ZSurveyEndScreenCard = ZSurveyEndingBase.extend({
  type: z.literal("endScreen"),
  headline: ZI18nString.optional(),
  subheader: ZI18nString.optional(),
  buttonLabel: ZI18nString.optional(),
  buttonLink: ZUrl.optional(),
  imageUrl: ZUrl.optional(),
  videoUrl: ZUrl.optional(),
  audioUrl: ZAudioUrl,
  audioSource: ZAudioSource,
});
```

- [ ] **Step 3: Add audioUrl and audioSource to ZSurveyWelcomeCard**

In `packages/types/surveys/types.ts`, modify `ZSurveyWelcomeCard` (line 141-156) — add `audioUrl` and `audioSource` alongside existing `fileUrl`:

```typescript
export const ZSurveyWelcomeCard = z
  .object({
    enabled: z.boolean(),
    headline: ZI18nString.optional(),
    subheader: ZI18nString.optional(),
    fileUrl: ZUrl.optional(),
    audioUrl: ZAudioUrl,
    audioSource: ZAudioSource,
    buttonLabel: ZI18nString.optional(),
    timeToFinish: z.boolean().default(true),
    showResponseCount: z.boolean().default(false),
    videoUrl: ZUrl.optional(),
  })
  .refine((schema) => !(schema.enabled && !schema.headline), {
    message: "Welcome card must have a headline",
  });
```

- [ ] **Step 4: Export createS3Client and getActiveBucketName from storage package**

In `packages/storage/src/index.ts`, add exports needed for server-side file uploads:
```typescript
export { setStorageConfigOverride, createS3Client, getActiveBucketName } from "./client";
```

- [ ] **Step 5: Add voiceConfig to ZSurvey**

In `packages/types/surveys/types.ts`, find the `ZSurvey` definition and add `voiceConfig`:

```typescript
export const ZVoiceConfig = z.object({
  ttsProvider: z.enum(["google"]).optional(),
  voices: z.record(z.string(), z.string()).optional(),
});

// Add to ZSurvey object:
voiceConfig: ZVoiceConfig.optional(),
```

- [ ] **Step 5: Commit**

```bash
git add packages/types/surveys/elements.ts packages/types/surveys/types.ts
git commit -m "feat(types): add audioSource, ZAudioUrl preprocess, voiceConfig, ending/welcome card audio"
```

---

## Task 2: Data Model — Add OpenText to voice-compatible types and speech input

**Files:**
- Modify: `packages/types/channel.ts:131-136`
- Modify: `apps/web/app/api/v1/client/[environmentId]/ivr/[surveyId]/lib/ivr.ts:13-43,77-111`

- [ ] **Step 1: Add OpenText to VOICE_COMPATIBLE_ELEMENT_TYPES**

In `packages/types/channel.ts`, modify lines 131-136:

```typescript
export const VOICE_COMPATIBLE_ELEMENT_TYPES: TSurveyElementTypeEnum[] = [
  TSurveyElementTypeEnum.NPS,
  TSurveyElementTypeEnum.Rating,
  TSurveyElementTypeEnum.MultipleChoiceSingle,
  TSurveyElementTypeEnum.CTA,
  TSurveyElementTypeEnum.OpenText,
];
```

- [ ] **Step 2: Add IvrInputConfigSpeech type and update buildInputConfig()**

In `apps/web/app/api/v1/client/[environmentId]/ivr/[surveyId]/lib/ivr.ts`:

Add after `IvrInputConfigDtmfChoice` (line 27):
```typescript
interface IvrInputConfigSpeech {
  inputType: "speech";
  maxDurationSeconds: number;
  silenceTimeoutSeconds: number;
}
```

Update the type union (line 29):
```typescript
type IvrInputConfig = IvrInputConfigNumeric | IvrInputConfigDtmfChoice | IvrInputConfigSpeech;
```

Add `audioSource` to `IvrQuestion` interface (line 31-43):
```typescript
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
```

Add `audioSource` to `IvrSurveyConfig` (lines 45-60) on `welcomeAudioSource`, `thankYouAudioSource`:
```typescript
export interface IvrSurveyConfig {
  id: string;
  name: string;
  language: string;
  availableLanguages: string[];
  totalQuestions: number;
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
```

Add OpenText case in `buildInputConfig()` (before `default:` on line 108):
```typescript
    case TSurveyElementTypeEnum.OpenText:
      return {
        inputType: "speech",
        maxDurationSeconds: 30,
        silenceTimeoutSeconds: 3,
      };
```

- [ ] **Step 3: Commit**

```bash
git add packages/types/channel.ts apps/web/app/api/v1/client/\[environmentId\]/ivr/\[surveyId\]/lib/ivr.ts
git commit -m "feat(ivr): add OpenText speech input type and audioSource to IVR interfaces"
```

---

## Task 3: IVR API — Language parameter on survey, media, and prompts endpoints

**Files:**
- Modify: `apps/web/app/api/v1/client/[environmentId]/ivr/[surveyId]/route.ts`
- Modify: `apps/web/app/api/v1/client/[environmentId]/ivr/[surveyId]/media/[questionId]/route.ts`
- Modify: `apps/web/app/api/v1/client/[environmentId]/ivr/[surveyId]/prompts/route.ts`
- Modify: `apps/web/app/api/v1/client/[environmentId]/ivr/[surveyId]/lib/ivr.ts:67-75,258-354`

- [ ] **Step 1: Update getDefaultLanguageText to support any language**

In `ivr.ts`, replace `getDefaultLanguageText` (lines 67-75) with a language-aware version:

```typescript
const getLanguageText = (
  i18nString?: Record<string, string>,
  langCode?: string,
  hiddenFields?: Record<string, string>
): string | null => {
  if (!i18nString) return null;
  // Try requested language, fall back to default
  const text = (langCode && i18nString[langCode]) || i18nString.default || null;
  if (!text || !hiddenFields || Object.keys(hiddenFields).length === 0) return text;
  return text.includes("#recall:") ? parseRecallInfo(text, hiddenFields) : text;
};
```

- [ ] **Step 2: Update linearizeSurveyForIvr to accept lang parameter**

Update the function signature to accept `lang?: string`:
```typescript
export const linearizeSurveyForIvr = (
  survey: TSurvey,
  baseUrl: string,
  hiddenFields?: Record<string, string>,
  lang?: string
): IvrSurveyResponse => {
```

At the top of the function, compute language metadata:
```typescript
const defaultLangCode = survey.languages?.find((l) => l.default)?.language.code || "default";
const availableLanguages = survey.languages?.filter((l) => l.enabled).map((l) => l.language.code) || ["default"];
const resolvedLang = lang || defaultLangCode;
```

In the element mapping section, resolve audioUrl from the i18n map:
```typescript
// Resolve audio URL from i18n map
const audioUrlMap = element.audioUrl as Record<string, string> | undefined;
const resolvedAudioKey = lang && audioUrlMap?.[lang] ? lang : "default";
const rawAudioUrl = audioUrlMap?.[resolvedAudioKey] || null;
const audioUrl = rawAudioUrl ? buildMediaUrl(baseUrl, survey.environmentId, survey.id, element.id) + (lang ? `?lang=${lang}` : "") : null;

// Prompt name: no suffix for default language (backward compat), _langCode for others
const promptSuffix = lang && lang !== defaultLangCode ? `_${lang}` : "";
const promptName = `hivecfm_${survey.id}_${element.id}${promptSuffix}`.replace(/[^a-zA-Z0-9_]/g, "_");
```

Pass `lang` through all `getLanguageText` calls (replacing `getDefaultLanguageText`):
```typescript
questionText: getLanguageText(element.headline, lang, hiddenFields) || "",
subheader: getLanguageText(element.subheader, lang, hiddenFields),
audioSource: element.audioSource || "tts",
```

Update `buildInputConfig` to accept and pass `lang` so DTMF choice labels resolve correctly:
```typescript
const buildInputConfig = (element: TSurveyElement, hiddenFields?: Record<string, string>, lang?: string): IvrInputConfig | null => {
  // ... in the MultipleChoiceSingle case:
  label: getLanguageText(choice.label, lang, hiddenFields) || `Option ${index + 1}`,
```

Update the `surveyConfig` object to use the new `audioUrl` and `audioSource` fields on welcome/ending cards:
```typescript
// Welcome card audio
const welcomeAudioMap = survey.welcomeCard?.audioUrl as Record<string, string> | undefined;
const welcomeRawAudio = welcomeAudioMap?.[lang || "default"] || welcomeAudioMap?.["default"] || null;
const welcomeAudioUrl = welcomeRawAudio ? buildMediaUrl(baseUrl, survey.environmentId, survey.id, "welcome") + (lang ? `?lang=${lang}` : "") : null;

// Ending card audio (use new audioUrl field, not imageUrl)
const endingCard = survey.endings?.[0];
const endingAudioMap = endingCard?.audioUrl as Record<string, string> | undefined;
const endingRawAudio = endingAudioMap?.[lang || "default"] || endingAudioMap?.["default"] || null;
const thankYouAudioUrl = endingRawAudio ? buildMediaUrl(baseUrl, survey.environmentId, survey.id, "ending") + (lang ? `?lang=${lang}` : "") : null;
```

Add `language` and `availableLanguages` to the returned `IvrSurveyConfig`.

- [ ] **Step 3: Update GET /ivr/{surveyId} route to pass lang**

In `route.ts`, add `lang` to reserved params (line 58) and pass it to `linearizeSurveyForIvr`:

```typescript
const reservedParams = new Set(["environmentId", "surveyId", "lang"]);

// After hidden fields extraction:
const lang = searchParams.get("lang") || undefined;

// Pass to linearize:
const ivrData = linearizeSurveyForIvr(survey, baseUrl, hiddenFields, lang);
```

- [ ] **Step 4: Update GET /media/{questionId} to resolve language-specific audio**

In `media/[questionId]/route.ts`, update the audioUrl resolution:

```typescript
const lang = searchParams.get("lang");

// Handle i18n audioUrl (Record<string, string> or legacy string)
let resolvedAudioUrl: string | null = null;
const audioUrlField = targetElement.audioUrl;

if (typeof audioUrlField === "string") {
  resolvedAudioUrl = audioUrlField;
} else if (audioUrlField && typeof audioUrlField === "object") {
  resolvedAudioUrl = (lang && audioUrlField[lang]) || audioUrlField["default"] || null;
}

if (!resolvedAudioUrl) {
  return responses.notFoundResponse("Audio", questionId, true);
}

const storageInfo = parseStorageUrl(resolvedAudioUrl);
```

Handle special `questionId` values for card audio — add BEFORE the element lookup:
```typescript
let resolvedAudioUrl: string | null = null;
const lang = searchParams.get("lang");

if (questionId === "welcome") {
  const audioUrlMap = survey.welcomeCard?.audioUrl as Record<string, string> | undefined;
  resolvedAudioUrl = audioUrlMap ? ((lang && audioUrlMap[lang]) || audioUrlMap["default"] || null) : null;
} else if (questionId === "ending") {
  const endingCard = survey.endings?.[0];
  const audioUrlMap = (endingCard as any)?.audioUrl as Record<string, string> | undefined;
  resolvedAudioUrl = audioUrlMap ? ((lang && audioUrlMap[lang]) || audioUrlMap["default"] || null) : null;
} else {
  // Existing element lookup
  const targetElement = /* find element by questionId in blocks */;
  const audioUrlField = targetElement?.audioUrl;
  if (typeof audioUrlField === "string") {
    resolvedAudioUrl = audioUrlField;
  } else if (audioUrlField && typeof audioUrlField === "object") {
    resolvedAudioUrl = (lang && audioUrlField[lang]) || audioUrlField["default"] || null;
  }
}

if (!resolvedAudioUrl) {
  return responses.notFoundResponse("Audio", questionId, true);
}
const storageInfo = parseStorageUrl(resolvedAudioUrl);
```

- [ ] **Step 5: Update GET /prompts to return language-suffixed names**

In `prompts/route.ts`, add language parameter:

```typescript
const lang = searchParams.get("lang");
const promptSuffix = lang ? `_${lang}` : "";

// In the prompt mapping loop:
const promptName = `hivecfm_${surveyId}_${element.id}${promptSuffix}`.replace(/[^a-zA-Z0-9_]/g, "_");

// Add welcome and ending prompts:
// welcome: `hivecfm_${surveyId}_welcome${promptSuffix}`
// ending: `hivecfm_${surveyId}_ending${promptSuffix}`

// Add to response:
const availableLanguages = survey.languages?.filter((l) => l.enabled).map((l) => l.language.code) || [];
return responses.successResponse({
  requestedLanguage: lang || "default",
  availableLanguages,
  prompts: promptMap,
});
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/api/v1/client/\[environmentId\]/ivr/
git commit -m "feat(ivr-api): add ?lang parameter to survey, media, and prompts endpoints"
```

---

## Task 4: Genesys Integration — Language-aware prompt sync and language mapping

**Files:**
- Create: `apps/web/lib/genesys-cloud/language-map.ts`
- Modify: `apps/web/lib/genesys-cloud/client.ts:91-161`
- Modify: `apps/web/lib/genesys-cloud/prompt-sync.ts:31-161`

- [ ] **Step 1: Create language code mapping utility**

Create `apps/web/lib/genesys-cloud/language-map.ts`:

```typescript
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
```

- [ ] **Step 2: Add language parameter to uploadPromptResource**

In `apps/web/lib/genesys-cloud/client.ts`, update `uploadPromptResource` (line 91) to accept a `language` parameter:

```typescript
export async function uploadPromptResource(
  token: string,
  envUrl: string,
  promptId: string,
  wavBuffer: Buffer,
  language: string = "en-us"
): Promise<void> {
  // ... existing delete + create logic ...
  // On resource creation POST, include language in the body:
  // body: JSON.stringify({ name: promptId, language, mediaUri: `prompt://${promptId}`, ttsString: "" })
}
```

- [ ] **Step 3: Update syncAudioPromptsToGenesys for multi-language**

In `apps/web/lib/genesys-cloud/prompt-sync.ts`, update `syncAudioPromptsToGenesys`:

```typescript
// Get enabled languages
const enabledLanguages = survey.languages?.filter((l) => l.enabled).map((l) => l.language.code) || ["default"];

// For each element with audioSource !== "tts":
for (const element of voiceElements) {
  if (element.audioSource === "tts") continue;
  const audioUrlMap = element.audioUrl as Record<string, string> | undefined;
  if (!audioUrlMap) continue;

  for (const langCode of enabledLanguages) {
    const audioUrl = audioUrlMap[langCode] || audioUrlMap["default"];
    if (!audioUrl) continue;

    const defaultLangCode = survey.languages?.find((l) => l.default)?.language.code || "default";
    const isDefault = langCode === defaultLangCode;
    const promptSuffix = isDefault ? "" : `_${langCode}`;
    const promptName = `hivecfm_${survey.id}_${element.id}${promptSuffix}`.replace(/[^a-zA-Z0-9_]/g, "_");

    // Download audio, create prompt, upload resource
    const prompt = await createPrompt(token, envUrl, promptName, `HiveCFM ${element.id} ${langCode}`);
    const wavBuffer = await downloadAudioFile(audioUrl);
    await uploadPromptResource(token, envUrl, prompt.id, wavBuffer, toGenesysLanguage(langCode));

    mappings.push({ elementId: element.id, language: langCode, promptId: prompt.id, promptName });
  }
}

// Same loop for welcome card and ending card (endings[0] only)
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/genesys-cloud/
git commit -m "feat(genesys): language-aware prompt sync with per-language audio upload"
```

---

## Task 5: Genesys Data Actions — Add language input parameter

**Files:**
- Modify: `apps/web/modules/survey/editor/components/genesys-ivr-info.tsx:286-439`

- [ ] **Step 1: Update generateGetSurveyAction to include language input**

In `genesys-ivr-info.tsx`, update `generateGetSurveyAction()` (line 286):

Add `language` to `contractInput.properties`:
```typescript
language: { type: "string", description: "ISO language code (e.g. ar, en)" }
```

Update the request URL template to include `?lang={{language}}`:
```typescript
requestUrlTemplate: `${ivrSurveyUrl}?lang=\${input.language}`
```

- [ ] **Step 2: Update generateGetPromptsAction to include language input**

In `generateGetPromptsAction()` (line 335):

Add `language` to `contractInput.properties`:
```typescript
language: { type: "string", description: "ISO language code (required)" }
```

Update request URL:
```typescript
requestUrlTemplate: `${ivrPromptsUrl}?lang=\${input.language}`
```

- [ ] **Step 3: Update generateSubmitAnswerAction to include language input**

In `generateSubmitAnswerAction()` (line 383):

Add `language` to `contractInput.properties`:
```typescript
language: { type: "string", description: "Caller language code" }
```

Include in request body template.

- [ ] **Step 4: Add Genesys Architect flow guidance note to the info panel**

After the Data Actions section, add a note:

```tsx
<div className="mt-4 rounded-md bg-blue-50 p-3">
  <p className="text-sm font-medium text-blue-800">Multi-Language Architect Flow</p>
  <ol className="mt-1 list-decimal pl-4 text-xs text-blue-700">
    <li>Add a language selection menu (e.g., "Press 1 for Arabic, Press 2 for English")</li>
    <li>Set Flow.language based on DTMF input</li>
    <li>Call GetPromptNames with the selected language</li>
    <li>Play language-specific prompts for each question</li>
    <li>Include language in SubmitAnswer payload</li>
  </ol>
</div>
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/modules/survey/editor/components/genesys-ivr-info.tsx
git commit -m "feat(genesys): add language parameter to Data Actions and Architect flow guidance"
```

---

## Task 6: Google TTS — Client, script builder, and script templates

**Files:**
- Create: `apps/web/lib/google-tts/client.ts`
- Create: `apps/web/lib/google-tts/script-builder.ts`
- Create: `apps/web/lib/google-tts/script-templates.ts`

- [ ] **Step 1: Create Google Cloud TTS client**

Create `apps/web/lib/google-tts/client.ts`:

```typescript
import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";

interface Voice {
  name: string;
  languageCodes: string[];
  ssmlGender: string;
  naturalSampleRateHertz: number;
}

interface SynthesizeRequest {
  text: string;
  languageCode: string;
  voiceName: string;
}

let cachedApiKey: string | null = null;
let cacheTime = 0;
const CACHE_TTL = 60000;

async function getApiKey(): Promise<string | null> {
  if (cachedApiKey && Date.now() - cacheTime < CACHE_TTL) return cachedApiKey;

  try {
    const integration = await prisma.integration.findFirst({
      where: { type: "googleAi" as any },
      select: { config: true },
    });
    const key = (integration?.config as any)?.key?.apiKey;
    if (key) {
      cachedApiKey = key;
      cacheTime = Date.now();
      return key;
    }
  } catch {}

  cachedApiKey = process.env.GOOGLE_API_KEY || null;
  cacheTime = Date.now();
  return cachedApiKey;
}

export async function isGoogleTtsConfigured(): Promise<boolean> {
  return !!(await getApiKey());
}

/**
 * Synthesize speech and return WAV buffer (with headers).
 */
export async function synthesizeSpeech(request: SynthesizeRequest): Promise<Buffer> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error("Google TTS not configured");

  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text: request.text },
        voice: {
          languageCode: request.languageCode,
          name: request.voiceName,
        },
        audioConfig: {
          audioEncoding: "LINEAR16",
          sampleRateHertz: 8000,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    logger.error({ status: response.status, error }, "Google TTS API error");
    throw new Error(`Google TTS error: ${response.status}`);
  }

  const data = await response.json();
  const pcmBuffer = Buffer.from(data.audioContent, "base64");

  // Prepend WAV header to raw LINEAR16 PCM data
  return addWavHeader(pcmBuffer, 8000, 16, 1);
}

/**
 * List available TTS voices, optionally filtered by language.
 */
export async function listVoices(languageCode?: string): Promise<Voice[]> {
  const apiKey = await getApiKey();
  if (!apiKey) return [];

  const url = languageCode
    ? `https://texttospeech.googleapis.com/v1/voices?languageCode=${languageCode}&key=${apiKey}`
    : `https://texttospeech.googleapis.com/v1/voices?key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) return [];

  const data = await response.json();
  return data.voices || [];
}

function addWavHeader(pcmData: Buffer, sampleRate: number, bitsPerSample: number, channels: number): Buffer {
  const byteRate = (sampleRate * bitsPerSample * channels) / 8;
  const blockAlign = (bitsPerSample * channels) / 8;
  const dataSize = pcmData.length;
  const headerSize = 44;

  const header = Buffer.alloc(headerSize);
  header.write("RIFF", 0);
  header.writeUInt32LE(dataSize + headerSize - 8, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmData]);
}
```

- [ ] **Step 2: Create IVR script templates**

Create `apps/web/lib/google-tts/script-templates.ts`:

```typescript
export const IVR_SCRIPT_TEMPLATES: Record<string, Record<string, string>> = {
  pressPrompt: {
    default: "اضغط",
    en: "Press",
    fr: "Appuyez sur",
  },
  forPrompt: {
    default: "لاختيار",
    en: "for",
    fr: "pour",
  },
  selectNumberFromZeroToTen: {
    default: "اختر رقم من صفر إلى عشرة. صفر يعني",
    en: "Select a number from zero to ten. Zero means",
  },
  andTenMeans: {
    default: "وعشرة يعني",
    en: "and ten means",
  },
  ifPrompt: {
    default: "إذا",
    en: "if",
  },
  andPress: {
    default: "واضغط",
    en: "and press",
  },
  pressToContinue: {
    default: "اضغط 1 للمتابعة",
    en: "Press 1 to continue",
  },
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
```

- [ ] **Step 3: Create IVR script builder**

Create `apps/web/lib/google-tts/script-builder.ts`:

```typescript
import { TSurveyElement, TSurveyElementTypeEnum } from "@hivecfm/types/surveys/elements";
import { TSurveyMultipleChoiceElement, TSurveyRatingElement } from "@hivecfm/types/surveys/elements";
import { getTemplate } from "./script-templates";

/**
 * Build a complete IVR-ready script for an element in the given language.
 */
export function buildIvrScript(
  element: TSurveyElement,
  lang: string = "default"
): string {
  const headline = (element.headline as Record<string, string>)?.[lang]
    || (element.headline as Record<string, string>)?.default
    || "";

  switch (element.type) {
    case TSurveyElementTypeEnum.NPS: {
      const lowerLabel = (element as any).lowerLabel?.[lang] || (element as any).lowerLabel?.default || "";
      const upperLabel = (element as any).upperLabel?.[lang] || (element as any).upperLabel?.default || "";
      return `${headline}. ${getTemplate("selectNumberFromZeroToTen", lang)} ${lowerLabel} ${getTemplate("andTenMeans", lang)} ${upperLabel}.`;
    }

    case TSurveyElementTypeEnum.Rating: {
      const ratingEl = element as TSurveyRatingElement;
      const lowerLabel = (ratingEl as any).lowerLabel?.[lang] || (ratingEl as any).lowerLabel?.default || "";
      const upperLabel = (ratingEl as any).upperLabel?.[lang] || (ratingEl as any).upperLabel?.default || "";
      const range = ratingEl.range || 5;
      return `${headline}. ${getTemplate("pressPrompt", lang)} 1 ${getTemplate("ifPrompt", lang)} ${lowerLabel}, ${getTemplate("andPress", lang)} ${range} ${getTemplate("ifPrompt", lang)} ${upperLabel}.`;
    }

    case TSurveyElementTypeEnum.MultipleChoiceSingle: {
      const mcEl = element as TSurveyMultipleChoiceElement;
      const choiceTexts = mcEl.choices.slice(0, 9).map((choice, i) => {
        const label = (choice.label as Record<string, string>)?.[lang]
          || (choice.label as Record<string, string>)?.default || "";
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

/**
 * Build script for a card (welcome or ending).
 */
export function buildCardScript(
  headline?: Record<string, string>,
  subheader?: Record<string, string>,
  lang: string = "default"
): string {
  const h = headline?.[lang] || headline?.default || "";
  const s = subheader?.[lang] || subheader?.default || "";
  return s ? `${h}. ${s}` : h;
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/google-tts/
git commit -m "feat(google-tts): add TTS client, script builder, and i18n templates"
```

---

## Task 7: Google TTS — Server action for generating audio

**Files:**
- Create: `apps/web/app/(app)/environments/[environmentId]/workspace/integrations/storage/actions.ts` (add action)
- Create: `apps/web/modules/survey/editor/actions/generate-audio.ts`

- [ ] **Step 1: Create server action for single question audio generation**

Create `apps/web/modules/survey/editor/actions/generate-audio.ts`:

```typescript
"use server";

import crypto from "crypto";
import { z } from "zod";
import { ZId } from "@hivecfm/types/common";
import { authenticatedActionClient } from "@/lib/utils/action-client";
import { checkAuthorizationUpdated } from "@/lib/utils/action-client/action-client-middleware";
import { getOrganizationIdFromEnvironmentId } from "@/lib/utils/helper";
import { synthesizeSpeech, isGoogleTtsConfigured, listVoices } from "@/lib/google-tts/client";
import { initStorageFromDB } from "@/lib/storage/client";
import { getSignedUploadUrl } from "@hivecfm/storage";

const ZGenerateAudioAction = z.object({
  environmentId: ZId,
  scriptText: z.string().min(1),
  languageCode: z.string().min(2),
  voiceName: z.string().min(1),
  fileName: z.string().min(1),
});

export const generateAudioAction = authenticatedActionClient
  .schema(ZGenerateAudioAction)
  .action(async ({ ctx, parsedInput }) => {
    const organizationId = await getOrganizationIdFromEnvironmentId(parsedInput.environmentId);
    await checkAuthorizationUpdated({
      userId: ctx.user.id,
      organizationId,
      access: [{ type: "organization", roles: ["owner", "manager"] }],
    });

    // Generate audio via Google TTS
    const wavBuffer = await synthesizeSpeech({
      text: parsedInput.scriptText,
      languageCode: parsedInput.languageCode,
      voiceName: parsedInput.voiceName,
    });

    // Compute content hash
    const hash = crypto.createHash("sha256")
      .update(`${parsedInput.scriptText}|${parsedInput.voiceName}|${parsedInput.languageCode}`)
      .digest("hex");

    // Upload to MinIO via the storage service (which reads config from DB)
    await initStorageFromDB();
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const { createS3Client, getActiveBucketName } = await import("@hivecfm/storage");

    const s3Client = createS3Client();
    const bucket = getActiveBucketName();
    if (!s3Client || !bucket) throw new Error("Storage not configured");

    const key = `${parsedInput.environmentId}/public/${parsedInput.fileName}`;
    await s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: wavBuffer,
      ContentType: "audio/wav",
    }));

    const fileUrl = `/storage/${parsedInput.environmentId}/public/${encodeURIComponent(parsedInput.fileName)}`;

    return { fileUrl, hash };
  });

export const listTtsVoicesAction = authenticatedActionClient
  .schema(z.object({ languageCode: z.string().optional() }))
  .action(async ({ parsedInput }) => {
    const voices = await listVoices(parsedInput.languageCode);
    return { voices };
  });

export const checkTtsConfiguredAction = authenticatedActionClient
  .schema(z.object({}))
  .action(async () => {
    const configured = await isGoogleTtsConfigured();
    return { configured };
  });
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/modules/survey/editor/actions/
git commit -m "feat(tts): add server actions for audio generation, voice listing, and config check"
```

---

## Task 8: UI — AudioSourceControl component

**Files:**
- Create: `apps/web/modules/survey/components/audio-source-control.tsx`

- [ ] **Step 1: Create the AudioSourceControl component**

Create `apps/web/modules/survey/components/audio-source-control.tsx`:

```tsx
"use client";

import { MicIcon, UploadIcon, WandSparklesIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { TAudioSource } from "@hivecfm/types/surveys/elements";
import { Button } from "@/modules/ui/components/button";
import { Label } from "@/modules/ui/components/label";
import {
  checkTtsConfiguredAction,
  generateAudioAction,
  listTtsVoicesAction,
} from "@/modules/survey/editor/actions/generate-audio";
import { buildIvrScript, buildCardScript } from "@/lib/google-tts/script-builder";

interface AudioSourceControlProps {
  environmentId: string;
  audioSource: TAudioSource;
  audioUrl: Record<string, string> | undefined;
  currentLanguage: string;
  availableLanguages: string[];
  element?: any; // TSurveyElement for script building
  cardType?: "welcome" | "ending";
  cardHeadline?: Record<string, string>;
  cardSubheader?: Record<string, string>;
  surveyVoiceConfig?: { voices?: Record<string, string> };
  onAudioSourceChange: (source: TAudioSource) => void;
  onAudioUrlChange: (audioUrl: Record<string, string>) => void;
  onAudioHashChange?: (hash: Record<string, string>) => void;
  onFileUpload: (file: File) => void;
}

export const AudioSourceControl = ({
  environmentId,
  audioSource,
  audioUrl,
  currentLanguage,
  availableLanguages,
  element,
  cardType,
  cardHeadline,
  cardSubheader,
  surveyVoiceConfig,
  onAudioSourceChange,
  onAudioUrlChange,
  onAudioHashChange,
  onFileUpload,
}: AudioSourceControlProps) => {
  const [isTtsConfigured, setIsTtsConfigured] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [scriptText, setScriptText] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);

  const currentAudioUrl = audioUrl?.[currentLanguage] || audioUrl?.["default"];

  useEffect(() => {
    checkTtsConfiguredAction({}).then((r) => setIsTtsConfigured(r?.data?.configured || false));
  }, []);

  useEffect(() => {
    // Build script from element or card
    if (element) {
      setScriptText(buildIvrScript(element, currentLanguage));
    } else if (cardType) {
      setScriptText(buildCardScript(cardHeadline, cardSubheader, currentLanguage));
    }
  }, [element, cardType, cardHeadline, cardSubheader, currentLanguage]);

  const handleGenerate = async () => {
    const voiceName = surveyVoiceConfig?.voices?.[currentLanguage]
      || surveyVoiceConfig?.voices?.["default"]
      || "en-US-Standard-C";
    const langCode = currentLanguage === "default" ? "ar-XA" : currentLanguage;

    setIsGenerating(true);
    try {
      const result = await generateAudioAction({
        environmentId,
        scriptText,
        languageCode: langCode,
        voiceName,
        fileName: `tts-${element?.id || cardType}-${currentLanguage}-${Date.now()}.wav`,
      });

      if (result?.data) {
        const newAudioUrl = { ...(audioUrl || {}), [currentLanguage]: result.data.fileUrl };
        onAudioUrlChange(newAudioUrl);
        onAudioSourceChange("generated");
        onAudioHashChange?.({ ...(audioUrl || {}), [currentLanguage]: result.data.hash });
      }
    } catch {
      // toast error handled by action client
    } finally {
      setIsGenerating(false);
    }
  };

  const tabs: { value: TAudioSource; label: string; icon: any; show: boolean }[] = [
    { value: "tts", label: "TTS", icon: MicIcon, show: true },
    { value: "upload", label: "Upload", icon: UploadIcon, show: true },
    { value: "generated", label: "Generate AI", icon: WandSparklesIcon, show: isTtsConfigured },
  ];

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {tabs.filter((t) => t.show).map((tab) => (
          <button
            key={tab.value}
            onClick={() => onAudioSourceChange(tab.value)}
            className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              audioSource === tab.value
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}>
            <tab.icon className="h-3 w-3" />
            {tab.label}
          </button>
        ))}
      </div>

      {audioSource === "tts" && (
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs text-slate-500">IVR will speak this text via TTS engine:</p>
          <p className="mt-1 text-sm text-slate-700">{scriptText || "(no text)"}</p>
        </div>
      )}

      {audioSource === "upload" && (
        <div>
          <input
            type="file"
            accept=".wav,.mp3"
            onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0])}
            className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-200"
          />
          <p className="mt-1 text-xs text-slate-400">WAV preferred (8kHz/16kHz mono), max 5MB</p>
        </div>
      )}

      {audioSource === "upload" && (
        // File validation: max 5MB
        // In the onChange handler, add:
        // if (file.size > 5 * 1024 * 1024) { toast.error("File too large (max 5MB)"); return; }
      )}

      {audioSource === "generated" && (
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Voice</Label>
            <VoiceSelector
              languageCode={currentLanguage === "default" ? "ar-XA" : currentLanguage}
              selectedVoice={surveyVoiceConfig?.voices?.[currentLanguage] || ""}
              onVoiceChange={(voice) => {/* update survey.voiceConfig.voices[currentLanguage] */}}
            />
          </div>
          <div>
            <Label className="text-xs">Script (editable)</Label>
            <textarea
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <Button size="sm" onClick={handleGenerate} loading={isGenerating}>
            Generate Audio
          </Button>
        </div>
      )}

      {currentAudioUrl && audioSource !== "tts" && (
        <div className="flex items-center gap-2 rounded-md bg-slate-50 p-2">
          <audio ref={audioRef} src={currentAudioUrl} controls className="h-8 w-full" />
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/modules/survey/components/audio-source-control.tsx
git commit -m "feat(ui): add AudioSourceControl component with TTS/Upload/Generate tabs"
```

---

## Task 9: UI — Voice preview panel enhancement

**Files:**
- Modify: `apps/web/modules/survey/editor/components/voice-preview-panel.tsx`

- [ ] **Step 1: Add audio player and OpenText support to voice preview**

Update `voice-preview-panel.tsx` to:
- Show `<audio>` player when `audioSource !== "tts"` and audio exists
- Show TTS badge when `audioSource === "tts"`
- Show "Caller speaks" indicator for OpenText questions instead of DTMF keypad
- Respect current language for audio URL resolution

Key changes to the component:

```tsx
// In the TTS text display section (lines 93-107), wrap with audioSource check:
{element.audioSource === "tts" || !resolvedAudioUrl ? (
  <div className="flex items-center gap-2">
    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">TTS</span>
    <p className="text-xs text-slate-600">{questionText}</p>
  </div>
) : (
  <div>
    <audio src={resolvedAudioUrl} controls className="h-8 w-full" />
  </div>
)}

// In the DTMF section (lines 110-130), add OpenText case:
{element.type === "openText" ? (
  <div className="flex items-center gap-2 rounded-md bg-amber-50 p-2">
    <MicIcon className="h-4 w-4 text-amber-600" />
    <span className="text-xs text-amber-700">Caller speaks their answer</span>
  </div>
) : (
  // existing DTMF keypad rendering
)}
```

Where `resolvedAudioUrl` is:
```typescript
const audioUrlMap = element.audioUrl as Record<string, string> | undefined;
const resolvedAudioUrl = audioUrlMap?.[languageCode] || audioUrlMap?.["default"] || null;
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/modules/survey/editor/components/voice-preview-panel.tsx
git commit -m "feat(ui): enhance voice preview with audio player, TTS badge, and OpenText indicator"
```

---

## Task 10: UI — Wire AudioSourceControl into element-form-input

**Files:**
- Modify: `apps/web/modules/survey/components/element-form-input/index.tsx`

- [ ] **Step 1: Replace voice audio upload with AudioSourceControl**

In `element-form-input/index.tsx`:

Import the new component:
```typescript
import { AudioSourceControl } from "@/modules/survey/components/audio-source-control";
```

In the voice channel section (where `isVoiceChannel` is checked), replace the simple file upload with `AudioSourceControl`:

For regular elements:
```tsx
{isVoiceChannel && (
  <AudioSourceControl
    environmentId={environmentId}
    audioSource={element.audioSource || "tts"}
    audioUrl={element.audioUrl as Record<string, string> | undefined}
    currentLanguage={selectedLanguageCode}
    availableLanguages={surveyLanguageCodes}
    element={element}
    surveyVoiceConfig={survey.voiceConfig}
    onAudioSourceChange={(source) => updateElement(elementIdx, { audioSource: source })}
    onAudioUrlChange={(url) => updateElement(elementIdx, { audioUrl: url })}
    onAudioHashChange={(hash) => updateElement(elementIdx, { audioGenerationHash: hash })}
    onFileUpload={(file) => handleAudioFileUpload(file, elementIdx)}
  />
)}
```

For ending cards (when `isVoiceChannel && isEndingCard`):
```tsx
<AudioSourceControl
  environmentId={environmentId}
  audioSource={endingCard.audioSource || "tts"}
  audioUrl={endingCard.audioUrl as Record<string, string> | undefined}
  currentLanguage={selectedLanguageCode}
  availableLanguages={surveyLanguageCodes}
  cardType="ending"
  cardHeadline={endingCard.headline}
  cardSubheader={endingCard.subheader}
  surveyVoiceConfig={survey.voiceConfig}
  onAudioSourceChange={(source) => updateEndingCard({ audioSource: source })}
  onAudioUrlChange={(url) => updateEndingCard({ audioUrl: url })}
  onFileUpload={(file) => handleEndingAudioUpload(file)}
/>
```

- [ ] **Step 2: Add audio file upload handler**

Add a helper to upload audio files and update the i18n audioUrl map:
```typescript
const handleAudioFileUpload = async (file: File, elementIdx: number) => {
  // Upload file to storage
  const uploadResult = await uploadFile(file, environmentId, "public");
  if (uploadResult?.url) {
    const currentAudioUrl = (elements[elementIdx].audioUrl as Record<string, string>) || {};
    const newAudioUrl = { ...currentAudioUrl, [selectedLanguageCode]: uploadResult.url };
    updateElement(elementIdx, { audioUrl: newAudioUrl, audioSource: "upload" });
  }
};
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/modules/survey/components/element-form-input/index.tsx
git commit -m "feat(ui): wire AudioSourceControl into voice survey element editor"
```

---

## Task 11: Voice Selector Component and Batch Generate

**Files:**
- Create: `apps/web/modules/survey/components/voice-selector.tsx`
- Modify: `apps/web/modules/survey/editor/actions/generate-audio.ts` (add batch action)

- [ ] **Step 1: Create VoiceSelector component**

Create `apps/web/modules/survey/components/voice-selector.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { listTtsVoicesAction } from "@/modules/survey/editor/actions/generate-audio";

interface VoiceSelectorProps {
  languageCode: string;
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
}

export const VoiceSelector = ({ languageCode, selectedVoice, onVoiceChange }: VoiceSelectorProps) => {
  const [voices, setVoices] = useState<{ name: string; ssmlGender: string }[]>([]);

  useEffect(() => {
    listTtsVoicesAction({ languageCode }).then((r) => setVoices(r?.data?.voices || []));
  }, [languageCode]);

  return (
    <select
      value={selectedVoice}
      onChange={(e) => onVoiceChange(e.target.value)}
      className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm">
      <option value="">Select voice...</option>
      {voices.map((v) => (
        <option key={v.name} value={v.name}>
          {v.name} ({v.ssmlGender})
        </option>
      ))}
    </select>
  );
};
```

- [ ] **Step 2: Add batch generate server action**

In `apps/web/modules/survey/editor/actions/generate-audio.ts`, add:

```typescript
const ZBatchGenerateAudioAction = z.object({
  environmentId: ZId,
  surveyId: ZId,
  languageCode: z.string().min(2),
  voiceName: z.string().min(1),
  elements: z.array(z.object({
    elementId: z.string(),
    scriptText: z.string(),
    currentHash: z.string().optional(),
  })),
});

export const batchGenerateAudioAction = authenticatedActionClient
  .schema(ZBatchGenerateAudioAction)
  .action(async ({ ctx, parsedInput }) => {
    const organizationId = await getOrganizationIdFromEnvironmentId(parsedInput.environmentId);
    await checkAuthorizationUpdated({
      userId: ctx.user.id,
      organizationId,
      access: [{ type: "organization", roles: ["owner", "manager"] }],
    });

    const results: { elementId: string; fileUrl: string; hash: string; error?: string }[] = [];

    // Process with concurrency of 3
    const CONCURRENCY = 3;
    const elements = parsedInput.elements;

    for (let i = 0; i < elements.length; i += CONCURRENCY) {
      const batch = elements.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.allSettled(
        batch.map(async (el) => {
          // Check hash — skip if unchanged
          const newHash = crypto.createHash("sha256")
            .update(`${el.scriptText}|${parsedInput.voiceName}|${parsedInput.languageCode}`)
            .digest("hex");
          if (el.currentHash === newHash) {
            return { elementId: el.elementId, fileUrl: "", hash: newHash, skipped: true };
          }

          const wavBuffer = await synthesizeSpeech({
            text: el.scriptText,
            languageCode: parsedInput.languageCode,
            voiceName: parsedInput.voiceName,
          });

          await initStorageFromDB();
          const { PutObjectCommand } = await import("@aws-sdk/client-s3");
          const { createS3Client, getActiveBucketName } = await import("@hivecfm/storage");
          const s3Client = createS3Client();
          const bucket = getActiveBucketName();
          if (!s3Client || !bucket) throw new Error("Storage not configured");

          const fileName = `tts-${el.elementId}-${parsedInput.languageCode}-${Date.now()}.wav`;
          const key = `${parsedInput.environmentId}/public/${fileName}`;
          await s3Client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: wavBuffer, ContentType: "audio/wav" }));

          return { elementId: el.elementId, fileUrl: `/storage/${parsedInput.environmentId}/public/${encodeURIComponent(fileName)}`, hash: newHash };
        })
      );

      for (const r of batchResults) {
        if (r.status === "fulfilled") {
          results.push(r.value as any);
        } else {
          results.push({ elementId: batch[results.length % batch.length]?.elementId || "", fileUrl: "", hash: "", error: String(r.reason) });
        }
      }
    }

    return { results };
  });
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/modules/survey/components/voice-selector.tsx apps/web/modules/survey/editor/actions/generate-audio.ts
git commit -m "feat(ui): add VoiceSelector component and batch generate action"
```

---

## Task 12: Migration — Welcome/ending card audio data migration

**Files:**
- Create: `apps/web/lib/survey/audio-migration.ts`
- Modify: Survey editor save flow

- [ ] **Step 1: Create audio migration utility**

Create `apps/web/lib/survey/audio-migration.ts`:

```typescript
import { TSurvey } from "@hivecfm/types/surveys/types";

const AUDIO_EXTENSIONS = [".wav", ".mp3", ".ogg", ".m4a"];

function isAudioUrl(url: string | undefined): boolean {
  if (!url) return false;
  return AUDIO_EXTENSIONS.some((ext) => url.toLowerCase().endsWith(ext));
}

/**
 * Migrate legacy audio fields on welcome/ending cards to the new audioUrl field.
 * Called before saving a voice survey in the editor.
 * Returns a modified survey object (does not mutate input).
 */
export function migrateVoiceSurveyAudio(survey: TSurvey): TSurvey {
  if (survey.type !== "voice") return survey;

  const result = { ...survey };

  // Welcome card: copy fileUrl audio to audioUrl
  if (result.welcomeCard?.fileUrl && isAudioUrl(result.welcomeCard.fileUrl) && !result.welcomeCard.audioUrl) {
    result.welcomeCard = {
      ...result.welcomeCard,
      audioUrl: { default: result.welcomeCard.fileUrl },
      audioSource: "upload",
      fileUrl: undefined, // clear legacy field
    };
  }

  // Ending cards: move imageUrl audio to audioUrl
  if (result.endings) {
    result.endings = result.endings.map((ending) => {
      if (ending.type === "endScreen" && ending.imageUrl && isAudioUrl(ending.imageUrl) && !ending.audioUrl) {
        return {
          ...ending,
          audioUrl: { default: ending.imageUrl },
          audioSource: "upload",
          imageUrl: undefined,
        };
      }
      return ending;
    });
  }

  return result;
}
```

- [ ] **Step 2: Hook migration into the survey editor save flow**

In the survey editor's save handler (find where `updateSurveyAction` or similar is called), add:

```typescript
import { migrateVoiceSurveyAudio } from "@/lib/survey/audio-migration";

// Before saving:
const surveyToSave = migrateVoiceSurveyAudio(localSurvey);
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/survey/audio-migration.ts
git commit -m "feat(migration): auto-migrate legacy welcome/ending card audio on save"
```

---

## Task 13: Integration and final wiring

**Files:**
- Modify: `apps/web/modules/survey/editor/page.tsx` (or equivalent editor entry point)

- [ ] **Step 1: Pass language context to voice preview and editor components**

Ensure the survey editor passes `selectedLanguageCode` and `surveyLanguageCodes` to:
- `VoicePreviewPanel`
- `ElementFormInput` components
- `AudioSourceControl` (via ElementFormInput)

- [ ] **Step 2: Add welcome card AudioSourceControl**

In the welcome card section of the editor, add `AudioSourceControl` for voice surveys:

```tsx
{isVoiceChannel && survey.welcomeCard?.enabled && (
  <AudioSourceControl
    environmentId={environmentId}
    audioSource={survey.welcomeCard.audioSource || "tts"}
    audioUrl={survey.welcomeCard.audioUrl as Record<string, string> | undefined}
    currentLanguage={selectedLanguageCode}
    availableLanguages={surveyLanguageCodes}
    cardType="welcome"
    cardHeadline={survey.welcomeCard.headline}
    cardSubheader={survey.welcomeCard.subheader}
    surveyVoiceConfig={survey.voiceConfig}
    onAudioSourceChange={(source) => updateWelcomeCard({ audioSource: source })}
    onAudioUrlChange={(url) => updateWelcomeCard({ audioUrl: url })}
    onFileUpload={(file) => handleWelcomeAudioUpload(file)}
  />
)}
```

- [ ] **Step 3: Build and verify compilation**

```bash
cd /Users/amrmostafa/Documents/XIC/02_Development/hivecfm-core
pnpm build --filter=@hivecfm/types
pnpm build --filter=@hivecfm/storage
pnpm build --filter=web
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat(ivr): wire all voice enhancement features into survey editor"
```

---

## Task 14: Deploy and verify

- [ ] **Step 1: Copy all changes to server**

```bash
# From local machine, sync the full project
scp -r packages/types/ ubuntu@server:/opt/hivecfm/hivecfm-core/packages/types/
scp -r apps/web/lib/google-tts/ ubuntu@server:/opt/hivecfm/hivecfm-core/apps/web/lib/google-tts/
scp -r apps/web/lib/genesys-cloud/ ubuntu@server:/opt/hivecfm/hivecfm-core/apps/web/lib/genesys-cloud/
# ... etc for all changed files
```

- [ ] **Step 2: Rebuild and restart**

```bash
ssh server "cd /opt/hivecfm/hivecfm-core && docker compose -f docker-compose.yml build hivecfm-core && docker compose -f docker-compose.yml up -d hivecfm-core"
```

- [ ] **Step 3: Verify each feature**

1. Open a voice survey in the editor
2. Verify TTS/Upload/Generate tabs appear on each question
3. Upload a WAV file — verify it plays in the preview panel
4. Switch language — verify separate audio per language
5. Generate audio via Google TTS — verify WAV is created and playable
6. Add an OpenText question — verify "Caller speaks" in preview
7. Test IVR API: `GET /ivr/{surveyId}?lang=ar` — verify Arabic text and audio URLs
8. Test media endpoint: `GET /ivr/{surveyId}/media/{qId}?lang=en` — verify correct file served
9. Test prompts endpoint: `GET /ivr/{surveyId}/prompts?lang=ar` — verify `_ar` suffix
10. Sync to Genesys — verify per-language prompts created

- [ ] **Step 4: Commit and push**

```bash
git push origin hivecfm-main
```

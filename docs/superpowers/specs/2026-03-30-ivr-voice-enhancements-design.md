# IVR Voice Survey Enhancements — Design Spec

**Date**: 2026-03-30
**Status**: Approved
**Scope**: 7 features shipped as a single release

---

## 1. Overview

Seven interconnected enhancements to the IVR/voice survey system: explicit TTS/audio control, audio player in preview, clean ending card audio, OpenText question support, multi-language audio files, AI-generated audio via Google TTS, and Genesys language-aware API.

## 2. Data Model Changes

### 2.1 New `audioSource` field on all survey elements

**Files**: `packages/types/surveys/elements.ts`, `packages/types/surveys/types.ts`

Add to every element type (NPS, Rating, MultipleChoiceSingle, CTA, OpenText):

```typescript
audioSource: z.enum(["tts", "upload", "generated"]).default("tts")
```

- `"tts"` — IVR system generates speech from question text (default, backward compatible)
- `"upload"` — play the uploaded audio file from `audioUrl`
- `"generated"` — play AI-generated audio from `audioUrl` (created via Google TTS)

Welcome card and ending card also get this field.

### 2.2 Change `audioUrl` type to accept both string and i18n record

**Files**: `packages/types/surveys/elements.ts`, `packages/types/surveys/types.ts`

Current:
```typescript
audioUrl: ZUrl.optional()  // z.string().url()
```

New — use `z.preprocess()` to handle both old string and new record formats:
```typescript
const ZAudioUrl = z.preprocess(
  (val) => {
    // Normalize legacy string to i18n record
    if (typeof val === "string") return { default: val };
    return val;
  },
  z.record(z.string(), z.string()).optional()
);
```

This ensures:
- Existing database records with `audioUrl: "https://..."` (string) parse without error — the preprocessor converts to `{ "default": "https://..." }`.
- New records use the i18n format: `{ "default": "arabic.wav", "en": "english.wav" }`.
- Zod parsing never breaks on existing data.

The preprocessor runs **before** Zod validation, not after, so no parse errors occur for legacy data.

### 2.3 Welcome card: add `audioUrl` alongside existing `fileUrl`

**File**: `packages/types/surveys/types.ts` — `ZSurveyWelcomeCard`

Add new field (do NOT rename or remove `fileUrl`):
```typescript
audioUrl: ZAudioUrl.optional(),
audioSource: z.enum(["tts", "upload", "generated"]).default("tts"),
```

- `fileUrl` continues to serve non-voice surveys (images, etc.).
- For voice surveys, the editor reads/writes `audioUrl`. The voice preview and IVR API use `audioUrl`.
- Migration: on first editor save for a voice survey with `fileUrl` containing a `.wav`/`.mp3` URL, copy it to `audioUrl["default"]` and clear `fileUrl`.

### 2.4 Add `audioUrl` to ending card

**File**: `packages/types/surveys/types.ts` — `ZSurveyEndScreenCard`

Add:
```typescript
audioUrl: ZAudioUrl.optional(),
audioSource: z.enum(["tts", "upload", "generated"]).default("tts"),
```

The existing `imageUrl` field remains for image/video use in non-voice surveys. Audio is now stored separately.

Migration heuristic for existing ending cards with audio in `imageUrl`:
- Check file extension: if `imageUrl` ends with `.wav`, `.mp3`, `.ogg`, `.m4a` → it's audio.
- Check survey type: only migrate if the survey is voice-type.
- On first editor save: move the audio URL to `audioUrl["default"]`, clear `imageUrl`.

### 2.5 Add OpenText to voice-compatible types

**File**: `packages/types/channel.ts`

```typescript
export const VOICE_COMPATIBLE_ELEMENT_TYPES = [
  "nps",
  "rating",
  "multipleChoiceSingle",
  "cta",
  "openText",  // NEW
] as const;
```

### 2.6 Add `speech` input type to IVR config

**File**: `apps/web/app/api/v1/client/[environmentId]/ivr/[surveyId]/lib/ivr.ts`

Add new `IvrInputConfigSpeech` variant to the `IvrInputConfig` type union:
```typescript
interface IvrInputConfigSpeech {
  inputType: "speech";
  maxDurationSeconds: number;  // default 30
  silenceTimeoutSeconds: number;  // default 3
}
```

Add a case in `buildInputConfig()` for `TSurveyElementTypeEnum.OpenText`:
```typescript
case TSurveyElementTypeEnum.OpenText:
  return {
    inputType: "speech",
    maxDurationSeconds: 30,
    silenceTimeoutSeconds: 3,
  };
```

Without this case, OpenText elements would return `null` from `buildInputConfig()` and be silently dropped from the IVR response.

### 2.7 Add voice config to survey

**File**: `packages/types/surveys/types.ts` — `ZSurvey`

Add optional field:
```typescript
voiceConfig: z.object({
  ttsProvider: z.enum(["google"]).optional(),
  voices: z.record(z.string(), z.string()).optional(),
}).optional()
```

**Precedence note**: `survey.voiceConfig` governs AI-generated audio creation in the HiveCFM editor (Point 7). The channel-level `ZVoiceChannelConfig.ttsEngine` governs live TTS rendering by the IVR platform at call time (Genesys/MRCP). These are distinct concerns — one controls pre-generated audio files, the other controls real-time speech synthesis during the call.

## 3. Migration Strategy

**No database migration required.** All changes handled via Zod `z.preprocess()` and runtime normalization:

| Scenario | How it's handled |
|----------|------------------|
| `audioUrl` is a plain string in DB | `z.preprocess()` converts to `{ "default": url }` before Zod validates |
| Element has no `audioSource` | Zod `.default("tts")` fills it |
| Ending card has audio in `imageUrl` | Editor migration on first save (check extension + survey type) |
| Welcome card has audio in `fileUrl` | Editor migration on first save (copy to `audioUrl`, clear `fileUrl`) |
| New surveys | Use new format natively |

The `z.preprocess()` normalizer is the interception point — it runs inline within the Zod schema definition, before any validation. No separate "normalizer function" is needed.

## 4. UI Changes

### 4.1 Audio Source Control Component (Point 1 + Point 7)

**New file**: `apps/web/modules/survey/components/audio-source-control.tsx`

A unified control shown per question in the voice survey editor:

```
+---------------------------------------------+
|  Audio Source                                |
|  [  TTS  ]  [ Upload ]  [ Generate AI ]     |
|                                              |
|  [When Upload selected]                      |
|  +-------------------------------------+    |
|  |  Drop WAV file here or click        |    |
|  +-------------------------------------+    |
|  Accepted: WAV (8kHz/16kHz mono, max 5MB)   |
|                                              |
|  [When Generate AI selected]                 |
|  Script: "question text + DTMF instructions" |
|  Voice: [ar-XA-Standard-A v]                 |
|  [Generate Audio]  [Preview >]               |
|                                              |
|  [When audio exists]                         |
|  > ==================== 0:04 / 0:08         |
|                                              |
|  Language: [Arabic v] [English v]            |
|  (upload/generate different audio per lang)  |
+---------------------------------------------+
```

**Behavior**:
- "TTS" tab: shows the script text that the IVR will speak. No file needed.
- "Upload" tab: shows file drop zone with validation (WAV preferred, max 5MB, 8kHz or 16kHz mono for telephony quality). Sets `audioSource: "upload"`.
- "Generate AI" tab: only shown when Google AI integration is configured (checked at page load via integration table query). Shows editable script, voice selector, generate button. Sets `audioSource: "generated"`.
- Language selector: switches between languages. Each language can have its own audio file in the `audioUrl` i18n map.
- Audio player: HTML5 `<audio>` element shown whenever an audio file exists for the current language.

### 4.2 Voice Preview Panel Enhancement (Point 3)

**File**: `apps/web/modules/survey/editor/components/voice-preview-panel.tsx`

Current: shows text and DTMF keypad only.

Enhanced:
- When `audioSource === "tts"`: show `TTS` badge + the generated script text.
- When `audioSource === "upload"` or `"generated"` and audio exists: show inline `<audio>` player with play/pause, seek bar, duration.
- When `audioSource === "upload"` but no audio uploaded: show warning "No audio file uploaded".
- For OpenText questions: show "Caller speaks their answer" indicator and speech icon instead of DTMF keypad.
- Respects current language selection for multi-language preview.

### 4.3 Editor: Ending Card Audio (Point 4)

**File**: `apps/web/modules/survey/components/element-form-input/index.tsx`

For voice surveys, the ending card section shows the same `AudioSourceControl` component instead of the image uploader. The `audioUrl` field is used (not `imageUrl`).

For non-voice surveys, the ending card continues to show image/video upload using `imageUrl` as before.

### 4.4 Editor: OpenText in Voice Survey (Point 5)

When the survey is voice-type, the element type palette includes OpenText. The element editor shows the standard headline/subheader fields plus the `AudioSourceControl`. No DTMF configuration is shown (since input is speech, not keypad).

### 4.5 Language-Aware Audio Upload (Point 6)

The `AudioSourceControl` component includes a language switcher (same dropdown used for text translations). When the designer switches language:
- The audio player shows the audio for that language (or "No audio" if none).
- The upload zone uploads to that language's slot in the `audioUrl` i18n map.
- The AI generate button generates audio using that language's text + voice.

## 5. Google TTS Integration (Point 7)

### 5.1 Google Cloud TTS Client

**New file**: `apps/web/lib/google-tts/client.ts`

```typescript
interface TtsRequest {
  text: string;
  languageCode: string;  // e.g. "ar-XA", "en-US"
  voiceName: string;     // e.g. "ar-XA-Standard-A"
  audioEncoding: "LINEAR16";
  sampleRateHertz: 8000;  // telephony standard
}

async function synthesizeSpeech(request: TtsRequest): Promise<Buffer>
async function listVoices(languageCode?: string): Promise<Voice[]>
```

Uses Google API key from:
1. Integration table: type `"googleAi"` with `config.key.apiKey`
2. Env var fallback: `GOOGLE_API_KEY`

API endpoint: `POST https://texttospeech.googleapis.com/v1/text:synthesize`

**Audio format note**: Google TTS returns raw LINEAR16 (PCM) data, not WAV with headers. The client must prepend a valid WAV header (RIFF header with sample rate 8000Hz, 16-bit, mono) before storing the file. This ensures IVR systems and Genesys can parse the audio correctly.

### 5.2 IVR Script Builder

**New file**: `apps/web/lib/google-tts/script-builder.ts`

Builds complete IVR-ready script per element type and language:

| Element Type | Script Template |
|---|---|
| Welcome Card | `{headline}. {subheader}` |
| Ending Card | `{headline}. {subheader}` |
| NPS (0-10) | `{headline}. {selectNumberPrompt} {lowerLabel} {andMeansPrompt} {upperLabel}.` |
| Rating (1-N) | `{headline}. {pressPrompt} 1 {ifPrompt} {lowerLabel}, {pressPrompt} {range} {ifPrompt} {upperLabel}.` |
| MultipleChoiceSingle | `{headline}. {pressPrompt} 1 {forPrompt} {choice1}, {pressPrompt} 2 {forPrompt} {choice2}, ...` |
| CTA | `{headline}. {pressToContinuePrompt}.` |
| OpenText | `{headline}. {speakAfterBeepPrompt}.` |

All template phrases (`{pressPrompt}`, `{forPrompt}`, etc.) come from i18n translation files, resolved by the current language.

### 5.3 Script Template i18n

**New file**: `apps/web/lib/google-tts/script-templates.ts`

```typescript
const SCRIPT_TEMPLATES: Record<string, Record<string, string>> = {
  pressPrompt: {
    "default": "اضغط",
    "en": "Press",
  },
  forPrompt: {
    "default": "لاختيار",
    "en": "for",
  },
  selectNumberPrompt: {
    "default": "اختر رقم من صفر إلى عشرة",
    "en": "Select a number from zero to ten",
  },
  pressToContinuePrompt: {
    "default": "اضغط 1 للمتابعة",
    "en": "Press 1 to continue",
  },
  speakAfterBeepPrompt: {
    "default": "تفضل بالإجابة بعد الصافرة",
    "en": "Please speak your answer after the beep",
  },
  andMeansPrompt: {
    "default": "يعني",
    "en": "means",
  },
  ifPrompt: {
    "default": "إذا",
    "en": "if",
  },
};
```

### 5.4 Voice Selection

Survey-level voice config stored in `survey.voiceConfig.voices`:
```json
{
  "default": "ar-XA-Standard-A",
  "en": "en-US-Standard-C"
}
```

The UI shows a voice dropdown filtered by the current language code. A preview button plays a short sample of the selected voice.

### 5.5 Batch Generate

A "Generate All" button in the survey editor toolbar (voice surveys only):
1. Iterates all elements + welcome + ending card.
2. For the current language, builds the script for each.
3. Calls Google TTS API sequentially with concurrency of 3 to respect rate limits (Google Cloud TTS default: 300 req/min).
4. Uploads generated WAV to MinIO.
5. Updates each element's `audioUrl[currentLang]` and `audioSource: "generated"`.
6. Shows progress bar with per-element status.

**Error handling**: If some elements fail, show partial success: "Generated 15/20 questions. 5 failed — retry?" The successful ones are kept. The user can retry failed ones individually.

**Caching**: Before generating, compute SHA-256 of `(script text + voice name + language)`. Store the hash on the element as `audioGenerationHash: Record<string, string>` keyed by language. Skip regeneration if hash matches. This field is added to the element type alongside `audioUrl`.

## 6. IVR API Changes

### 6.1 GET `/ivr/{surveyId}?lang=xx`

**New query parameter**: `lang` (optional, string, ISO language code)

**Add `lang` to reserved params**: In `route.ts`, add `"lang"` to the reserved params set so it is not passed through as a hidden field value.

Behavior:
- If `lang` is provided and the survey has that language enabled: return all text content (`questionText`, `subheader`) in that language, and `audioUrl` pointing to `?lang=xx` media endpoint.
- If `lang` is not provided or language not found: return default language (current behavior).
- Response includes `language` field indicating which language was resolved.
- Response includes `availableLanguages` array listing all enabled languages.
- Response includes `audioSource` field on each question, welcome card, and ending card.

Contract for `audioSource`:
- `"tts"` → `audioUrl` is `null`. The IVR system should speak `questionText` via its own TTS engine.
- `"upload"` or `"generated"` → `audioUrl` is a URL to the media endpoint. The IVR system should play this audio file.

Updated response structure:
```json
{
  "survey": {
    "id": "...",
    "name": "...",
    "language": "ar",
    "availableLanguages": ["ar", "en"],
    "welcomeCard": {
      "headline": "...",
      "audioUrl": "/api/v1/client/.../ivr/.../media/welcome?lang=ar",
      "audioSource": "generated",
      "genesysPromptName": "hivecfm_abc_welcome_ar"
    },
    "questions": [
      {
        "questionId": "q1",
        "questionText": "...",
        "audioUrl": "/api/v1/client/.../ivr/.../media/q1?lang=ar",
        "audioSource": "upload",
        "genesysPromptName": "hivecfm_abc_q1_ar",
        "type": "nps",
        "inputConfig": {
          "inputType": "numeric",
          "min": 0,
          "max": 10
        }
      },
      {
        "questionId": "q2",
        "questionText": "...",
        "audioUrl": null,
        "audioSource": "tts",
        "genesysPromptName": "hivecfm_abc_q2_ar",
        "type": "openText",
        "inputConfig": {
          "inputType": "speech",
          "maxDurationSeconds": 30,
          "silenceTimeoutSeconds": 3
        }
      }
    ],
    "endingCard": {
      "headline": "...",
      "audioUrl": "/api/v1/client/.../ivr/.../media/ending?lang=ar",
      "audioSource": "generated",
      "genesysPromptName": "hivecfm_abc_ending_ar"
    }
  }
}
```

### 6.2 GET `/ivr/{surveyId}/media/{questionId}?lang=xx`

**New query parameter**: `lang` (optional)

Updated resolution logic:
```typescript
// 1. Get the element's audioUrl (now TI18nString or undefined)
const audioUrlMap = targetElement.audioUrl;
if (!audioUrlMap) return new Response(null, { status: 404 });

// 2. Resolve language-specific URL
const lang = searchParams.get("lang");
const resolvedUrl = (lang && audioUrlMap[lang]) || audioUrlMap["default"];
if (!resolvedUrl) return new Response(null, { status: 404 });

// 3. Backward compat: handle case where audioUrl was a plain string
// (the z.preprocess normalizer should have already converted, but guard)
const finalUrl = typeof resolvedUrl === "string" ? resolvedUrl : resolvedUrl;

// 4. Serve the file
const storageInfo = parseStorageUrl(finalUrl);
```

Also supports `questionId` values `welcome` and `ending` for card audio.

### 6.3 GET `/ivr/{surveyId}/prompts?lang=xx`

**New query parameter**: `lang` (optional)

Behavior:
- If `lang` provided: return prompt names with language suffix.
- If no `lang`: return default language prompt names (no suffix, backward compatible).

Response:
```json
{
  "requestedLanguage": "ar",
  "availableLanguages": ["ar", "en"],
  "prompts": {
    "welcome": {
      "promptName": "hivecfm_abc_welcome_ar",
      "promptId": "genesys-prompt-uuid",
      "language": "ar"
    },
    "q1": {
      "promptName": "hivecfm_abc_q1_ar",
      "promptId": "genesys-prompt-uuid",
      "language": "ar"
    },
    "ending": {
      "promptName": "hivecfm_abc_ending_ar",
      "promptId": "genesys-prompt-uuid",
      "language": "ar"
    }
  }
}
```

### 6.4 POST `/ivr/{surveyId}/responses`

Existing `language` field in `ZIvrResponseInput` is already supported. No changes needed — the consuming system passes the caller's language and it's recorded on the response for analytics.

## 7. Genesys Cloud Integration Changes

### 7.1 Prompt Naming Convention

Current: `hivecfm_{surveyId}_{elementId}`
New: `hivecfm_{surveyId}_{elementId}_{langCode}` (for non-default languages)

Default language prompts keep the original name (no suffix) for backward compatibility:
```
hivecfm_abc_q1          <- default language (e.g., Arabic)
hivecfm_abc_q1_en       <- English
hivecfm_abc_welcome     <- default
hivecfm_abc_welcome_en  <- English
hivecfm_abc_ending      <- default
hivecfm_abc_ending_en   <- English
```

**Default language change**: If the survey's default language changes after prompts are synced, the next sync will re-upload the new default language audio to the unsuffixed prompt name. The old default audio is not automatically preserved — the admin should re-sync all languages. This is acceptable because default language changes are rare.

### 7.2 Prompt Sync Enhancement

**File**: `apps/web/lib/genesys-cloud/prompt-sync.ts`

Current `syncAudioPromptsToGenesys()` creates one prompt per element.

New behavior:
1. For each element with `audioSource !== "tts"`:
   - For each enabled language in the survey:
     - If `audioUrl[langCode]` exists:
       - Determine prompt name: unsuffixed for default lang, `_{langCode}` for others
       - Create/update Genesys prompt
       - Download audio from storage
       - Upload WAV to Genesys prompt resource with mapped language code
2. Same for welcome card and ending card (only the first ending card — `survey.endings[0]` — is synced, matching current behavior).
3. Store mapping in integration config data:
   ```json
   {
     "elementId": "q1",
     "language": "ar",
     "promptId": "genesys-uuid",
     "promptName": "hivecfm_abc_q1_ar"
   }
   ```

### 7.3 Language Code Mapping

**New utility**: `apps/web/lib/genesys-cloud/language-map.ts`

Survey i18n keys use ISO 639-1 codes (`"ar"`, `"en"`, `"fr"`). Genesys uses locale codes (`"ar-sa"`, `"en-us"`, `"fr-fr"`).

```typescript
const LANG_TO_GENESYS: Record<string, string> = {
  ar: "ar-sa",
  en: "en-us",
  fr: "fr-fr",
  es: "es-es",
  de: "de-de",
  // extensible
};

export function toGenesysLanguage(langCode: string): string {
  return LANG_TO_GENESYS[langCode] || `${langCode}-${langCode}`;
}
```

Used in `uploadPromptResource()` and prompt sync logic.

### 7.4 Genesys Client Enhancement

**File**: `apps/web/lib/genesys-cloud/client.ts`

`uploadPromptResource()` — add `language` parameter:
```typescript
async uploadPromptResource(
  token: string,
  promptId: string,
  wavBuffer: Buffer,
  language: string  // Genesys locale, e.g. "ar-sa"
): Promise<void>
```

### 7.5 Updated Genesys Data Actions

The downloadable Data Actions JSON files add a `language` input parameter:

**HiveCFM_GetSurveyQuestions**:
```json
{
  "name": "HiveCFM_GetSurveyQuestions",
  "actionInput": {
    "surveyId": { "type": "string" },
    "language": { "type": "string", "required": false },
    "hiddenFields": { "type": "object", "required": false }
  },
  "config": {
    "url": "https://{host}/api/v1/client/{envId}/ivr/{surveyId}?lang={{language}}",
    "method": "GET"
  }
}
```

**HiveCFM_GetPromptNames**:
```json
{
  "name": "HiveCFM_GetPromptNames",
  "actionInput": {
    "surveyId": { "type": "string" },
    "language": { "type": "string", "required": true }
  },
  "config": {
    "url": "https://{host}/api/v1/client/{envId}/ivr/{surveyId}/prompts?lang={{language}}",
    "method": "GET"
  }
}
```

**HiveCFM_SubmitAnswer**:
```json
{
  "name": "HiveCFM_SubmitAnswer",
  "actionInput": {
    "surveyId": { "type": "string" },
    "callId": { "type": "string" },
    "callerNumber": { "type": "string" },
    "answers": { "type": "object" },
    "language": { "type": "string", "required": false },
    "finished": { "type": "boolean" }
  },
  "config": {
    "url": "https://{host}/api/v1/client/{envId}/ivr/{surveyId}/responses",
    "method": "POST"
  }
}
```

### 7.6 Genesys Architect Flow Guidance

The Genesys IVR Info panel adds a note explaining the recommended Architect flow for multi-language:

1. **Language menu block**: Play prompt asking caller to select language.
2. **Set language variable**: Based on DTMF input, set `Flow.language = "ar"` or `"en"`.
3. **Call GetPromptNames**: Pass `language` to get language-specific prompt names.
4. **Loop through questions**: For each prompt, play the language-specific Genesys prompt.
5. **Submit response**: Include `language` in the response payload.

## 8. File Inventory

### New Files
| File | Purpose |
|------|---------|
| `apps/web/lib/google-tts/client.ts` | Google Cloud TTS API client (with WAV header) |
| `apps/web/lib/google-tts/script-builder.ts` | Build IVR scripts per element type |
| `apps/web/lib/google-tts/script-templates.ts` | i18n template phrases for scripts |
| `apps/web/lib/genesys-cloud/language-map.ts` | ISO 639-1 to Genesys locale mapping |
| `apps/web/modules/survey/components/audio-source-control.tsx` | TTS/Upload/Generate unified control |

### Modified Files
| File | Change |
|------|--------|
| `packages/types/surveys/elements.ts` | Add `audioSource`, `audioGenerationHash`; change `audioUrl` to `ZAudioUrl` (preprocess wrapper) |
| `packages/types/surveys/types.ts` | Ending card `audioUrl`, welcome card `audioUrl`, `voiceConfig` on survey |
| `packages/types/channel.ts` | Add `openText` to voice-compatible types |
| `apps/web/app/api/v1/client/.../ivr/[surveyId]/route.ts` | `?lang` param, add `lang` to reserved params |
| `apps/web/app/api/v1/client/.../ivr/[surveyId]/media/[questionId]/route.ts` | `?lang` param, resolve from i18n map |
| `apps/web/app/api/v1/client/.../ivr/[surveyId]/prompts/route.ts` | `?lang` param, language-suffixed names |
| `apps/web/app/api/v1/client/.../ivr/[surveyId]/lib/ivr.ts` | `IvrInputConfigSpeech` type, `buildInputConfig()` OpenText case, `audioSource` in response, language resolution |
| `apps/web/lib/genesys-cloud/prompt-sync.ts` | Per-language prompt creation, first-ending-only scope |
| `apps/web/lib/genesys-cloud/client.ts` | Language param on `uploadPromptResource()` |
| `apps/web/modules/survey/editor/components/voice-preview-panel.tsx` | Audio player, TTS badge, OpenText speech indicator |
| `apps/web/modules/survey/components/element-form-input/index.tsx` | Use `AudioSourceControl` for voice, ending card `audioUrl` |
| `apps/web/modules/survey/editor/components/genesys-ivr-info.tsx` | Updated Data Actions with language param |

## 9. Backward Compatibility

| Scenario | Behavior |
|----------|----------|
| Existing surveys with `audioUrl: string` | `z.preprocess()` converts to `{ "default": url }` before Zod validates |
| Existing surveys without `audioSource` | Defaults to `"tts"` via Zod `.default()` |
| IVR API called without `?lang` | Returns default language (current behavior) |
| Genesys prompts without language suffix | Continue working (default language) |
| Ending cards with audio in `imageUrl` | Migrated to `audioUrl` on first editor save (checked by extension + survey type) |
| Welcome cards with audio in `fileUrl` | Copied to `audioUrl` on first editor save for voice surveys |
| OpenText in existing voice surveys | Not present; only available when adding new questions |
| Default language change after Genesys sync | Next sync re-uploads; admin should re-sync all languages |

## 10. Google API Key Configuration

The Google TTS integration reads the API key from:
1. Integration table: type `"googleAi"` with `config.key.apiKey`
2. Env var fallback: `GOOGLE_API_KEY`

The key should be configured via the integration page UI or set as an environment variable. Do not commit API keys to source control.

import { TIntegrationGenesysCloud } from "@hivecfm/types/integration/genesys-cloud";
import { createOrUpdateIntegration, getIntegrationByType } from "@/lib/integration/service";
import { createPrompt, getAccessToken, uploadPromptResource } from "./client";
import { toGenesysLanguage } from "./language-map";

interface SurveyElement {
  id: string;
  audioUrl?: Record<string, string>;
  audioSource?: string;
}

interface SurveyLanguage {
  language: { code: string };
  default: boolean;
  enabled: boolean;
}

interface SurveyForSync {
  id: string;
  name: string;
  elements: SurveyElement[];
  welcomeAudioUrl?: Record<string, string>;
  welcomeAudioSource?: string;
  endingAudioUrl?: Record<string, string>;
  endingAudioSource?: string;
  languages?: SurveyLanguage[];
}

interface PromptMapping {
  elementId: string;
  promptId: string;
  promptName: string;
  language?: string;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  total: number;
  errors: string[];
}

/**
 * Download audio from a URL and upload it as a Genesys prompt resource.
 * Returns true on success.
 */
async function downloadAndUpload(
  token: string,
  environmentUrl: string,
  promptId: string,
  audioUrl: string,
  genesysLanguage: string,
  label: string,
  errors: string[]
): Promise<boolean> {
  // Convert relative storage paths to absolute URLs
  const WEBAPP_URL = process.env.WEBAPP_URL || "https://hivecfm.xcai.io";
  const fullUrl = audioUrl.startsWith("http") ? audioUrl : `${WEBAPP_URL}${audioUrl}`;
  const audioResponse = await fetch(fullUrl);
  if (!audioResponse.ok) {
    const msg = `Failed to download audio for ${label}: ${audioResponse.status}`;
    console.error(msg);
    errors.push(msg);
    return false;
  }
  const audioBuffer = await audioResponse.arrayBuffer();
  await uploadPromptResource(token, environmentUrl, promptId, audioBuffer, genesysLanguage);
  return true;
}

/**
 * Sync audio prompts to Genesys Cloud with per-language support.
 *
 * For each element/card with audioSource !== "tts", we iterate over enabled languages
 * and create a separate prompt resource for each language that has an audio URL.
 * The default language prompt keeps the base name; other languages get a `_${langCode}` suffix.
 */
export async function syncAudioPromptsToGenesys(
  environmentId: string,
  survey: SurveyForSync
): Promise<SyncResult> {
  const integration = (await getIntegrationByType(
    environmentId,
    "genesysCloud"
  )) as TIntegrationGenesysCloud | null;

  if (!integration?.config?.key) {
    return { success: false, synced: 0, total: 0, errors: ["Genesys Cloud integration not configured"] };
  }

  const credentials = integration.config.key;
  const existingData = (integration.config.data ?? []) as PromptMapping[];

  // Determine enabled languages and default language code
  const enabledLanguages = survey.languages?.filter((l) => l.enabled) ?? [];
  const defaultLangCode = survey.languages?.find((l) => l.default)?.language?.code || "default";

  const token = await getAccessToken(credentials);
  const updatedMappings: PromptMapping[] = [...existingData];
  const errors: string[] = [];
  let synced = 0;
  let total = 0;

  /**
   * Process an audio URL map for a given element/card across all enabled languages.
   */
  async function syncAudioItem(
    itemId: string,
    audioUrlMap: Record<string, string> | undefined,
    audioSource: string | undefined,
    descriptionPrefix: string
  ): Promise<void> {
    // Skip TTS-only items — those don't need prompt uploads
    if (!audioUrlMap || audioSource === "tts") return;

    // Determine which languages to sync
    const languagesToSync =
      enabledLanguages.length > 0
        ? enabledLanguages
        : // Fallback: single default language based on audioUrl keys
          [{ language: { code: defaultLangCode }, default: true, enabled: true }];

    for (const lang of languagesToSync) {
      const langCode = lang.language.code;
      const isDefault = lang.default;

      // Look up audio URL: default language uses the "default" key, others use the lang code
      const audioKey = isDefault ? "default" : langCode;
      const audioUrl = audioUrlMap[audioKey];
      if (!audioUrl) continue;

      total++;

      // Prompt name: no suffix for default language, _langCode for others
      const baseName = `hivecfm_${survey.id}_${itemId}`.replace(/[^a-zA-Z0-9_]/g, "_");
      const promptName = isDefault ? baseName : `${baseName}_${langCode}`;
      const genesysLanguage = toGenesysLanguage(langCode);

      try {
        // Create or find the prompt in Genesys
        const prompt = await createPrompt(
          token,
          credentials.environmentUrl,
          promptName,
          `${descriptionPrefix} (${langCode}) for survey "${survey.name}"`
        );

        // Update or add mapping (keyed by elementId + language)
        const mappingKey = isDefault ? itemId : `${itemId}_${langCode}`;
        const existingIdx = updatedMappings.findIndex((m) => m.elementId === mappingKey);
        const mapping: PromptMapping = {
          elementId: mappingKey,
          promptId: prompt.id,
          promptName,
          language: langCode,
        };
        if (existingIdx >= 0) {
          updatedMappings[existingIdx] = mapping;
        } else {
          updatedMappings.push(mapping);
        }

        // Download and upload audio
        const uploaded = await downloadAndUpload(
          token,
          credentials.environmentUrl,
          prompt.id,
          audioUrl,
          genesysLanguage,
          `${itemId} [${langCode}]`,
          errors
        );
        if (uploaded) synced++;
      } catch (error) {
        const msg = `Failed to sync prompt for ${itemId} [${langCode}]: ${error instanceof Error ? error.message : String(error)}`;
        console.error(msg, error);
        errors.push(msg);
      }
    }
  }

  // Sync element audio prompts
  for (const element of survey.elements) {
    await syncAudioItem(
      element.id,
      element.audioUrl,
      element.audioSource,
      `Audio prompt for element ${element.id}`
    );
  }

  // Sync welcome card audio
  await syncAudioItem("welcome", survey.welcomeAudioUrl, survey.welcomeAudioSource, "Welcome audio");

  // Sync ending card audio
  await syncAudioItem("ending", survey.endingAudioUrl, survey.endingAudioSource, "Ending audio");

  // Save updated mappings back to the integration config
  try {
    const cleanMappings = updatedMappings.map((m) => ({
      elementId: m.elementId,
      promptId: m.promptId,
      promptName: m.promptName,
      ...(m.language ? { language: m.language } : {}),
    }));
    await createOrUpdateIntegration(environmentId, {
      type: "genesysCloud",
      config: {
        key: credentials,
        data: cleanMappings,
      },
    });
  } catch (error) {
    const msg = `Failed to save prompt mappings: ${error instanceof Error ? error.message : String(error)}`;
    console.error(msg, error);
    errors.push(msg);
  }

  return {
    success: errors.length === 0,
    synced,
    total,
    errors,
  };
}

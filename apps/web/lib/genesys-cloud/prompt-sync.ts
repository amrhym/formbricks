import { TIntegrationGenesysCloud } from "@hivecfm/types/integration/genesys-cloud";
import { createOrUpdateIntegration, getIntegrationByType } from "@/lib/integration/service";
import { createPrompt, getAccessToken, uploadPromptResource } from "./client";

interface SurveyElement {
  id: string;
  audioUrl?: string;
}

interface SurveyForSync {
  id: string;
  name: string;
  elements: SurveyElement[];
}

interface PromptMapping {
  elementId: string;
  promptId: string;
  promptName: string;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  total: number;
  errors: string[];
}

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

  const elementsWithAudio = survey.elements.filter((el) => el.audioUrl);
  if (elementsWithAudio.length === 0) {
    return { success: true, synced: 0, total: 0, errors: [] };
  }

  const token = await getAccessToken(credentials);
  const updatedMappings: PromptMapping[] = [...existingData];
  const errors: string[] = [];
  let synced = 0;

  for (const element of elementsWithAudio) {
    const promptName = `hivecfm_${survey.id}_${element.id}`.replace(/[^a-zA-Z0-9_]/g, "_");
    const existingMapping = existingData.find((m) => m.elementId === element.id);

    try {
      let promptId: string;

      // Always create or find the prompt — handles deleted prompts gracefully
      const prompt = await createPrompt(
        token,
        credentials.environmentUrl,
        promptName,
        `Audio prompt for survey "${survey.name}" element ${element.id}`
      );
      promptId = prompt.id;

      // Update or add mapping
      const existingIdx = updatedMappings.findIndex((m) => m.elementId === element.id);
      if (existingIdx >= 0) {
        updatedMappings[existingIdx] = { elementId: element.id, promptId, promptName };
      } else {
        updatedMappings.push({ elementId: element.id, promptId, promptName });
      }

      // Download audio from the URL and upload to Genesys
      const audioResponse = await fetch(element.audioUrl!);
      if (!audioResponse.ok) {
        const msg = `Failed to download audio for element ${element.id}: ${audioResponse.status}`;
        console.error(msg);
        errors.push(msg);
        continue;
      }
      const audioBuffer = await audioResponse.arrayBuffer();

      await uploadPromptResource(token, credentials.environmentUrl, promptId, audioBuffer);
      synced++;
    } catch (error) {
      const msg = `Failed to sync prompt for element ${element.id}: ${error instanceof Error ? error.message : String(error)}`;
      console.error(msg, error);
      errors.push(msg);
    }
  }

  // Save updated mappings back to the integration config
  try {
    // Clean mappings — only keep valid fields, strip any corrupt data
    const cleanMappings = updatedMappings.map((m) => ({
      elementId: m.elementId,
      promptId: m.promptId,
      promptName: m.promptName,
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
    total: elementsWithAudio.length,
    errors,
  };
}

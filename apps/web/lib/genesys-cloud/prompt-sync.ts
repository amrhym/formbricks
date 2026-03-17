import { TIntegrationGenesysCloud } from "@hivecfm/types/integration/genesys-cloud";
import { getIntegrationByType } from "@/lib/integration/service";
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

export async function syncAudioPromptsToGenesys(environmentId: string, survey: SurveyForSync): Promise<void> {
  const integration = (await getIntegrationByType(
    environmentId,
    "genesysCloud"
  )) as TIntegrationGenesysCloud | null;

  if (!integration?.config?.key) {
    return;
  }

  const credentials = integration.config.key;
  const existingData = (integration.config.data ?? []) as PromptMapping[];

  const elementsWithAudio = survey.elements.filter((el) => el.audioUrl);
  if (elementsWithAudio.length === 0) {
    return;
  }

  const token = await getAccessToken(credentials);
  const updatedMappings: PromptMapping[] = [...existingData];

  for (const element of elementsWithAudio) {
    const promptName = `hivecfm-${survey.id}-${element.id}`;
    const existingMapping = existingData.find((m) => m.elementId === element.id);

    try {
      let promptId: string;

      if (existingMapping) {
        promptId = existingMapping.promptId;
      } else {
        const prompt = await createPrompt(
          token,
          credentials.environmentUrl,
          promptName,
          `Audio prompt for survey "${survey.name}" element ${element.id}`
        );
        promptId = prompt.id;
        updatedMappings.push({
          elementId: element.id,
          promptId,
          promptName,
        });
      }

      // Download audio from the URL and upload to Genesys
      const audioResponse = await fetch(element.audioUrl!);
      if (!audioResponse.ok) {
        console.error(`Failed to download audio for element ${element.id}: ${audioResponse.status}`);
        continue;
      }
      const audioBuffer = await audioResponse.arrayBuffer();

      await uploadPromptResource(token, credentials.environmentUrl, promptId, audioBuffer);
    } catch (error) {
      console.error(`Failed to sync prompt for element ${element.id}:`, error);
    }
  }
}

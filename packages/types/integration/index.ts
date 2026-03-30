import { z } from "zod";
import { ZIntegrationAirtableConfig, ZIntegrationAirtableInput } from "./airtable";
import { ZIntegrationGenesysCloudConfig, ZIntegrationGenesysCloudInput } from "./genesys-cloud";
import { ZIntegrationGoogleAiConfig, ZIntegrationGoogleAiInput } from "./google-ai";
import { ZIntegrationGoogleSheetsConfig, ZIntegrationGoogleSheetsInput } from "./google-sheet";
import { ZIntegrationHivecfmHubConfig, ZIntegrationHivecfmHubInput } from "./hivecfm-hub";
import { ZIntegrationLlmConfig, ZIntegrationLlmInput } from "./llm";
import { ZIntegrationNotionConfig, ZIntegrationNotionInput } from "./notion";
import { ZIntegrationNovuConfig, ZIntegrationNovuInput } from "./novu";
import { ZIntegrationSlackConfig, ZIntegrationSlackInput } from "./slack";
import { ZIntegrationStorageConfig, ZIntegrationStorageInput } from "./storage";
import { ZIntegrationSupersetConfig, ZIntegrationSupersetInput } from "./superset";

export const ZIntegrationType = z.enum([
  "googleSheets",
  "n8n",
  "airtable",
  "notion",
  "slack",
  "novu",
  "storage",
  "genesysCloud",
  "superset",
  "llm",
  "hivecfmHub",
  "googleAi",
]);
export type TIntegrationType = z.infer<typeof ZIntegrationType>;

export const ZIntegrationConfig = z.union([
  ZIntegrationGoogleSheetsConfig,
  ZIntegrationAirtableConfig,
  ZIntegrationNotionConfig,
  ZIntegrationSlackConfig,
  ZIntegrationNovuConfig,
  ZIntegrationStorageConfig,
  ZIntegrationGenesysCloudConfig,
  ZIntegrationSupersetConfig,
  ZIntegrationLlmConfig,
  ZIntegrationHivecfmHubConfig,
  ZIntegrationGoogleAiConfig,
]);

export type TIntegrationConfig = z.infer<typeof ZIntegrationConfig>;

export const ZIntegrationBase = z.object({
  id: z.string(),
  environmentId: z.string(),
});

export const ZIntegration = ZIntegrationBase.extend({
  type: ZIntegrationType,
  config: ZIntegrationConfig,
});

export type TIntegration = z.infer<typeof ZIntegration>;

export const ZIntegrationBaseSurveyData = z.object({
  createdAt: z.date(),
  elementIds: z.array(z.string()),
  elements: z.string(),
  surveyId: z.string(),
  surveyName: z.string(),
});

export const ZIntegrationInput = z.discriminatedUnion("type", [
  ZIntegrationGoogleSheetsInput,
  ZIntegrationAirtableInput,
  ZIntegrationNotionInput,
  ZIntegrationSlackInput,
  ZIntegrationNovuInput,
  ZIntegrationStorageInput,
  ZIntegrationGenesysCloudInput,
  ZIntegrationSupersetInput,
  ZIntegrationLlmInput,
  ZIntegrationHivecfmHubInput,
  ZIntegrationGoogleAiInput,
]);
export type TIntegrationInput = z.infer<typeof ZIntegrationInput>;

export const ZIntegrationItem = z.object({
  name: z.string(),
  id: z.string(),
});
export type TIntegrationItem = z.infer<typeof ZIntegrationItem>;

import { z } from "zod";
import { ZIntegrationBase } from "./shared-types";

export const ZLlmProvider = z.enum(["azureOpenAI", "openAI"]);
export type TLlmProvider = z.infer<typeof ZLlmProvider>;

export const ZLlmAzureOpenAICredential = z.object({
  provider: z.literal("azureOpenAI"),
  apiKey: z.string().min(1),
  endpointUrl: z.string().url(),
  deploymentName: z.string().min(1),
  apiVersion: z.string().min(1).default("2024-06-01"),
});

export const ZLlmOpenAICredential = z.object({
  provider: z.literal("openAI"),
  apiKey: z.string().min(1),
  model: z.string().min(1),
});

export const ZLlmCredential = z.discriminatedUnion("provider", [
  ZLlmAzureOpenAICredential,
  ZLlmOpenAICredential,
]);
export type TLlmCredential = z.infer<typeof ZLlmCredential>;

export const ZIntegrationLlmConfig = z.object({
  key: ZLlmCredential,
  data: z.array(z.any()).default([]),
});
export type TIntegrationLlmConfig = z.infer<typeof ZIntegrationLlmConfig>;

export const ZIntegrationLlm = ZIntegrationBase.extend({
  type: z.literal("llm"),
  config: ZIntegrationLlmConfig,
});
export type TIntegrationLlm = z.infer<typeof ZIntegrationLlm>;

export const ZIntegrationLlmInput = z.object({
  type: z.literal("llm"),
  config: ZIntegrationLlmConfig,
});
export type TIntegrationLlmInput = z.infer<typeof ZIntegrationLlmInput>;

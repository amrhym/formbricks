import { z } from "zod";

export const ZGoogleAiCredential = z.object({
  apiKey: z.string().min(1),
});

export type TGoogleAiCredential = z.infer<typeof ZGoogleAiCredential>;

export const ZIntegrationGoogleAiConfig = z.object({
  key: ZGoogleAiCredential,
  data: z.array(z.any()).default([]),
});

export const ZIntegrationGoogleAi = z.object({
  id: z.string(),
  type: z.literal("googleAi"),
  environmentId: z.string(),
  config: ZIntegrationGoogleAiConfig,
});

export type TIntegrationGoogleAi = z.infer<typeof ZIntegrationGoogleAi>;

export const ZIntegrationGoogleAiInput = z.object({
  type: z.literal("googleAi"),
  config: ZIntegrationGoogleAiConfig,
});

export type TIntegrationGoogleAiInput = z.infer<typeof ZIntegrationGoogleAiInput>;

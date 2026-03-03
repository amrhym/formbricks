import { z } from "zod";
import { ZIntegrationBase } from "./shared-types";

export const ZIntegrationNovuCredential = z.object({
  apiKey: z.string(),
  apiUrl: z.string(),
});
export type TIntegrationNovuCredential = z.infer<typeof ZIntegrationNovuCredential>;

export const ZIntegrationNovuConfig = z.object({
  key: ZIntegrationNovuCredential,
  data: z.array(z.any()).default([]),
});
export type TIntegrationNovuConfig = z.infer<typeof ZIntegrationNovuConfig>;

export const ZIntegrationNovu = ZIntegrationBase.extend({
  type: z.literal("novu"),
  config: ZIntegrationNovuConfig,
});
export type TIntegrationNovu = z.infer<typeof ZIntegrationNovu>;

export const ZIntegrationNovuInput = z.object({
  type: z.literal("novu"),
  config: ZIntegrationNovuConfig,
});
export type TIntegrationNovuInput = z.infer<typeof ZIntegrationNovuInput>;

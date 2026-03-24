import { z } from "zod";
import { ZIntegrationBase } from "./shared-types";

export const ZHivecfmHubCredential = z.object({
  hubUrl: z.string().min(1),
  apiKey: z.string().min(1),
});
export type THivecfmHubCredential = z.infer<typeof ZHivecfmHubCredential>;

export const ZIntegrationHivecfmHubConfig = z.object({
  key: ZHivecfmHubCredential,
  data: z.array(z.any()).default([]),
});
export type TIntegrationHivecfmHubConfig = z.infer<typeof ZIntegrationHivecfmHubConfig>;

export const ZIntegrationHivecfmHub = ZIntegrationBase.extend({
  type: z.literal("hivecfmHub"),
  config: ZIntegrationHivecfmHubConfig,
});
export type TIntegrationHivecfmHub = z.infer<typeof ZIntegrationHivecfmHub>;

export const ZIntegrationHivecfmHubInput = z.object({
  type: z.literal("hivecfmHub"),
  config: ZIntegrationHivecfmHubConfig,
});
export type TIntegrationHivecfmHubInput = z.infer<typeof ZIntegrationHivecfmHubInput>;

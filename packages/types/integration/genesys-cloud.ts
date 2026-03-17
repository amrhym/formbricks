import { z } from "zod";
import { ZIntegrationBase } from "./shared-types";

export const ZGenesysCloudCredential = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  environmentUrl: z.string().url(),
});
export type TGenesysCloudCredential = z.infer<typeof ZGenesysCloudCredential>;

export const ZIntegrationGenesysCloudConfig = z.object({
  key: ZGenesysCloudCredential,
  data: z.array(z.any()).default([]),
});
export type TIntegrationGenesysCloudConfig = z.infer<typeof ZIntegrationGenesysCloudConfig>;

export const ZIntegrationGenesysCloud = ZIntegrationBase.extend({
  type: z.literal("genesysCloud"),
  config: ZIntegrationGenesysCloudConfig,
});
export type TIntegrationGenesysCloud = z.infer<typeof ZIntegrationGenesysCloud>;

export const ZIntegrationGenesysCloudInput = z.object({
  type: z.literal("genesysCloud"),
  config: ZIntegrationGenesysCloudConfig,
});
export type TIntegrationGenesysCloudInput = z.infer<typeof ZIntegrationGenesysCloudInput>;

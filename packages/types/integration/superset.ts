import { z } from "zod";
import { ZIntegrationBase } from "./shared-types";

export const ZSupersetCredential = z.object({
  publicUrl: z.string().url(),
  adminUsername: z.string().min(1),
  adminPassword: z.string().min(1),
  guestTokenJwtSecret: z.string().min(1),
  databaseConnectionString: z.string().min(1),
});
export type TSupersetCredential = z.infer<typeof ZSupersetCredential>;

export const ZIntegrationSupersetConfig = z.object({
  key: ZSupersetCredential,
  data: z.array(z.any()).default([]),
});
export type TIntegrationSupersetConfig = z.infer<typeof ZIntegrationSupersetConfig>;

export const ZIntegrationSuperset = ZIntegrationBase.extend({
  type: z.literal("superset"),
  config: ZIntegrationSupersetConfig,
});
export type TIntegrationSuperset = z.infer<typeof ZIntegrationSuperset>;

export const ZIntegrationSupersetInput = z.object({
  type: z.literal("superset"),
  config: ZIntegrationSupersetConfig,
});
export type TIntegrationSupersetInput = z.infer<typeof ZIntegrationSupersetInput>;

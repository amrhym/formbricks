import { z } from "zod";

export const ZOfflineLicensePayload = z.object({
  v: z.literal(1),
  iss: z.literal("hivelic"),
  iat: z.number().int(),
  jti: z.string().uuid(),
  orgId: z.string().min(1),
  orgName: z.string().min(1),
  licenseKey: z.string().min(1),
  maxCompletedResponses: z.number().int().positive(),
  maxUsers: z.number().int().positive(),
  addonAiInsights: z.boolean(),
  addonCampaignManagement: z.boolean(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
});

export type TOfflineLicensePayload = z.infer<typeof ZOfflineLicensePayload>;

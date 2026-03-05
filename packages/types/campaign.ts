import { z } from "zod";

export const ZCampaignStatus = z.enum(["draft", "scheduled", "sending", "sent", "failed"]);
export type TCampaignStatus = z.infer<typeof ZCampaignStatus>;

export const ZCampaignSendStatus = z.enum(["pending", "sent", "failed", "bounced"]);
export type TCampaignSendStatus = z.infer<typeof ZCampaignSendStatus>;

export const ZCampaignProviderType = z.enum(["email", "sms"]);
export type TCampaignProviderType = z.infer<typeof ZCampaignProviderType>;

export const ZCampaignCreateInput = z.object({
  name: z.string().min(1).max(200),
  surveyId: z.string().cuid(),
  segmentId: z.string().cuid(),
  providerType: ZCampaignProviderType.default("email"),
  scheduledAt: z.coerce.date().optional().nullable(),
});

export type TCampaignCreateInput = z.infer<typeof ZCampaignCreateInput>;

export const ZCampaign = z.object({
  id: z.string().cuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  name: z.string(),
  status: ZCampaignStatus,
  subject: z.string(),
  providerType: z.string(),
  novuWorkflowId: z.string().nullable(),
  scheduledAt: z.date().nullable(),
  surveyId: z.string(),
  segmentId: z.string().nullable(),
  environmentId: z.string(),
  sentAt: z.date().nullable(),
  sentCount: z.number(),
  failedCount: z.number(),
  totalCount: z.number(),
});

export type TCampaign = z.infer<typeof ZCampaign>;

export const ZCampaignWithRelations = ZCampaign.extend({
  survey: z.object({ id: z.string(), name: z.string() }),
  segment: z.object({ id: z.string(), title: z.string() }).nullable(),
});

export type TCampaignWithRelations = z.infer<typeof ZCampaignWithRelations>;

export const ZCampaignSend = z.object({
  id: z.string().cuid(),
  createdAt: z.date(),
  campaignId: z.string(),
  contactId: z.string(),
  recipient: z.string(),
  status: ZCampaignSendStatus,
  error: z.string().nullable(),
  sentAt: z.date().nullable(),
});

export type TCampaignSend = z.infer<typeof ZCampaignSend>;

// --- Analytics types ---

export const ZCampaignDetail = ZCampaignWithRelations.extend({
  sends: z.array(
    z.object({
      id: z.string(),
      contactId: z.string(),
      recipient: z.string(),
      status: ZCampaignSendStatus,
      error: z.string().nullable(),
      sentAt: z.date().nullable(),
    })
  ),
});

export type TCampaignDetail = z.infer<typeof ZCampaignDetail>;

export const ZCampaignNovuMessage = z.object({
  messageId: z.string(),
  email: z.string(),
  status: z.string(),
  provider: z.string(),
  seen: z.boolean(),
  read: z.boolean(),
  createdAt: z.string(),
});

export type TCampaignNovuMessage = z.infer<typeof ZCampaignNovuMessage>;

export const ZCampaignNovuStats = z.object({
  total: z.number(),
  sent: z.number(),
  failed: z.number(),
  delivered: z.number(),
  seen: z.number(),
  read: z.number(),
  messages: z.array(ZCampaignNovuMessage),
});

export type TCampaignNovuStats = z.infer<typeof ZCampaignNovuStats>;

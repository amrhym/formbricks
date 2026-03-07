import { z } from "zod";

export const ZProvisioningStep = z.enum([
  "INITIATED",
  "DB_CREATED",
  "SUPERSET_CONFIGURED",
  "N8N_CONFIGURED",
  "NOVU_CONFIGURED",
  "HUB_CONFIGURED",
  "COMPLETED",
  "FAILED",
]);
export type TProvisioningStep = z.infer<typeof ZProvisioningStep>;

export const ZProvisioningStatus = z.enum(["PENDING", "COMPLETED", "FAILED", "COMPENSATED"]);
export type TProvisioningStatus = z.infer<typeof ZProvisioningStatus>;

export const ZTenantQuota = z.object({
  id: z.string().cuid2(),
  organizationId: z.string().cuid2(),
  maxSurveys: z.number().int().positive().default(100),
  maxResponsesPerMonth: z.number().int().positive().default(10000),
  maxStorageMB: z.number().int().positive().default(5120),
  maxApiCallsPerDay: z.number().int().positive().default(50000),
  maxContacts: z.number().int().positive().default(50000),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type TTenantQuota = z.infer<typeof ZTenantQuota>;

export const ZTenantQuotaUpdate = z.object({
  maxSurveys: z.number().int().positive().optional(),
  maxResponsesPerMonth: z.number().int().positive().optional(),
  maxStorageMB: z.number().int().positive().optional(),
  maxApiCallsPerDay: z.number().int().positive().optional(),
  maxContacts: z.number().int().positive().optional(),
});
export type TTenantQuotaUpdate = z.infer<typeof ZTenantQuotaUpdate>;

export const ZBrandingUpdate = z.object({
  logoUrl: z.string().url().nullable().optional(),
  faviconUrl: z.string().url().nullable().optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  customCss: z.string().nullable().optional(),
  emailHeaderHtml: z.string().nullable().optional(),
});
export type TBrandingUpdate = z.infer<typeof ZBrandingUpdate>;

export const ZOrganizationBrandingSchema = z.object({
  id: z.string().cuid2(),
  organizationId: z.string().cuid2(),
  logoUrl: z.string().nullable(),
  faviconUrl: z.string().nullable(),
  primaryColor: z.string(),
  accentColor: z.string(),
  customCss: z.string().nullable(),
  emailHeaderHtml: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type TOrganizationBrandingSchema = z.infer<typeof ZOrganizationBrandingSchema>;

export const ZTenantLicense = z.object({
  id: z.string().cuid2(),
  organizationId: z.string().cuid2(),
  licenseKey: z.string(),
  maxCompletedResponses: z.number().int().positive(),
  maxUsers: z.number().int().positive(),
  addonAiInsights: z.boolean(),
  addonCampaignManagement: z.boolean(),
  validFrom: z.date(),
  validUntil: z.date(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type TTenantLicense = z.infer<typeof ZTenantLicense>;

export const ZTenantLicenseCreate = z.object({
  maxCompletedResponses: z.number().int().positive().default(10000),
  maxUsers: z.number().int().positive().default(10),
  addonAiInsights: z.boolean().default(false),
  addonCampaignManagement: z.boolean().default(false),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date(),
});
export type TTenantLicenseCreate = z.infer<typeof ZTenantLicenseCreate>;

export const ZTenantLicenseUpdate = z.object({
  maxCompletedResponses: z.number().int().positive().optional(),
  maxUsers: z.number().int().positive().optional(),
  addonAiInsights: z.boolean().optional(),
  addonCampaignManagement: z.boolean().optional(),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
});
export type TTenantLicenseUpdate = z.infer<typeof ZTenantLicenseUpdate>;

export const ZLicenseActivateInput = z.object({
  licenseKey: z.string().min(1),
});
export type TLicenseActivateInput = z.infer<typeof ZLicenseActivateInput>;

export const ZTenantCreateInput = z.object({
  name: z.string().trim().min(1, { message: "Tenant name is required" }),
  adminEmail: z.string().email({ message: "Valid admin email is required" }),
  plan: z.enum(["free", "startup", "enterprise", "custom"]).default("free"),
  branding: ZBrandingUpdate.optional(),
  quotas: ZTenantQuotaUpdate.optional(),
  license: ZTenantLicenseCreate.optional(),
});
export type TTenantCreateInput = z.infer<typeof ZTenantCreateInput>;

export const ZTenantUpdateInput = z.object({
  name: z.string().trim().min(1).optional(),
  isActive: z.boolean().optional(),
});
export type TTenantUpdateInput = z.infer<typeof ZTenantUpdateInput>;

export const ZGuestToken = z.object({
  guestToken: z.string(),
  dashboardId: z.string(),
  expiresAt: z.string().datetime(),
});
export type TGuestToken = z.infer<typeof ZGuestToken>;

export const ZProvisioningLog = z.object({
  id: z.string().cuid2(),
  organizationId: z.string().cuid2(),
  step: ZProvisioningStep,
  status: ZProvisioningStatus,
  details: z.record(z.any()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type TProvisioningLog = z.infer<typeof ZProvisioningLog>;

import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";
import { ZId } from "@hivecfm/types/common";
import { DatabaseError, ResourceNotFoundError } from "@hivecfm/types/errors";
import {
  TBrandingUpdate,
  TOrganizationBrandingSchema,
  TTenantCreateInput,
  TTenantQuota,
  TTenantQuotaUpdate,
  ZBrandingUpdate,
  ZTenantCreateInput,
  ZTenantQuotaUpdate,
} from "@hivecfm/types/tenant";
import { validateInputs } from "@/lib/utils/validate";

const tenantQuotaSelect: Prisma.TenantQuotaSelect = {
  id: true,
  organizationId: true,
  maxSurveys: true,
  maxResponsesPerMonth: true,
  maxStorageMB: true,
  maxApiCallsPerDay: true,
  maxContacts: true,
  createdAt: true,
  updatedAt: true,
};

const brandingSelect: Prisma.OrganizationBrandingSelect = {
  id: true,
  organizationId: true,
  logoUrl: true,
  faviconUrl: true,
  primaryColor: true,
  accentColor: true,
  customCss: true,
  emailHeaderHtml: true,
  createdAt: true,
  updatedAt: true,
};

export const createTenant = async (input: TTenantCreateInput) => {
  try {
    validateInputs([input, ZTenantCreateInput]);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create organization
      const organization = await tx.organization.create({
        data: {
          name: input.name,
          billing: {
            plan: input.plan,
            limits: { projects: 3, monthly: { responses: 1500, miu: 2000 } },
            stripeCustomerId: null,
            periodStart: new Date(),
            period: "monthly",
          },
        },
        select: { id: true, name: true, createdAt: true, updatedAt: true },
      });

      // 2. Create default quota
      const quota = await tx.tenantQuota.create({
        data: {
          organizationId: organization.id,
          ...(input.quotas || {}),
        },
        select: tenantQuotaSelect,
      });

      // 3. Create branding if provided
      if (input.branding) {
        await tx.organizationBranding.create({
          data: {
            organizationId: organization.id,
            ...input.branding,
          },
        });
      }

      // 4. Create default project + environments
      const project = await tx.project.create({
        data: {
          name: "Default Project",
          organizationId: organization.id,
          environments: {
            create: [
              { type: "production", appSetupCompleted: false },
              { type: "development", appSetupCompleted: false },
            ],
          },
        },
        select: {
          id: true,
          environments: {
            select: { id: true, type: true },
          },
        },
      });

      return { organization, quota, project };
    });

    logger.info({ tenantId: result.organization.id }, "Tenant created successfully");
    return result;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError(error.message);
    }
    throw error;
  }
};

export const getTenant = async (organizationId: string) => {
  validateInputs([organizationId, ZId]);

  try {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        name: true,
        billing: true,
        isAIEnabled: true,
        whitelabel: true,
        tenantQuota: { select: tenantQuotaSelect },
        organizationBranding: { select: brandingSelect },
        tenantLicense: {
          select: {
            id: true,
            organizationId: true,
            licenseKey: true,
            maxCompletedResponses: true,
            maxUsers: true,
            addonAiInsights: true,
            addonCampaignManagement: true,
            validFrom: true,
            validUntil: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!organization) {
      throw new ResourceNotFoundError("Tenant", organizationId);
    }

    return organization;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError(error.message);
    }
    throw error;
  }
};

export const listTenants = async (page?: number, pageSize: number = 20) => {
  try {
    const tenants = await prisma.organization.findMany({
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        name: true,
        billing: true,
      },
      take: pageSize,
      skip: page ? pageSize * (page - 1) : undefined,
      orderBy: { createdAt: "desc" },
    });
    return tenants;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError(error.message);
    }
    throw error;
  }
};

export const getTenantQuota = async (organizationId: string): Promise<TTenantQuota | null> => {
  validateInputs([organizationId, ZId]);

  try {
    return await prisma.tenantQuota.findUnique({
      where: { organizationId },
      select: tenantQuotaSelect,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError(error.message);
    }
    throw error;
  }
};

export const updateTenantQuota = async (
  organizationId: string,
  data: TTenantQuotaUpdate
): Promise<TTenantQuota> => {
  validateInputs([organizationId, ZId], [data, ZTenantQuotaUpdate]);

  try {
    return await prisma.tenantQuota.upsert({
      where: { organizationId },
      update: data,
      create: { organizationId, ...data },
      select: tenantQuotaSelect,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError(error.message);
    }
    throw error;
  }
};

export const getTenantBranding = async (
  organizationId: string
): Promise<TOrganizationBrandingSchema | null> => {
  validateInputs([organizationId, ZId]);

  try {
    return await prisma.organizationBranding.findUnique({
      where: { organizationId },
      select: brandingSelect,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError(error.message);
    }
    throw error;
  }
};

export const updateTenantBranding = async (
  organizationId: string,
  data: TBrandingUpdate
): Promise<TOrganizationBrandingSchema> => {
  validateInputs([organizationId, ZId], [data, ZBrandingUpdate]);

  try {
    return await prisma.organizationBranding.upsert({
      where: { organizationId },
      update: data,
      create: { organizationId, ...data },
      select: brandingSelect,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError(error.message);
    }
    throw error;
  }
};

export const deactivateTenant = async (organizationId: string) => {
  validateInputs([organizationId, ZId]);

  try {
    // Revoke n8n credentials and API key (best-effort, don't fail deactivation)
    try {
      const { revokeTenantCredentials, removeTenantWorkflows } = await import("@/lib/n8n/service");
      await removeTenantWorkflows(organizationId);
      await revokeTenantCredentials(organizationId);
    } catch (err) {
      logger.error(
        { tenantId: organizationId, error: err },
        "Failed to revoke n8n credentials during deactivation (continuing)"
      );
    }

    // Superset RLS cleanup
    try {
      const { deleteRLSRule } = await import("@/lib/superset/service");
      await deleteRLSRule(organizationId);
    } catch (err) {
      logger.error(
        { tenantId: organizationId, error: err },
        "Failed to delete Superset RLS during deactivation"
      );
    }

    // Novu cleanup
    try {
      const { deprovisionNovuForTenant } = await import("@/lib/novu/tenant-provisioning");
      const envs = await prisma.environment.findMany({
        where: { project: { organizationId } },
        select: { id: true },
      });
      await deprovisionNovuForTenant(
        organizationId,
        envs.map((e) => e.id)
      );
    } catch (err) {
      logger.error(
        { tenantId: organizationId, error: err },
        "Failed to deprovision Novu during deactivation"
      );
    }

    // Hub cleanup
    try {
      const { deregisterHubTenant } = await import("@/lib/hivecfm-hub/service");
      await deregisterHubTenant(organizationId);
    } catch (err) {
      logger.error({ tenantId: organizationId, error: err }, "Failed to deregister Hub during deactivation");
    }

    // Soft-deactivate by updating billing plan
    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        billing: {
          plan: "free",
          limits: { projects: 0, monthly: { responses: 0, miu: 0 } },
          stripeCustomerId: null,
          periodStart: new Date(),
          period: "monthly",
        },
      },
      select: { id: true, name: true },
    });

    logger.info({ tenantId: organizationId }, "Tenant deactivated");
    return organization;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError(error.message);
    }
    throw error;
  }
};

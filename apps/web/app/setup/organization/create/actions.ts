"use server";

import { z } from "zod";
import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";
import { OperationNotAllowedError } from "@hivecfm/types/errors";
import { hashSecret, hashSha256, parseApiKeyV2 } from "@/lib/crypto";
import { gethasNoOrganizations } from "@/lib/instance/service";
import { createMembership } from "@/lib/membership/service";
import { createOrganization } from "@/lib/organization/service";
import { createLicense } from "@/lib/tenant/license";
import { authenticatedActionClient } from "@/lib/utils/action-client";
import { AuthenticatedActionClientCtx } from "@/lib/utils/action-client/types/context";
import { withAuditLogging } from "@/modules/ee/audit-logs/lib/handler";
import { getIsMultiOrgEnabled } from "@/modules/ee/license-check/lib/utils";

const ZCreateOrganizationAction = z.object({
  organizationName: z.string(),
});

export const createOrganizationAction = authenticatedActionClient.schema(ZCreateOrganizationAction).action(
  withAuditLogging(
    "created",
    "organization",
    async ({ ctx, parsedInput }: { ctx: AuthenticatedActionClientCtx; parsedInput: Record<string, any> }) => {
      const hasNoOrganizations = await gethasNoOrganizations();
      const isMultiOrgEnabled = await getIsMultiOrgEnabled();

      if (!hasNoOrganizations && !isMultiOrgEnabled) {
        throw new OperationNotAllowedError("This action can only be performed on a fresh instance.");
      }

      const newOrganization = await createOrganization({
        name: parsedInput.organizationName,
      });

      // Auto-create a default tenant license so membership creation succeeds
      const validUntil = new Date();
      validUntil.setFullYear(validUntil.getFullYear() + 10);
      await createLicense(newOrganization.id, {
        maxCompletedResponses: 1000000,
        maxUsers: 1000,
        addonAiInsights: true,
        addonCampaignManagement: true,
        validUntil,
      });

      await createMembership(newOrganization.id, ctx.user.id, {
        role: "owner",
        accepted: true,
      });

      // Create a management API key for service-to-service access (e.g. license portal)
      const managementKey = process.env.MANAGEMENT_API_KEY;
      if (managementKey) {
        try {
          const parsed = parseApiKeyV2(managementKey);
          if (parsed) {
            const lookupHash = hashSha256(parsed.secret);
            const hashedKey = await hashSecret(parsed.secret, 12);
            await prisma.apiKey.create({
              data: {
                label: "Management API Key",
                hashedKey,
                lookupHash,
                createdBy: ctx.user.id,
                organizationId: newOrganization.id,
                organizationAccess: { accessControl: "full" },
              },
            });
            logger.info({ organizationId: newOrganization.id }, "Management API key created");
          }
        } catch (error) {
          logger.error({ error }, "Failed to create management API key (non-blocking)");
        }
      }

      ctx.auditLoggingCtx.organizationId = newOrganization.id;
      ctx.auditLoggingCtx.newObject = newOrganization;

      return newOrganization;
    }
  )
);

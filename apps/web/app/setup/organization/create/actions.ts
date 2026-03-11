"use server";

import { z } from "zod";
import { OperationNotAllowedError } from "@hivecfm/types/errors";
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

      ctx.auditLoggingCtx.organizationId = newOrganization.id;
      ctx.auditLoggingCtx.newObject = newOrganization;

      return newOrganization;
    }
  )
);

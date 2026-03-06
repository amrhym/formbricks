"use server";

import { z } from "zod";
import { TChannelType } from "@hivecfm/types/channel";
import { OperationNotAllowedError, ResourceNotFoundError } from "@hivecfm/types/errors";
import { ZSurveyCreateInput } from "@hivecfm/types/surveys/types";
import { createChannel, getChannelsByEnvironmentId } from "@/lib/channel/service";
import { authenticatedActionClient } from "@/lib/utils/action-client";
import { checkAuthorizationUpdated } from "@/lib/utils/action-client/action-client-middleware";
import { AuthenticatedActionClientCtx } from "@/lib/utils/action-client/types/context";
import { getOrganizationIdFromEnvironmentId, getProjectIdFromEnvironmentId } from "@/lib/utils/helper";
import { withAuditLogging } from "@/modules/ee/audit-logs/lib/handler";
import { checkMultiLanguagePermission } from "@/modules/ee/multi-language-surveys/lib/actions";
import { createSurvey } from "@/modules/survey/components/template-list/lib/survey";
import { getSurveyFollowUpsPermission } from "@/modules/survey/follow-ups/lib/utils";
import { checkSpamProtectionPermission } from "@/modules/survey/lib/permission";
import { getOrganizationBilling } from "@/modules/survey/lib/survey";

const ZCreateSurveyAction = z.object({
  environmentId: z.string().cuid2(),
  surveyBody: ZSurveyCreateInput,
});

/**
 * Checks if survey follow-ups are enabled for the given organization.
 *
 * @param { string } organizationId  The ID of the organization to check.
 * @returns { Promise<void> }  A promise that resolves if the permission is granted.
 * @throws { ResourceNotFoundError }  If the organization is not found.
 * @throws { OperationNotAllowedError }  If survey follow-ups are not enabled for the organization.
 */
const checkSurveyFollowUpsPermission = async (organizationId: string): Promise<void> => {
  const organizationBilling = await getOrganizationBilling(organizationId);
  if (!organizationBilling) {
    throw new ResourceNotFoundError("Organization not found", organizationId);
  }

  const isSurveyFollowUpsEnabled = await getSurveyFollowUpsPermission(organizationBilling.plan);
  if (!isSurveyFollowUpsEnabled) {
    throw new OperationNotAllowedError("Survey follow ups are not enabled for this organization");
  }
};

export const createSurveyAction = authenticatedActionClient.schema(ZCreateSurveyAction).action(
  withAuditLogging(
    "created",
    "survey",
    async ({ ctx, parsedInput }: { ctx: AuthenticatedActionClientCtx; parsedInput: Record<string, any> }) => {
      const organizationId = await getOrganizationIdFromEnvironmentId(parsedInput.environmentId);
      await checkAuthorizationUpdated({
        userId: ctx.user.id,
        organizationId,
        access: [
          {
            type: "organization",
            roles: ["owner", "manager"],
          },
          {
            type: "projectTeam",
            minPermission: "readWrite",
            projectId: await getProjectIdFromEnvironmentId(parsedInput.environmentId),
          },
        ],
      });

      if (parsedInput.surveyBody.recaptcha?.enabled) {
        await checkSpamProtectionPermission(organizationId);
      }

      if (parsedInput.surveyBody.followUps?.length) {
        await checkSurveyFollowUpsPermission(organizationId);
      }

      if (parsedInput.surveyBody.languages?.length) {
        await checkMultiLanguagePermission(organizationId);
      }

      const result = await createSurvey(parsedInput.environmentId, parsedInput.surveyBody);
      ctx.auditLoggingCtx.organizationId = organizationId;
      ctx.auditLoggingCtx.surveyId = result.id;
      ctx.auditLoggingCtx.newObject = result;
      return result;
    }
  )
);

const ZFindOrCreateChannelAction = z.object({
  environmentId: z.string().cuid2(),
  channelType: z.enum(["voice", "whatsapp", "sms"]),
});

export const findOrCreateChannelAction = authenticatedActionClient
  .schema(ZFindOrCreateChannelAction)
  .action(
    async ({
      ctx,
      parsedInput,
    }: {
      ctx: AuthenticatedActionClientCtx;
      parsedInput: { environmentId: string; channelType: TChannelType };
    }) => {
      const organizationId = await getOrganizationIdFromEnvironmentId(parsedInput.environmentId);
      await checkAuthorizationUpdated({
        userId: ctx.user.id,
        organizationId,
        access: [
          {
            type: "organization",
            roles: ["owner", "manager"],
          },
          {
            type: "projectTeam",
            minPermission: "readWrite",
            projectId: await getProjectIdFromEnvironmentId(parsedInput.environmentId),
          },
        ],
      });

      const channels = await getChannelsByEnvironmentId(parsedInput.environmentId);
      const existing = channels.find((c) => c.type === parsedInput.channelType);
      if (existing) {
        return existing.id;
      }

      const channelNames: Record<string, string> = {
        voice: "IVR / Voice",
        whatsapp: "WhatsApp",
        sms: "SMS",
      };

      const channel = await createChannel(parsedInput.environmentId, {
        name: channelNames[parsedInput.channelType] || parsedInput.channelType,
        type: parsedInput.channelType,
      });
      return channel.id;
    }
  );

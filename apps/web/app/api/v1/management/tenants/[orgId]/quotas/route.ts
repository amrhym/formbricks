import { NextRequest } from "next/server";
import { logger } from "@hivecfm/logger";
import { DatabaseError } from "@hivecfm/types/errors";
import { ZTenantQuotaUpdate } from "@hivecfm/types/tenant";
import { responses } from "@/app/lib/api/response";
import { transformErrorToDetails } from "@/app/lib/api/validator";
import { TApiAuditLog, TApiKeyAuthentication, withV1ApiWrapper } from "@/app/lib/api/with-api-logging";
import { getQuotaUsage } from "@/lib/tenant/quota-enforcement";
import { getTenantQuota, updateTenantQuota } from "@/lib/tenant/service";

export const GET = withV1ApiWrapper({
  handler: async ({
    authentication,
    props,
  }: {
    authentication: NonNullable<TApiKeyAuthentication>;
    props: { params: Promise<{ orgId: string }> };
  }) => {
    try {
      const { orgId } = await props.params;
      const quota = await getTenantQuota(orgId);

      if (!quota) {
        return { response: responses.notFoundResponse("TenantQuota", orgId) };
      }

      const usage = await getQuotaUsage(orgId);

      return {
        response: responses.successResponse({
          ...quota,
          usage,
        }),
      };
    } catch (error) {
      if (error instanceof DatabaseError) {
        return { response: responses.badRequestResponse(error.message) };
      }
      throw error;
    }
  },
});

export const PATCH = withV1ApiWrapper({
  handler: async ({
    req,
    auditLog,
    authentication,
    props,
  }: {
    req: NextRequest;
    auditLog: TApiAuditLog;
    authentication: NonNullable<TApiKeyAuthentication>;
    props: { params: Promise<{ orgId: string }> };
  }) => {
    try {
      const { orgId } = await props.params;

      let body;
      try {
        body = await req.json();
      } catch (error) {
        logger.error({ error, url: req.url }, "Error parsing JSON input");
        return {
          response: responses.badRequestResponse("Malformed JSON input, please check your request body"),
        };
      }

      const inputValidation = ZTenantQuotaUpdate.safeParse(body);
      if (!inputValidation.success) {
        return {
          response: responses.badRequestResponse(
            "Fields are missing or incorrectly formatted",
            transformErrorToDetails(inputValidation.error),
            true
          ),
        };
      }

      const updated = await updateTenantQuota(orgId, inputValidation.data);
      auditLog.targetId = orgId;
      auditLog.newObject = updated;

      return { response: responses.successResponse(updated) };
    } catch (error) {
      if (error instanceof DatabaseError) {
        return { response: responses.badRequestResponse(error.message) };
      }
      throw error;
    }
  },
  action: "updated",
  targetType: "tenantQuota",
});

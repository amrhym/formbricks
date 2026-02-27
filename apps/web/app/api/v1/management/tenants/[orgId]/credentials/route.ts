import { logger } from "@hivecfm/logger";
import { DatabaseError, ResourceNotFoundError } from "@hivecfm/types/errors";
import { responses } from "@/app/lib/api/response";
import { TApiAuditLog, TApiKeyAuthentication, withV1ApiWrapper } from "@/app/lib/api/with-api-logging";

export const GET = withV1ApiWrapper({
  handler: async ({
    props,
  }: {
    authentication: NonNullable<TApiKeyAuthentication>;
    props: { params: Promise<{ orgId: string }> };
  }) => {
    try {
      const { orgId } = await props.params;

      const { getTenantN8nStatus } = await import("@/lib/n8n/service");
      const status = await getTenantN8nStatus(orgId);

      return { response: responses.successResponse(status) };
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        return { response: responses.notFoundResponse("Tenant", (error as any).resourceId) };
      }
      if (error instanceof DatabaseError) {
        return { response: responses.badRequestResponse(error.message) };
      }
      throw error;
    }
  },
});

export const POST = withV1ApiWrapper({
  handler: async ({
    auditLog,
    props,
  }: {
    auditLog: TApiAuditLog;
    authentication: NonNullable<TApiKeyAuthentication>;
    props: { params: Promise<{ orgId: string }> };
  }) => {
    try {
      const { orgId } = await props.params;

      const { rotateTenantCredentials } = await import("@/lib/n8n/service");
      const result = await rotateTenantCredentials(orgId);

      auditLog.targetId = orgId;
      auditLog.newObject = result;

      logger.info({ tenantId: orgId }, "Tenant n8n credentials rotated via API");

      return { response: responses.successResponse({ rotated: true, apiKeyId: result.apiKeyId }) };
    } catch (error) {
      if (error instanceof DatabaseError) {
        return { response: responses.badRequestResponse(error.message) };
      }
      throw error;
    }
  },
  action: "updated",
  targetType: "apiKey",
});

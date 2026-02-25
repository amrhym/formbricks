import { DatabaseError } from "@hivecfm/types/errors";
import { responses } from "@/app/lib/api/response";
import { TApiAuditLog, TApiKeyAuthentication, withV1ApiWrapper } from "@/app/lib/api/with-api-logging";

export const DELETE = withV1ApiWrapper({
  handler: async ({
    auditLog,
    props,
  }: {
    auditLog: TApiAuditLog;
    authentication: NonNullable<TApiKeyAuthentication>;
    props: { params: Promise<{ orgId: string; workflowId: string }> };
  }) => {
    try {
      const { orgId, workflowId } = await props.params;

      // Remove workflow via n8n client
      const { removeWorkflowForTenant } = await import("@/lib/n8n/service");
      await removeWorkflowForTenant(orgId, workflowId);

      auditLog.targetId = workflowId;

      return { response: responses.successResponse({ deleted: true, workflowId }) };
    } catch (error) {
      if (error instanceof DatabaseError) {
        return { response: responses.badRequestResponse(error.message) };
      }
      throw error;
    }
  },
  action: "deleted",
  targetType: "workflow",
});

import { NextRequest } from "next/server";
import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";
import { DatabaseError } from "@hivecfm/types/errors";
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

      // List workflow templates available to this tenant
      const templates = await prisma.workflowTemplate.findMany({
        select: {
          id: true,
          name: true,
          eventType: true,
          description: true,
          isDefault: true,
          createdAt: true,
        },
        orderBy: { name: "asc" },
      });

      return { response: responses.successResponse(templates) };
    } catch (error) {
      if (error instanceof DatabaseError) {
        return { response: responses.badRequestResponse(error.message) };
      }
      throw error;
    }
  },
});

export const POST = withV1ApiWrapper({
  handler: async ({
    req,
    auditLog,
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

      const { templateId } = body;
      if (!templateId) {
        return {
          response: responses.badRequestResponse("templateId is required"),
        };
      }

      // Look up template
      const template = await prisma.workflowTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        return { response: responses.notFoundResponse("WorkflowTemplate", templateId) };
      }

      // Deploy via n8n client (lazy import to avoid circular deps)
      const { deployWorkflowForTenant } = await import("@/lib/n8n/service");
      const result = await deployWorkflowForTenant(orgId, template);

      auditLog.targetId = template.id;
      auditLog.newObject = result;

      return { response: responses.successResponse(result) };
    } catch (error) {
      if (error instanceof DatabaseError) {
        return { response: responses.badRequestResponse(error.message) };
      }
      throw error;
    }
  },
  action: "created",
  targetType: "workflow",
});

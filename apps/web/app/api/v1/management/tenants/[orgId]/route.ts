import { NextRequest } from "next/server";
import { logger } from "@hivecfm/logger";
import { DatabaseError, ResourceNotFoundError } from "@hivecfm/types/errors";
import { ZTenantUpdateInput } from "@hivecfm/types/tenant";
import { responses } from "@/app/lib/api/response";
import { transformErrorToDetails } from "@/app/lib/api/validator";
import { TApiAuditLog, TApiKeyAuthentication, withV1ApiWrapper } from "@/app/lib/api/with-api-logging";
import { deactivateTenant, getTenant } from "@/lib/tenant/service";

export const GET = withV1ApiWrapper({
  handler: async ({
    props,
  }: {
    authentication: NonNullable<TApiKeyAuthentication>;
    props: { params: Promise<{ orgId: string }> };
  }) => {
    try {
      const { orgId } = await props.params;
      const tenant = await getTenant(orgId);
      return { response: responses.successResponse(tenant) };
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

export const PATCH = withV1ApiWrapper({
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

      const inputValidation = ZTenantUpdateInput.safeParse(body);
      if (!inputValidation.success) {
        return {
          response: responses.badRequestResponse(
            "Fields are missing or incorrectly formatted",
            transformErrorToDetails(inputValidation.error),
            true
          ),
        };
      }

      // For now, update just the name via organization update
      const { prisma } = await import("@hivecfm/database");
      const updated = await prisma.organization.update({
        where: { id: orgId },
        data: { name: inputValidation.data.name },
        select: { id: true, name: true, updatedAt: true },
      });

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
  targetType: "tenant",
});

export const DELETE = withV1ApiWrapper({
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
      const result = await deactivateTenant(orgId);
      auditLog.targetId = orgId;
      return { response: responses.successResponse(result) };
    } catch (error) {
      if (error instanceof DatabaseError) {
        return { response: responses.badRequestResponse(error.message) };
      }
      throw error;
    }
  },
  action: "deleted",
  targetType: "tenant",
});

import { NextRequest } from "next/server";
import { logger } from "@hivecfm/logger";
import { DatabaseError } from "@hivecfm/types/errors";
import { ZTenantCreateInput } from "@hivecfm/types/tenant";
import { responses } from "@/app/lib/api/response";
import { transformErrorToDetails } from "@/app/lib/api/validator";
import { TApiAuditLog, TApiKeyAuthentication, withV1ApiWrapper } from "@/app/lib/api/with-api-logging";
import { createTenant, listTenants } from "@/lib/tenant/service";

export const GET = withV1ApiWrapper({
  handler: async (_args: { authentication: NonNullable<TApiKeyAuthentication> }) => {
    try {
      const tenants = await listTenants();
      return {
        response: responses.successResponse(tenants),
      };
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
  }: {
    req: NextRequest;
    auditLog: TApiAuditLog;
    authentication: NonNullable<TApiKeyAuthentication>;
  }) => {
    try {
      let body;
      try {
        body = await req.json();
      } catch (error) {
        logger.error({ error, url: req.url }, "Error parsing JSON input");
        return {
          response: responses.badRequestResponse("Malformed JSON input, please check your request body"),
        };
      }

      const inputValidation = ZTenantCreateInput.safeParse(body);
      if (!inputValidation.success) {
        return {
          response: responses.badRequestResponse(
            "Fields are missing or incorrectly formatted",
            transformErrorToDetails(inputValidation.error),
            true
          ),
        };
      }

      const result = await createTenant(inputValidation.data);
      auditLog.targetId = result.organization.id;
      auditLog.newObject = result;

      return {
        response: responses.successResponse(result),
      };
    } catch (error) {
      if (error instanceof DatabaseError) {
        return { response: responses.badRequestResponse(error.message) };
      }
      throw error;
    }
  },
  action: "created",
  targetType: "tenant",
});

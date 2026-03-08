import { NextRequest } from "next/server";
import { LicenseTokenError } from "@hivecfm/license-crypto";
import { logger } from "@hivecfm/logger";
import { DatabaseError, ResourceNotFoundError } from "@hivecfm/types/errors";
import { ZOfflineLicenseActivateInput } from "@hivecfm/types/tenant";
import { responses } from "@/app/lib/api/response";
import { transformErrorToDetails } from "@/app/lib/api/validator";
import { TApiAuditLog, TApiKeyAuthentication, withV1ApiWrapper } from "@/app/lib/api/with-api-logging";
import { activateOfflineLicense } from "@/lib/tenant/offline-license";

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

      const inputValidation = ZOfflineLicenseActivateInput.safeParse(body);
      if (!inputValidation.success) {
        return {
          response: responses.badRequestResponse(
            "Fields are missing or incorrectly formatted",
            transformErrorToDetails(inputValidation.error),
            true
          ),
        };
      }

      const license = await activateOfflineLicense(inputValidation.data.token);

      auditLog.targetId = license.organizationId;
      auditLog.newObject = { licenseKey: license.licenseKey, method: "offline" };

      return {
        response: responses.successResponse(license),
      };
    } catch (error) {
      if (error instanceof LicenseTokenError) {
        return {
          response: responses.badRequestResponse(`License token error (${error.code}): ${error.message}`),
        };
      }
      if (error instanceof ResourceNotFoundError) {
        return { response: responses.notFoundResponse(error.resourceType, error.resourceId) };
      }
      if (error instanceof DatabaseError) {
        return { response: responses.badRequestResponse(error.message) };
      }
      throw error;
    }
  },
  action: "created",
  targetType: "tenantLicense",
});

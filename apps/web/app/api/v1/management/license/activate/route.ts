import { NextRequest } from "next/server";
import { logger } from "@hivecfm/logger";
import { DatabaseError, ResourceNotFoundError } from "@hivecfm/types/errors";
import { ZLicenseActivateInput } from "@hivecfm/types/tenant";
import { responses } from "@/app/lib/api/response";
import { transformErrorToDetails } from "@/app/lib/api/validator";
import { TApiAuditLog, TApiKeyAuthentication, withV1ApiWrapper } from "@/app/lib/api/with-api-logging";
import { getLicenseByKey, isLicenseValid } from "@/lib/tenant/license";

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

      const inputValidation = ZLicenseActivateInput.safeParse(body);
      if (!inputValidation.success) {
        return {
          response: responses.badRequestResponse(
            "Fields are missing or incorrectly formatted",
            transformErrorToDetails(inputValidation.error),
            true
          ),
        };
      }

      const license = await getLicenseByKey(inputValidation.data.licenseKey);
      if (!license) {
        return { response: responses.notFoundResponse("TenantLicense", inputValidation.data.licenseKey) };
      }

      const valid = isLicenseValid(license);

      auditLog.targetId = license.organizationId;
      auditLog.newObject = { licenseKey: license.licenseKey, valid };

      return {
        response: responses.successResponse({
          ...license,
          valid,
        }),
      };
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        return { response: responses.notFoundResponse("TenantLicense", "key") };
      }
      if (error instanceof DatabaseError) {
        return { response: responses.badRequestResponse(error.message) };
      }
      throw error;
    }
  },
  action: "accessed",
  targetType: "tenantLicense",
});

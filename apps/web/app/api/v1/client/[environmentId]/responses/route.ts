import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { UAParser } from "ua-parser-js";
import { logger } from "@hivecfm/logger";
import { ZEnvironmentId } from "@hivecfm/types/environment";
import { InvalidInputError } from "@hivecfm/types/errors";
import { TResponseWithQuotaFull } from "@hivecfm/types/quota";
import { TResponseInput, ZResponseInput } from "@hivecfm/types/responses";
import { responses } from "@/app/lib/api/response";
import { transformErrorToDetails } from "@/app/lib/api/validator";
import { withV1ApiWrapper } from "@/app/lib/api/with-api-logging";
import { sendToPipeline } from "@/app/lib/pipelines";
import { getOrganizationByEnvironmentId } from "@/lib/organization/service";
import { getSurvey } from "@/lib/survey/service";
import { checkLicenseValid } from "@/lib/tenant/license-enforcement";
import { checkCompletedResponseQuota } from "@/lib/tenant/quota-enforcement";
import { getClientIpFromHeaders } from "@/lib/utils/client-ip";
import { getIsContactsEnabled } from "@/modules/ee/license-check/lib/utils";
import { createQuotaFullObject } from "@/modules/ee/quotas/lib/helpers";
import { validateFileUploads } from "@/modules/storage/utils";
import { createResponseWithQuotaEvaluation } from "./lib/response";

interface Context {
  params: Promise<{
    environmentId: string;
  }>;
}

export const OPTIONS = async (): Promise<Response> => {
  return responses.successResponse(
    {},
    true,
    // Cache CORS preflight responses for 1 hour (conservative approach)
    // Balances performance gains with flexibility for CORS policy changes
    "public, s-maxage=3600, max-age=3600"
  );
};

export const POST = withV1ApiWrapper({
  handler: async ({ req, props }: { req: NextRequest; props: Context }) => {
    const params = await props.params;
    const requestHeaders = await headers();
    let responseInput;
    try {
      responseInput = await req.json();
    } catch (error) {
      return {
        response: responses.badRequestResponse(
          "Invalid JSON in request body",
          { error: error.message },
          true
        ),
      };
    }

    const { environmentId } = params;
    const environmentIdValidation = ZEnvironmentId.safeParse(environmentId);
    const responseInputValidation = ZResponseInput.safeParse({ ...responseInput, environmentId });

    if (!environmentIdValidation.success) {
      return {
        response: responses.badRequestResponse(
          "Fields are missing or incorrectly formatted",
          transformErrorToDetails(environmentIdValidation.error),
          true
        ),
      };
    }

    if (!responseInputValidation.success) {
      return {
        response: responses.badRequestResponse(
          "Fields are missing or incorrectly formatted",
          transformErrorToDetails(responseInputValidation.error),
          true
        ),
      };
    }

    const userAgent = req.headers.get("user-agent") || undefined;
    const agent = new UAParser(userAgent);

    const country =
      requestHeaders.get("CF-IPCountry") ||
      requestHeaders.get("X-Vercel-IP-Country") ||
      requestHeaders.get("CloudFront-Viewer-Country") ||
      undefined;

    const responseInputData = responseInputValidation.data;

    if (responseInputData.userId) {
      const isContactsEnabled = await getIsContactsEnabled();
      if (!isContactsEnabled) {
        return {
          response: responses.forbiddenResponse(
            "User identification is only available for enterprise users.",
            true
          ),
        };
      }
    }

    // get and check survey
    const survey = await getSurvey(responseInputData.surveyId);
    if (!survey) {
      return {
        response: responses.notFoundResponse("Survey", responseInputData.surveyId, true),
      };
    }
    if (survey.environmentId !== environmentId) {
      return {
        response: responses.badRequestResponse(
          "Survey is part of another environment",
          {
            "survey.environmentId": survey.environmentId,
            environmentId,
          },
          true
        ),
      };
    }

    if (!validateFileUploads(responseInputData.data, survey.questions)) {
      return {
        response: responses.badRequestResponse("Invalid file upload response"),
      };
    }

    // Pre-flight license enforcement: check validity and response limits before creating response
    const organization = await getOrganizationByEnvironmentId(environmentId);
    if (organization) {
      const licenseValid = await checkLicenseValid(organization.id);
      if (!licenseValid.valid) {
        return {
          response: responses.forbiddenResponse(licenseValid.reason || "License validation failed", true),
        };
      }

      if (responseInput.finished) {
        const quotaCheck = await checkCompletedResponseQuota(organization.id);
        if (!quotaCheck.allowed) {
          return {
            response: responses.forbiddenResponse(
              `Completed response limit reached (${quotaCheck.current}/${quotaCheck.limit})`,
              true
            ),
          };
        }
      }
    }

    let response: TResponseWithQuotaFull;
    try {
      const meta: TResponseInput["meta"] = {
        source: responseInputData?.meta?.source,
        url: responseInputData?.meta?.url,
        userAgent: {
          browser: agent.getBrowser().name,
          device: agent.getDevice().type || "desktop",
          os: agent.getOS().name,
        },
        country: country,
        action: responseInputData?.meta?.action,
      };

      // Capture IP address if the survey has IP capture enabled
      // Server-derived IP always overwrites any client-provided value
      if (survey.isCaptureIpEnabled) {
        const ipAddress = await getClientIpFromHeaders();
        meta.ipAddress = ipAddress;
      }

      response = await createResponseWithQuotaEvaluation({
        ...responseInputData,
        meta,
      });
    } catch (error) {
      if (error instanceof InvalidInputError) {
        return {
          response: responses.badRequestResponse(error.message),
        };
      } else {
        logger.error({ error, url: req.url }, "Error creating response");
        return {
          response: responses.internalServerErrorResponse(error.message),
        };
      }
    }

    const { quotaFull, ...responseData } = response;

    sendToPipeline({
      event: "responseCreated",
      environmentId: survey.environmentId,
      surveyId: responseData.surveyId,
      response: responseData,
    });

    if (responseInput.finished) {
      sendToPipeline({
        event: "responseFinished",
        environmentId: survey.environmentId,
        surveyId: responseData.surveyId,
        response: responseData,
      });
    }

    const quotaObj = createQuotaFullObject(quotaFull);

    const responseDataWithQuota = {
      id: responseData.id,
      ...quotaObj,
    };

    return {
      response: responses.successResponse(responseDataWithQuota, true),
    };
  },
});

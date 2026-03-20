import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";
import { ZEnvironmentId } from "@hivecfm/types/environment";
import { InvalidInputError } from "@hivecfm/types/errors";
import { TResponseInput } from "@hivecfm/types/responses";
import { updateResponseWithQuotaEvaluation } from "@/app/api/v1/client/[environmentId]/responses/[responseId]/lib/response";
import { createResponseWithQuotaEvaluation } from "@/app/api/v1/client/[environmentId]/responses/lib/response";
import { responses } from "@/app/lib/api/response";
import { transformErrorToDetails } from "@/app/lib/api/validator";
import { withV1ApiWrapper } from "@/app/lib/api/with-api-logging";
import { sendToPipeline } from "@/app/lib/pipelines";
import { getOrganizationByEnvironmentId } from "@/lib/organization/service";
import { getSurvey } from "@/lib/survey/service";
import { checkLicenseValid } from "@/lib/tenant/license-enforcement";
import { checkCompletedResponseQuota } from "@/lib/tenant/quota-enforcement";

const ZIvrResponseInput = z.object({
  callId: z.string().min(1),
  callerNumber: z.string().optional(),
  answers: z.record(z.union([z.string(), z.number()])),
  finished: z.boolean(),
  language: z.string().optional(),
  hiddenFields: z.record(z.union([z.string(), z.number()])).optional(),
  meta: z
    .object({
      source: z.string().optional(),
      callDuration: z.number().optional(),
    })
    .optional(),
});

interface Context {
  params: Promise<{
    environmentId: string;
    surveyId: string;
  }>;
}

export const OPTIONS = async (): Promise<Response> => {
  return responses.successResponse({}, true, "public, s-maxage=3600, max-age=3600");
};

export const POST = withV1ApiWrapper({
  handler: async ({ req, props }: { req: NextRequest; props: Context }) => {
    const params = await props.params;
    const { environmentId, surveyId } = params;

    const environmentIdValidation = ZEnvironmentId.safeParse(environmentId);
    if (!environmentIdValidation.success) {
      return {
        response: responses.badRequestResponse(
          "Fields are missing or incorrectly formatted",
          transformErrorToDetails(environmentIdValidation.error),
          true
        ),
      };
    }

    let body;
    try {
      body = await req.json();
    } catch (error) {
      return {
        response: responses.badRequestResponse(
          "Invalid JSON in request body",
          { error: error.message },
          true
        ),
      };
    }

    const inputValidation = ZIvrResponseInput.safeParse(body);
    if (!inputValidation.success) {
      return {
        response: responses.badRequestResponse(
          "Fields are missing or incorrectly formatted",
          transformErrorToDetails(inputValidation.error),
          true
        ),
      };
    }

    const { callId, callerNumber, answers, finished, language, hiddenFields, meta } = inputValidation.data;

    const survey = await getSurvey(surveyId);
    if (!survey) {
      return {
        response: responses.notFoundResponse("Survey", surveyId, true),
      };
    }

    if (survey.environmentId !== environmentId) {
      return {
        response: responses.badRequestResponse(
          "Survey is part of another environment",
          { "survey.environmentId": survey.environmentId, environmentId },
          true
        ),
      };
    }

    // Map IVR answers to standard response data format
    // Convert numeric string values to numbers (rating/NPS questions expect numbers)
    const data: Record<string, string | number> = {};
    for (const [elementId, value] of Object.entries(answers)) {
      if (typeof value === "string" && /^\d+$/.test(value)) {
        data[elementId] = parseInt(value, 10);
      } else {
        data[elementId] = value;
      }
    }

    // Store callerNumber and callId as hidden fields so they appear in reports
    if (callerNumber) {
      data["callerNumber"] = callerNumber;
    }
    data["callId"] = callId;

    // Include hidden fields in response data (same as link surveys)
    if (hiddenFields) {
      for (const [key, value] of Object.entries(hiddenFields)) {
        data[key] = value;
      }
    }

    // Pre-flight license enforcement
    const organization = await getOrganizationByEnvironmentId(environmentId);
    if (organization) {
      const licenseValid = await checkLicenseValid(organization.id);
      if (!licenseValid.valid) {
        return {
          response: responses.forbiddenResponse(licenseValid.reason || "License validation failed", true),
        };
      }

      if (finished) {
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

    try {
      // Look up existing response by callId (singleUseId) to support question-by-question submission
      const existingResponse = await prisma.response.findFirst({
        where: { surveyId, singleUseId: callId },
        select: { id: true, data: true, finished: true },
      });

      if (existingResponse) {
        // Update existing response — merge new answers into existing data
        if (existingResponse.finished) {
          return {
            response: responses.badRequestResponse(
              "Response already finished. Cannot update a completed response.",
              { responseId: existingResponse.id },
              true
            ),
          };
        }

        const mergedData = { ...(existingResponse.data as Record<string, any>), ...data };
        const updateResult = await updateResponseWithQuotaEvaluation(existingResponse.id, {
          data: mergedData,
          finished,
        });

        const { quotaFull, ...responseData } = updateResult;

        sendToPipeline({
          event: "responseUpdated",
          environmentId: survey.environmentId,
          surveyId: responseData.surveyId,
          response: responseData,
        });

        if (finished) {
          sendToPipeline({
            event: "responseFinished",
            environmentId: survey.environmentId,
            surveyId: responseData.surveyId,
            response: responseData,
          });
        }

        return {
          response: responses.successResponse(
            {
              responseId: responseData.id,
              status: "updated",
              answersCount: Object.keys(mergedData).length,
            },
            true
          ),
        };
      }

      // Create new response
      const responseInput: TResponseInput = {
        environmentId,
        surveyId,
        finished,
        data,
        singleUseId: callId,
        language: language || undefined,
        meta: {
          source: meta?.source || "ivr",
          ...(callerNumber && { callerNumber }),
          userAgent: {
            browser: "IVR",
            device: "phone",
            os: "telephony",
          },
        },
      };

      const response = await createResponseWithQuotaEvaluation(responseInput);
      const { quotaFull, ...responseData } = response;

      sendToPipeline({
        event: "responseCreated",
        environmentId: survey.environmentId,
        surveyId: responseData.surveyId,
        response: responseData,
      });

      if (finished) {
        sendToPipeline({
          event: "responseFinished",
          environmentId: survey.environmentId,
          surveyId: responseData.surveyId,
          response: responseData,
        });
      }

      return {
        response: responses.successResponse(
          {
            responseId: responseData.id,
            status: "created",
            answersCount: Object.keys(data).length,
          },
          true
        ),
      };
    } catch (error) {
      if (error instanceof InvalidInputError) {
        return {
          response: responses.badRequestResponse(error.message),
        };
      }
      logger.error({ error, surveyId, callId }, "Error creating/updating IVR response");
      return {
        response: responses.internalServerErrorResponse(error.message),
      };
    }
  },
});

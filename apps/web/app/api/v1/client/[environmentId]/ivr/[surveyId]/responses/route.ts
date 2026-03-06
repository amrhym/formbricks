import { NextRequest } from "next/server";
import { z } from "zod";
import { logger } from "@hivecfm/logger";
import { ZEnvironmentId } from "@hivecfm/types/environment";
import { InvalidInputError } from "@hivecfm/types/errors";
import { TResponseInput } from "@hivecfm/types/responses";
import { createResponseWithQuotaEvaluation } from "@/app/api/v1/client/[environmentId]/responses/lib/response";
import { responses } from "@/app/lib/api/response";
import { transformErrorToDetails } from "@/app/lib/api/validator";
import { withV1ApiWrapper } from "@/app/lib/api/with-api-logging";
import { sendToPipeline } from "@/app/lib/pipelines";
import { getSurvey } from "@/lib/survey/service";

const ZIvrResponseInput = z.object({
  callId: z.string().min(1),
  callerNumber: z.string().optional(),
  answers: z.record(z.union([z.string(), z.number()])),
  finished: z.boolean(),
  language: z.string().optional(),
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

    const { callId, answers, finished, language, meta } = inputValidation.data;

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
    // IVR answers are { elementId: numericValue | "dtmfKey" }
    // Standard response data is { elementId: string | number | string[] }
    const data: Record<string, string | number> = {};
    for (const [elementId, value] of Object.entries(answers)) {
      data[elementId] = value;
    }

    const responseInput: TResponseInput = {
      environmentId,
      surveyId,
      finished,
      data,
      singleUseId: callId,
      language: language || undefined,
      meta: {
        source: meta?.source || "ivr",
        userAgent: {
          browser: "IVR",
          device: "phone",
          os: "telephony",
        },
      },
    };

    try {
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
      logger.error({ error, surveyId, callId }, "Error creating IVR response");
      return {
        response: responses.internalServerErrorResponse(error.message),
      };
    }
  },
});

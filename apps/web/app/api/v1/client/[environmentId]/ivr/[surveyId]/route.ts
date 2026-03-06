import { NextRequest } from "next/server";
import { logger } from "@hivecfm/logger";
import { ZEnvironmentId } from "@hivecfm/types/environment";
import { responses } from "@/app/lib/api/response";
import { transformErrorToDetails } from "@/app/lib/api/validator";
import { withV1ApiWrapper } from "@/app/lib/api/with-api-logging";
import { WEBAPP_URL } from "@/lib/constants";
import { getSurvey } from "@/lib/survey/service";
import { linearizeSurveyForIvr } from "./lib/ivr";

interface Context {
  params: Promise<{
    environmentId: string;
    surveyId: string;
  }>;
}

export const OPTIONS = async (): Promise<Response> => {
  return responses.successResponse({}, true, "public, s-maxage=600, max-age=600");
};

export const GET = withV1ApiWrapper({
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

    try {
      // Use the request origin or WEBAPP_URL as the base for media URLs
      const baseUrl = req ? `${req.nextUrl.protocol}//${req.nextUrl.host}` : WEBAPP_URL;
      const ivrData = linearizeSurveyForIvr(survey, baseUrl);
      return {
        response: responses.successResponse(ivrData, true),
      };
    } catch (error) {
      logger.error({ error, surveyId }, "Error linearizing survey for IVR");
      return {
        response: responses.internalServerErrorResponse(error.message),
      };
    }
  },
});

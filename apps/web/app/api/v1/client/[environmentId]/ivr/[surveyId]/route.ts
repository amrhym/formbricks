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
      // Extract hidden fields from query params
      // Known non-hidden-field params to exclude
      const reservedParams = new Set(["environmentId", "surveyId", "lang"]);
      const hiddenFields: Record<string, string> = {};
      for (const [key, value] of req.nextUrl.searchParams.entries()) {
        if (!reservedParams.has(key)) {
          hiddenFields[key] = value;
        }
      }

      // Extract lang parameter
      const lang = req.nextUrl.searchParams.get("lang") || undefined;

      // Always use WEBAPP_URL for media URLs (Docker internal URLs like 0.0.0.0:3000 are not externally accessible)
      const baseUrl = WEBAPP_URL;
      const ivrData = linearizeSurveyForIvr(survey, baseUrl, hiddenFields, lang);
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

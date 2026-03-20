import { NextRequest } from "next/server";
import { TIntegrationGenesysCloud } from "@hivecfm/types/integration/genesys-cloud";
import { responses } from "@/app/lib/api/response";
import { getIntegrationByType } from "@/lib/integration/service";
import { getSurvey } from "@/lib/survey/service";

interface Params {
  environmentId: string;
  surveyId: string;
}

export const OPTIONS = async (): Promise<Response> => {
  return responses.successResponse({}, true, "public, s-maxage=600, max-age=600");
};

export const GET = async (_req: NextRequest, props: { params: Promise<Params> }): Promise<Response> => {
  const { environmentId, surveyId } = await props.params;

  const survey = await getSurvey(surveyId);
  if (!survey) {
    return responses.notFoundResponse("Survey", surveyId, true);
  }

  if (survey.environmentId !== environmentId) {
    return responses.badRequestResponse(
      "Survey is part of another environment",
      { "survey.environmentId": survey.environmentId, environmentId },
      true
    );
  }

  // Get Genesys integration mappings
  const integration = (await getIntegrationByType(
    environmentId,
    "genesysCloud"
  )) as TIntegrationGenesysCloud | null;

  const mappings = (integration?.config?.data ?? []) as any[];
  const surveyPrefix = `hivecfm_${surveyId}`.replace(/[^a-zA-Z0-9_]/g, "_");

  // Build prompt map: questionId -> genesysPromptName
  const prompts: Record<string, { promptName: string; promptId: string }> = {};

  for (const block of survey.blocks) {
    for (const element of block.elements) {
      if (!element.audioUrl) continue;

      const promptName = `hivecfm_${surveyId}_${element.id}`.replace(/[^a-zA-Z0-9_]/g, "_");
      const mapping = mappings.find(
        (m: any) => m.promptName?.startsWith(surveyPrefix) && m.elementId === element.id
      );

      prompts[element.id] = {
        promptName,
        promptId: mapping?.promptId || "",
      };
    }
  }

  return responses.successResponse(
    {
      surveyId,
      surveyName: survey.name,
      prompts,
    },
    true,
    "public, s-maxage=60, max-age=60"
  );
};

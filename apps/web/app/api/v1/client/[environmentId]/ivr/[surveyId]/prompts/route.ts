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

export const GET = async (req: NextRequest, props: { params: Promise<Params> }): Promise<Response> => {
  const { environmentId, surveyId } = await props.params;

  // Extract lang parameter
  const lang = req.nextUrl.searchParams.get("lang") || undefined;

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

  // Compute language metadata
  const defaultLangCode = survey.languages?.find((l: any) => l.default)?.language?.code || "default";
  const availableLanguages = survey.languages
    ?.filter((l: any) => l.enabled)
    .map((l: any) => l.language?.code) || ["default"];

  // Prompt suffix for non-default languages
  const promptSuffix = lang && lang !== defaultLangCode ? `_${lang}` : "";

  // Get Genesys integration mappings
  const integration = (await getIntegrationByType(
    environmentId,
    "genesysCloud"
  )) as TIntegrationGenesysCloud | null;

  const mappings = (integration?.config?.data ?? []) as any[];
  const surveyPrefix = `hivecfm_${surveyId}`.replace(/[^a-zA-Z0-9_]/g, "_");

  // Helper to check if an audio URL field has a value for the requested language
  const hasAudioForLang = (audioUrlField: unknown): boolean => {
    if (typeof audioUrlField === "string") return !!audioUrlField;
    if (audioUrlField && typeof audioUrlField === "object") {
      const map = audioUrlField as Record<string, string>;
      return !!(lang && map[lang]) || !!map["default"];
    }
    return false;
  };

  // Build prompt map: questionId -> genesysPromptName
  const prompts: Record<string, { promptName: string; promptId: string }> = {};

  for (const block of survey.blocks) {
    for (const element of block.elements) {
      if (!hasAudioForLang(element.audioUrl)) continue;

      const promptName = `hivecfm_${surveyId}_${element.id}${promptSuffix}`.replace(/[^a-zA-Z0-9_]/g, "_");
      const mapping = mappings.find(
        (m: any) => m.promptName?.startsWith(surveyPrefix) && m.elementId === element.id
      );

      prompts[element.id] = {
        promptName,
        promptId: mapping?.promptId || "",
      };
    }
  }

  // Add welcome prompt if welcome card has audio
  if (hasAudioForLang((survey.welcomeCard as any)?.audioUrl)) {
    const welcomePromptName = `hivecfm_${surveyId}_welcome${promptSuffix}`.replace(/[^a-zA-Z0-9_]/g, "_");
    const welcomeMapping = mappings.find(
      (m: any) => m.promptName?.startsWith(surveyPrefix) && m.elementId === "welcome"
    );
    prompts["welcome"] = {
      promptName: welcomePromptName,
      promptId: welcomeMapping?.promptId || "",
    };
  }

  // Add ending prompt if ending card has audio
  if (
    survey.endings.length > 0 &&
    survey.endings[0].type === "endScreen" &&
    hasAudioForLang((survey.endings[0] as any)?.audioUrl)
  ) {
    const endingPromptName = `hivecfm_${surveyId}_ending${promptSuffix}`.replace(/[^a-zA-Z0-9_]/g, "_");
    const endingMapping = mappings.find(
      (m: any) => m.promptName?.startsWith(surveyPrefix) && m.elementId === "ending"
    );
    prompts["ending"] = {
      promptName: endingPromptName,
      promptId: endingMapping?.promptId || "",
    };
  }

  return responses.successResponse(
    {
      surveyId,
      surveyName: survey.name,
      requestedLanguage: lang || defaultLangCode,
      availableLanguages,
      prompts,
    },
    true,
    "public, s-maxage=60, max-age=60"
  );
};

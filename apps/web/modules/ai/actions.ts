"use server";

import { getServerSession } from "next-auth";
import { isAIConfigured } from "@/lib/ai/client";
import { generateDashboardQuery } from "@/lib/ai/dashboard-assistant";
import { generateSurveyInsights } from "@/lib/ai/response-summarizer";
import { generateSurveyFromDescription } from "@/lib/ai/survey-generator";
import { getOrganizationsByUserId } from "@/lib/organization/service";
import { getSurvey } from "@/lib/survey/service";
import { authOptions } from "@/modules/auth/lib/authOptions";

export const generateInsightsAction = async (
  surveyId: string
): Promise<
  { ok: true; insights: { summary: string; responseCount: number } } | { ok: false; error: string }
> => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { ok: false, error: "Not authenticated" };
    if (!isAIConfigured()) return { ok: false, error: "AI is not configured" };

    const survey = await getSurvey(surveyId);
    if (!survey) return { ok: false, error: "Survey not found" };

    const allQuestions =
      survey.questions.length > 0
        ? survey.questions
        : (survey.blocks?.flatMap((block: any) => block.elements) ?? []);

    const insights = await generateSurveyInsights({
      surveyId,
      surveyName: survey.name,
      questions: allQuestions.map((q: any) => ({
        id: q.id,
        type: q.type,
        headline: q.headline,
      })),
    });

    if (!insights) return { ok: false, error: "No responses found to analyze" };

    return {
      ok: true,
      insights: { summary: insights.summary, responseCount: insights.responseCount },
    };
  } catch (error: any) {
    return { ok: false, error: error.message || "Failed to generate insights" };
  }
};

export const generateSurveyAction = async (
  description: string,
  industry?: string
): Promise<{ ok: true; survey: any } | { ok: false; error: string }> => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { ok: false, error: "Not authenticated" };
    if (!isAIConfigured()) return { ok: false, error: "AI is not configured" };

    const survey = await generateSurveyFromDescription({
      description,
      industry,
      maxQuestions: 10,
    });

    // Ensure plain JSON serializable
    return { ok: true, survey: JSON.parse(JSON.stringify(survey)) };
  } catch (error: any) {
    return { ok: false, error: error.message || "Failed to generate survey" };
  }
};

export const dashboardQueryAction = async (
  query: string
): Promise<{ ok: true; result: any } | { ok: false; error: string }> => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { ok: false, error: "Not authenticated" };
    if (!isAIConfigured()) return { ok: false, error: "AI is not configured" };

    const orgs = await getOrganizationsByUserId(session.user.id);
    if (orgs.length === 0) return { ok: false, error: "No organization found" };

    const result = await generateDashboardQuery({
      userQuery: query,
      organizationId: orgs[0].id,
    });

    if (!result) return { ok: false, error: "Could not generate query" };

    return { ok: true, result: JSON.parse(JSON.stringify(result)) };
  } catch (error: any) {
    return { ok: false, error: error.message || "Failed to generate query" };
  }
};

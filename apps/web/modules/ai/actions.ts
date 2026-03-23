"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/lib/authOptions";

export const generateInsightsAction = async (
  surveyId: string
): Promise<
  { ok: true; insights: { summary: string; responseCount: number } } | { ok: false; error: string }
> => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { ok: false, error: "Not authenticated" };

    // Dynamic imports to avoid server action bundling issues
    const { isAIConfigured } = await import("@/lib/ai/client");
    if (!isAIConfigured()) return { ok: false, error: "AI is not configured" };

    const { getSurvey } = await import("@/lib/survey/service");
    const survey = await getSurvey(surveyId);
    if (!survey) return { ok: false, error: "Survey not found" };

    const allQuestions =
      survey.questions.length > 0
        ? survey.questions
        : (survey.blocks?.flatMap((block: any) => block.elements) ?? []);

    const { generateSurveyInsights } = await import("@/lib/ai/response-summarizer");
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
    console.error("AI Insights error:", error);
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

    const { isAIConfigured } = await import("@/lib/ai/client");
    if (!isAIConfigured()) return { ok: false, error: "AI is not configured" };

    const { generateSurveyFromDescription } = await import("@/lib/ai/survey-generator");
    const survey = await generateSurveyFromDescription({
      description,
      industry,
      maxQuestions: 10,
    });

    return { ok: true, survey: JSON.parse(JSON.stringify(survey)) };
  } catch (error: any) {
    console.error("AI Survey Builder error:", error);
    return { ok: false, error: error.message || "Failed to generate survey" };
  }
};

export const dashboardQueryAction = async (
  query: string
): Promise<{ ok: true; result: any } | { ok: false; error: string }> => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { ok: false, error: "Not authenticated" };

    const { isAIConfigured } = await import("@/lib/ai/client");
    if (!isAIConfigured()) return { ok: false, error: "AI is not configured" };

    const { getOrganizationsByUserId } = await import("@/lib/organization/service");
    const orgs = await getOrganizationsByUserId(session.user.id);
    if (orgs.length === 0) return { ok: false, error: "No organization found" };

    const { generateDashboardQuery } = await import("@/lib/ai/dashboard-assistant");
    const result = await generateDashboardQuery({
      userQuery: query,
      organizationId: orgs[0].id,
    });

    if (!result) return { ok: false, error: "Could not generate query" };

    return { ok: true, result: JSON.parse(JSON.stringify(result)) };
  } catch (error: any) {
    console.error("AI Dashboard error:", error);
    return { ok: false, error: error.message || "Failed to generate query" };
  }
};

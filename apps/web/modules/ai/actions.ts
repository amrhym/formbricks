"use server";

import { getServerSession } from "next-auth";
import { isAIConfigured } from "@/lib/ai/client";
import { generateDashboardQuery } from "@/lib/ai/dashboard-assistant";
import { generateSurveyInsights } from "@/lib/ai/response-summarizer";
import { generateSurveyFromDescription } from "@/lib/ai/survey-generator";
import { getOrganizationsByUserId } from "@/lib/organization/service";
import { getSurvey } from "@/lib/survey/service";
import { authOptions } from "@/modules/auth/lib/authOptions";

export const generateInsightsAction = async (surveyId: string) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Not authenticated");
  if (!isAIConfigured()) throw new Error("AI is not configured");

  const survey = await getSurvey(surveyId);
  if (!survey) throw new Error("Survey not found");

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

  if (!insights) return null;

  // Serialize Date for server action boundary
  return {
    summary: insights.summary,
    responseCount: insights.responseCount,
    surveyId: insights.surveyId,
    generatedAt: insights.generatedAt.toISOString(),
  };
};

export const generateSurveyAction = async (description: string, industry?: string) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Not authenticated");
  if (!isAIConfigured()) throw new Error("AI is not configured");

  const survey = await generateSurveyFromDescription({
    description,
    industry,
    maxQuestions: 10,
  });

  return survey;
};

export const dashboardQueryAction = async (query: string) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Not authenticated");
  if (!isAIConfigured()) throw new Error("AI is not configured");

  const orgs = await getOrganizationsByUserId(session.user.id);
  if (orgs.length === 0) throw new Error("No organization found");

  const result = await generateDashboardQuery({
    userQuery: query,
    organizationId: orgs[0].id,
  });

  return result;
};

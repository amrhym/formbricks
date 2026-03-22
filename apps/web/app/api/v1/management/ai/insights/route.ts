import { NextRequest } from "next/server";
import { z } from "zod";
import { responses } from "@/app/lib/api/response";
import { transformErrorToDetails } from "@/app/lib/api/validator";
import { isAIConfigured } from "@/lib/ai/client";
import { generateSurveyInsights } from "@/lib/ai/response-summarizer";
import { getSurvey } from "@/lib/survey/service";
import { getServerSession } from "@/modules/auth/lib/authOptions";

const ZInsightsInput = z.object({
  surveyId: z.string(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  maxResponses: z.number().min(1).max(500).optional(),
});

export const POST = async (req: NextRequest) => {
  const session = await getServerSession();
  if (!session?.user) {
    return responses.notAuthenticatedResponse();
  }

  if (!isAIConfigured()) {
    return responses.badRequestResponse("AI is not configured. Set KIMI_API_KEY environment variable.");
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return responses.badRequestResponse("Invalid JSON");
  }

  const validation = ZInsightsInput.safeParse(body);
  if (!validation.success) {
    return responses.badRequestResponse("Invalid input", transformErrorToDetails(validation.error));
  }

  const survey = await getSurvey(validation.data.surveyId);
  if (!survey) {
    return responses.notFoundResponse("Survey", validation.data.surveyId);
  }

  const allQuestions =
    survey.questions.length > 0
      ? survey.questions
      : (survey.blocks?.flatMap((block: any) => block.elements) ?? []);

  try {
    const insights = await generateSurveyInsights({
      surveyId: validation.data.surveyId,
      surveyName: survey.name,
      questions: allQuestions.map((q: any) => ({
        id: q.id,
        type: q.type,
        headline: q.headline,
      })),
      dateFrom: validation.data.dateFrom ? new Date(validation.data.dateFrom) : undefined,
      dateTo: validation.data.dateTo ? new Date(validation.data.dateTo) : undefined,
      maxResponses: validation.data.maxResponses,
    });

    if (!insights) {
      return responses.successResponse({ message: "No responses found to analyze" });
    }

    return responses.successResponse({ insights });
  } catch (error: any) {
    return responses.internalServerErrorResponse(error.message);
  }
};

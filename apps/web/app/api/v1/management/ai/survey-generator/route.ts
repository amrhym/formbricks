import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { z } from "zod";
import { responses } from "@/app/lib/api/response";
import { transformErrorToDetails } from "@/app/lib/api/validator";
import { isAIConfigured } from "@/lib/ai/client";
import { generateSurveyFromDescription } from "@/lib/ai/survey-generator";
import { authOptions } from "@/modules/auth/lib/authOptions";

const ZGenerateSurveyInput = z.object({
  description: z.string().min(10).max(1000),
  industry: z.string().optional(),
  language: z.string().optional(),
  maxQuestions: z.number().min(1).max(20).optional(),
});

export const POST = async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
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

  const validation = ZGenerateSurveyInput.safeParse(body);
  if (!validation.success) {
    return responses.badRequestResponse("Invalid input", transformErrorToDetails(validation.error));
  }

  try {
    const survey = await generateSurveyFromDescription(validation.data);
    return responses.successResponse({ survey });
  } catch (error: any) {
    return responses.internalServerErrorResponse(error.message);
  }
};

"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/lib/authOptions";

export const createSurveyFromAIAction = async (
  environmentId: string,
  surveyBody: any
): Promise<{ ok: true; surveyId: string } | { ok: false; error: string }> => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { ok: false, error: "Not authenticated" };

    const { createSurvey } = await import("@/modules/survey/components/template-list/lib/survey");
    const result = await createSurvey(environmentId, surveyBody);

    return { ok: true, surveyId: result.id };
  } catch (error: any) {
    console.error("AI Create Survey error:", error);
    return { ok: false, error: error.message || "Failed to create survey" };
  }
};

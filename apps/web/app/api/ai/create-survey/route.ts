import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/modules/auth/lib/authOptions";
import { createSurvey } from "@/modules/survey/components/template-list/lib/survey";

export const POST = async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { environmentId, surveyBody } = body;

  if (!environmentId || !surveyBody) {
    return Response.json({ ok: false, error: "Missing environmentId or surveyBody" }, { status: 400 });
  }

  try {
    const result = await createSurvey(environmentId, surveyBody);
    return Response.json({ ok: true, surveyId: result.id });
  } catch (error: any) {
    return Response.json({ ok: false, error: error.message || "Failed to create survey" }, { status: 500 });
  }
};

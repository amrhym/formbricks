import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { generateJSON, isAIConfigured } from "@/lib/ai/client";
import { authOptions } from "@/modules/auth/lib/authOptions";

export const POST = async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  if (!isAIConfigured()) {
    return Response.json({ ok: false, error: "AI is not configured" }, { status: 500 });
  }

  const body = await req.json();
  const { description, industry, maxQuestions = 10 } = body;

  if (!description || description.length < 10) {
    return Response.json({ ok: false, error: "Description must be at least 10 characters" }, { status: 400 });
  }

  try {
    const survey = await generateJSON(
      `You are a survey design expert. Create professional surveys. Return JSON with:
- "name": survey name
- "blocks": array of blocks, each with "name" and "elements" array
- "welcomeHeadline", "welcomeSubheader", "endingHeadline", "endingSubheader"

Each element must have:
- "id": unique 8-char random string
- "type": one of "openText", "multipleChoiceSingle", "multipleChoiceMulti", "nps", "rating", "cta", "consent", "date"
- "headline": { "default": "question text" }
- "required": boolean
- For rating: add "range" (3,5,7,10) and "scale" ("number","star","smiley")
- For multiple choice: add "choices" array with { "id": "random", "label": { "default": "text" } }
- For openText: optionally add "longResponse": true`,
      `Create a survey: "${description}"
${industry ? `Industry: ${industry}` : ""}
Max questions: ${maxQuestions}

Mix question types. Start easy, end with open text. Return JSON only.`,
      { maxTokens: 8000 }
    );

    return Response.json({ ok: true, survey });
  } catch (error: any) {
    return Response.json({ ok: false, error: error.message || "Failed to generate survey" }, { status: 500 });
  }
};

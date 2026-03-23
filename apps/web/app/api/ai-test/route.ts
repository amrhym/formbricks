import { NextRequest } from "next/server";
import { generateJSON, isAIConfigured } from "@/lib/ai/client";

export const POST = async (req: NextRequest) => {
  try {
    if (!isAIConfigured()) {
      return Response.json({ error: "AI not configured" }, { status: 500 });
    }

    const body = await req.json();
    const result = await generateJSON(
      "You are a survey expert. Return JSON with: name (string), questionCount (number).",
      `Create a survey name for: "${body.description || "test"}". Return JSON only.`,
      { maxTokens: 500 }
    );

    return Response.json({ ok: true, result });
  } catch (error: any) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
};

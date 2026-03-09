"use server";

import { z } from "zod";
import { logger } from "@hivecfm/logger";
import { ZId } from "@hivecfm/types/common";
import { OperationNotAllowedError } from "@hivecfm/types/errors";
import { checkAddonAccess } from "@/lib/tenant/license-enforcement";
import { authenticatedActionClient } from "@/lib/utils/action-client";
import { checkAuthorizationUpdated } from "@/lib/utils/action-client/action-client-middleware";
import { getOrganizationIdFromEnvironmentId } from "@/lib/utils/helper";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const ZTranslateSurveyContentAction = z.object({
  environmentId: ZId,
  sourceLanguageCode: z.string().min(1),
  targetLanguageCode: z.string().min(1),
  texts: z.array(z.string()),
});

async function translateTextsWithAI(
  texts: string[],
  sourceLanguageCode: string,
  targetLanguageCode: string
): Promise<string[]> {
  if (!OPENAI_API_KEY) {
    throw new Error("AI translation is not configured. OPENAI_API_KEY is missing.");
  }

  if (texts.length === 0) return [];

  // Filter out empty strings and track their positions
  const indexedTexts: { index: number; text: string }[] = [];
  for (let i = 0; i < texts.length; i++) {
    if (texts[i].trim()) {
      indexedTexts.push({ index: i, text: texts[i] });
    }
  }

  if (indexedTexts.length === 0) return texts.map(() => "");

  const numberedTexts = indexedTexts.map((item, i) => `[${i + 1}] ${item.text}`).join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: `You are a professional translator. Translate the following numbered texts from "${sourceLanguageCode}" to "${targetLanguageCode}".
Keep the same numbering format [1], [2], etc.
Preserve any HTML tags, placeholders like {{variable}}, and formatting exactly as-is.
Only translate the human-readable text content.
Return ONLY the numbered translations, nothing else.`,
        },
        {
          role: "user",
          content: numberedTexts,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error({ status: response.status, error }, "OpenAI API error during translation");
    throw new Error(`AI translation failed: ${response.status}`);
  }

  const data = await response.json();
  const content: string = data.choices?.[0]?.message?.content ?? "";

  // Parse the numbered responses
  const results = new Array(texts.length).fill("");
  const lines = content.split("\n").filter((l: string) => l.trim());

  for (const line of lines) {
    const match = line.match(/^\[(\d+)\]\s*(.*)/);
    if (match) {
      const num = parseInt(match[1], 10) - 1;
      if (num >= 0 && num < indexedTexts.length) {
        results[indexedTexts[num].index] = match[2].trim();
      }
    }
  }

  return results;
}

export const translateSurveyContentAction = authenticatedActionClient
  .schema(ZTranslateSurveyContentAction)
  .action(async ({ ctx, parsedInput }) => {
    const { environmentId, sourceLanguageCode, targetLanguageCode, texts } = parsedInput;

    const organizationId = await getOrganizationIdFromEnvironmentId(environmentId);

    await checkAuthorizationUpdated({
      userId: ctx.user.id,
      organizationId,
      access: [
        {
          type: "organization",
          roles: ["owner", "manager"],
        },
      ],
    });

    const hasAccess = await checkAddonAccess(organizationId, "aiInsights");
    if (!hasAccess) {
      throw new OperationNotAllowedError("AI translation is not enabled for this organization");
    }

    const translated = await translateTextsWithAI(texts, sourceLanguageCode, targetLanguageCode);
    return translated;
  });

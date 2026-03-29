"use server";

import { z } from "zod";
import { ZId } from "@hivecfm/types/common";
import { OperationNotAllowedError } from "@hivecfm/types/errors";
import { generateText } from "@/lib/ai/client";
import { checkAddonAccess } from "@/lib/tenant/license-enforcement";
import { authenticatedActionClient } from "@/lib/utils/action-client";
import { checkAuthorizationUpdated } from "@/lib/utils/action-client/action-client-middleware";
import { getOrganizationIdFromEnvironmentId } from "@/lib/utils/helper";

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

  const systemPrompt = `You are a professional translator. Translate the following numbered texts from "${sourceLanguageCode}" to "${targetLanguageCode}".
Keep the same numbering format [1], [2], etc.
Preserve any HTML tags, placeholders like {{variable}}, and formatting exactly as-is.
Only translate the human-readable text content.
Return ONLY the numbered translations, nothing else.`;

  const content = await generateText(systemPrompt, numberedTexts, { temperature: 0.1 });

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

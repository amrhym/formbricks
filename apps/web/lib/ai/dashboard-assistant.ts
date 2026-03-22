import { logger } from "@hivecfm/logger";
import { generateText, isAIConfigured } from "./client";

export interface DashboardQueryResult {
  sql: string;
  explanation: string;
  chartType: string;
  title: string;
}

const SCHEMA_CONTEXT = `Available PostgreSQL tables:
- "Response": id, "surveyId", "environmentId", "contactId", data (JSONB), finished, language, "createdAt", "updatedAt", "finishedAt", "singleUseId", meta (JSONB)
- "Survey": id, name, type, status, "environmentId", "projectId", "createdAt"
- "Contact": id, "environmentId", "createdAt"
- "ContactAttribute": "contactId", "attributeKeyId", value
- "Tag": id, name, "environmentId"
- "TagsOnResponses": "responseId", "tagId"
- "Environment": id, "projectId"
- "Project": id, name, "organizationId"

Relationships: Response->Survey(surveyId), Response->Tags(TagsOnResponses), Survey->Environment, Environment->Project, Project->Organization
Use double quotes for all identifiers. Extract JSON data with ("data"->>'key').`;

export const generateDashboardQuery = async ({
  userQuery,
  organizationId,
}: {
  userQuery: string;
  organizationId: string;
}): Promise<DashboardQueryResult | null> => {
  if (!isAIConfigured()) return null;

  try {
    const text = await generateText(
      `You are a SQL analyst for a customer feedback platform. Generate PostgreSQL queries.
${SCHEMA_CONTEXT}

Always filter by organization:
"Survey"."environmentId" IN (SELECT e.id FROM "Environment" e JOIN "Project" p ON e."projectId" = p.id WHERE p."organizationId" = '${organizationId}')

Respond in exactly 3 lines:
SQL: <query>
CHART: <bar|line|pie|table|big_number|area>
TITLE: <short title>`,
      userQuery,
      { maxTokens: 1000 }
    );

    const lines = text.trim().split("\n");
    const sqlLine = lines.find((l) => l.startsWith("SQL:"));
    const chartLine = lines.find((l) => l.startsWith("CHART:"));
    const titleLine = lines.find((l) => l.startsWith("TITLE:"));

    if (!sqlLine) return null;

    return {
      sql: sqlLine.replace("SQL:", "").trim(),
      explanation: text,
      chartType: chartLine?.replace("CHART:", "").trim() || "table",
      title: titleLine?.replace("TITLE:", "").trim() || "Query Result",
    };
  } catch (error) {
    logger.error({ error }, "AI dashboard query generation failed");
    return null;
  }
};

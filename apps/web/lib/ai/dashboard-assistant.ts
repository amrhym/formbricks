import { generateText } from "ai";
import { logger } from "@hivecfm/logger";
import { getModel, isAIConfigured } from "./client";

interface DashboardQueryInput {
  userQuery: string;
  organizationId: string;
  availableTables?: string[];
}

export interface DashboardQueryResult {
  sql: string;
  explanation: string;
  chartType: "bar" | "line" | "pie" | "table" | "big_number" | "area";
  title: string;
}

const HIVECFM_SCHEMA = `
Available tables and key columns:

1. "Response" (survey responses):
   - id, "surveyId", "environmentId", "contactId"
   - data (JSONB - contains question answers as key-value pairs)
   - finished (boolean), language
   - "createdAt", "updatedAt", "finishedAt"
   - "singleUseId" (for IVR callId)
   - meta (JSONB - source, callerNumber, userAgent)

2. "Survey" (survey definitions):
   - id, name, type (app/link/api), status
   - "environmentId", "projectId"
   - "createdAt", "updatedAt"

3. "Contact" (identified users):
   - id, "environmentId", "createdAt"

4. "ContactAttribute" (contact properties):
   - "contactId", "attributeKeyId", value

5. "ContactAttributeKey" (attribute definitions):
   - id, key, name, "environmentId"

6. "Tag" (response tags):
   - id, name, "environmentId"

7. "TagsOnResponses" (tag assignments):
   - "responseId", "tagId"

8. "Environment":
   - id, "projectId"

9. "Project":
   - id, name, "organizationId"

Key relationships:
- Response belongs to Survey (surveyId)
- Response has many Tags via TagsOnResponses
- Response belongs to Contact (contactId)
- Survey belongs to Environment
- Environment belongs to Project
- Project belongs to Organization

IMPORTANT: All table and column names use double quotes for PostgreSQL case-sensitivity.
Always filter by organizationId through the Project -> Environment -> Survey/Response chain.
`;

export const generateDashboardQuery = async ({
  userQuery,
  organizationId,
}: DashboardQueryInput): Promise<DashboardQueryResult | null> => {
  if (!isAIConfigured()) return null;

  try {
    const { text } = await generateText({
      model: getModel(),
      prompt: `You are a SQL analyst for a customer feedback management platform (HiveCFM).
Generate a PostgreSQL query based on the user's natural language question.

${HIVECFM_SCHEMA}

Organization filter: Always include this WHERE clause to scope data:
"Survey"."environmentId" IN (
  SELECT e.id FROM "Environment" e
  JOIN "Project" p ON e."projectId" = p.id
  WHERE p."organizationId" = '${organizationId}'
)

User question: "${userQuery}"

Respond in this exact format (3 lines, no extra text):
SQL: <the SQL query on one line>
CHART: <one of: bar, line, pie, table, big_number, area>
TITLE: <short dashboard widget title>

Rules:
- Use PostgreSQL syntax with double-quoted identifiers
- For date grouping, use DATE_TRUNC('day'/"week"/"month", "createdAt")
- For extracting JSON data: ("data"->>'questionId')::text or ::integer
- Always include the organization filter
- Limit results to 1000 rows max
- For NPS calculations: promoters (9-10), passives (7-8), detractors (0-6)
- Keep queries efficient with proper indexes`,
      maxTokens: 1000,
    });

    const lines = text.trim().split("\n");
    const sqlLine = lines.find((l) => l.startsWith("SQL:"));
    const chartLine = lines.find((l) => l.startsWith("CHART:"));
    const titleLine = lines.find((l) => l.startsWith("TITLE:"));

    if (!sqlLine) return null;

    return {
      sql: sqlLine.replace("SQL:", "").trim(),
      explanation: text,
      chartType: (chartLine?.replace("CHART:", "").trim() || "table") as DashboardQueryResult["chartType"],
      title: titleLine?.replace("TITLE:", "").trim() || "Query Result",
    };
  } catch (error) {
    logger.error({ error }, "AI dashboard query generation failed");
    return null;
  }
};

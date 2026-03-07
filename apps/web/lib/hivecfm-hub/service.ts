import "server-only";
import { logger } from "@hivecfm/logger";
import { TSurveyElementTypeEnum } from "@hivecfm/types/surveys/elements";
import { HIVECFM_HUB_API_KEY, HIVECFM_HUB_URL, IS_HIVECFM_HUB_CONFIGURED } from "@/lib/constants";

type HubFieldType =
  | "text"
  | "categorical"
  | "nps"
  | "csat"
  | "ces"
  | "rating"
  | "number"
  | "boolean"
  | "date";

interface HubFeedbackRecord {
  tenant_id: string;
  submission_id: string;
  source_type: string;
  source_id?: string;
  source_name?: string;
  field_id: string;
  field_label?: string;
  field_type: HubFieldType;
  field_group_id?: string;
  field_group_label?: string;
  value_text?: string;
  value_number?: number;
  value_boolean?: boolean;
  value_date?: string;
  metadata?: Record<string, unknown>;
  language?: string;
  user_identifier?: string;
  collected_at?: string;
}

const QUESTION_TYPE_TO_HUB_FIELD: Record<string, HubFieldType> = {
  [TSurveyElementTypeEnum.OpenText]: "text",
  [TSurveyElementTypeEnum.MultipleChoiceSingle]: "categorical",
  [TSurveyElementTypeEnum.MultipleChoiceMulti]: "categorical",
  [TSurveyElementTypeEnum.NPS]: "nps",
  [TSurveyElementTypeEnum.Rating]: "rating",
  [TSurveyElementTypeEnum.CTA]: "boolean",
  [TSurveyElementTypeEnum.Consent]: "boolean",
  [TSurveyElementTypeEnum.Date]: "date",
  [TSurveyElementTypeEnum.Matrix]: "text",
  [TSurveyElementTypeEnum.Address]: "text",
  [TSurveyElementTypeEnum.Ranking]: "text",
  [TSurveyElementTypeEnum.ContactInfo]: "text",
  [TSurveyElementTypeEnum.PictureSelection]: "categorical",
  [TSurveyElementTypeEnum.FileUpload]: "text",
  [TSurveyElementTypeEnum.Cal]: "text",
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function getHeadlineText(headline: Record<string, string> | string): string {
  const raw = typeof headline === "string" ? headline : headline.default || Object.values(headline)[0] || "";
  return stripHtml(raw);
}

function extractFieldValue(
  questionType: string,
  answer: string | number | string[] | Record<string, string> | undefined
): Pick<HubFeedbackRecord, "value_text" | "value_number" | "value_boolean"> {
  if (answer === undefined || answer === null) return {};

  switch (questionType) {
    case TSurveyElementTypeEnum.NPS:
    case TSurveyElementTypeEnum.Rating:
      return { value_number: typeof answer === "number" ? answer : Number(answer) };

    case TSurveyElementTypeEnum.CTA:
    case TSurveyElementTypeEnum.Consent:
      return {
        value_boolean: answer === "accepted" || answer === "clicked" || answer === "true",
      };

    case TSurveyElementTypeEnum.MultipleChoiceMulti:
    case TSurveyElementTypeEnum.Ranking:
    case TSurveyElementTypeEnum.PictureSelection:
      return { value_text: Array.isArray(answer) ? answer.join(", ") : String(answer) };

    case TSurveyElementTypeEnum.Matrix:
    case TSurveyElementTypeEnum.Address:
    case TSurveyElementTypeEnum.ContactInfo:
      return { value_text: typeof answer === "object" ? JSON.stringify(answer) : String(answer) };

    default:
      return { value_text: String(answer) };
  }
}

interface PushToHubParams {
  environmentId: string;
  organizationId: string;
  surveyId: string;
  surveyName: string;
  responseId: string;
  responseData: Record<string, string | number | string[] | Record<string, string> | undefined>;
  questions: Array<{
    id: string;
    type: string;
    headline: Record<string, string> | string;
  }>;
  language?: string | null;
  userIdentifier?: string | null;
  collectedAt?: Date;
}

// --- Semantic Search Types & Functions ---

export interface SemanticSearchResult {
  feedback_record_id: string;
  score: number;
  field_label: string;
  value_text: string;
  source_id: string;
  source_name: string;
  submission_id: string;
  collected_at: string;
  sentiment: string;
  sentiment_score: number;
}

export interface SemanticSearchApiResponse {
  data: SemanticSearchResult[];
  limit: number;
  next_cursor?: string;
}

export async function searchFeedbackSemantic(params: {
  query: string;
  tenantId: string;
  limit?: number;
  minScore?: number;
  sourceId?: string;
  since?: string;
  until?: string;
  cursor?: string;
}): Promise<SemanticSearchApiResponse> {
  const empty: SemanticSearchApiResponse = { data: [], limit: params.limit ?? 10 };
  if (!IS_HIVECFM_HUB_CONFIGURED) return empty;

  const url = new URL(`${HIVECFM_HUB_URL}/v1/feedback-records/search/semantic`);
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  if (params.minScore !== undefined) url.searchParams.set("min_score", String(params.minScore));
  if (params.cursor) url.searchParams.set("cursor", params.cursor);

  const body: Record<string, string> = {
    query: params.query,
    tenant_id: params.tenantId,
  };
  if (params.sourceId) body.source_id = params.sourceId;
  if (params.since) body.since = params.since;
  if (params.until) body.until = params.until;

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${HIVECFM_HUB_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const respBody = await response.text().catch(() => "");
    logger.error({ status: response.status, body: respBody }, "Hub semantic search failed");
    return empty;
  }

  const data = await response.json();
  return {
    data: (data.data ?? []) as SemanticSearchResult[],
    limit: data.limit ?? params.limit ?? 10,
    next_cursor: data.next_cursor,
  };
}

export async function getSimilarFeedback(params: {
  recordId: string;
  tenantId: string;
  limit?: number;
  cursor?: string;
}): Promise<SemanticSearchApiResponse> {
  const empty: SemanticSearchApiResponse = { data: [], limit: params.limit ?? 10 };
  if (!IS_HIVECFM_HUB_CONFIGURED) return empty;

  const url = new URL(`${HIVECFM_HUB_URL}/v1/feedback-records/${params.recordId}/similar`);
  url.searchParams.set("tenant_id", params.tenantId);
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  if (params.cursor) url.searchParams.set("cursor", params.cursor);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${HIVECFM_HUB_API_KEY}`,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    logger.error({ status: response.status, body }, "Hub similar feedback failed");
    return empty;
  }

  const data = await response.json();
  return {
    data: (data.data ?? []) as SemanticSearchResult[],
    limit: data.limit ?? params.limit ?? 10,
    next_cursor: data.next_cursor,
  };
}

// --- Push Response to Hub ---

export async function pushResponseToHub(params: PushToHubParams): Promise<void> {
  if (!IS_HIVECFM_HUB_CONFIGURED) return;

  const {
    organizationId,
    surveyId,
    surveyName,
    responseId,
    responseData,
    questions,
    language,
    userIdentifier,
    collectedAt,
  } = params;

  const records: HubFeedbackRecord[] = [];

  for (const question of questions) {
    const answer = responseData[question.id];
    if (answer === undefined || answer === null) continue;

    const fieldType = QUESTION_TYPE_TO_HUB_FIELD[question.type];
    if (!fieldType) continue;

    const values = extractFieldValue(question.type, answer);
    if (!values.value_text && values.value_number === undefined && values.value_boolean === undefined)
      continue;

    records.push({
      tenant_id: organizationId,
      submission_id: responseId,
      source_type: "survey",
      source_id: surveyId,
      source_name: surveyName,
      field_id: question.id,
      field_label: getHeadlineText(question.headline),
      field_type: fieldType,
      ...values,
      ...(language ? { language } : {}),
      ...(userIdentifier ? { user_identifier: userIdentifier } : {}),
      ...(collectedAt ? { collected_at: collectedAt.toISOString() } : {}),
    });
  }

  if (records.length === 0) return;

  const results = await Promise.allSettled(
    records.map((record) =>
      fetch(`${HIVECFM_HUB_URL}/v1/feedback-records`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${HIVECFM_HUB_API_KEY}`,
        },
        body: JSON.stringify(record),
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(`Hub API ${res.status}: ${body}`);
        }
      })
    )
  );

  const failures = results.filter((r) => r.status === "rejected");
  if (failures.length > 0) {
    logger.error(
      { surveyId, responseId, failureCount: failures.length },
      `Failed to push ${failures.length}/${records.length} feedback records to Hub`
    );
  } else {
    logger.info({ surveyId, responseId, count: records.length }, "Pushed feedback records to Hub");
  }
}

// --- Tenant Registration ---

export async function registerHubTenant(organizationId: string, orgName: string): Promise<void> {
  if (!IS_HIVECFM_HUB_CONFIGURED) return;

  try {
    const response = await fetch(`${HIVECFM_HUB_URL}/v1/tenants`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${HIVECFM_HUB_API_KEY}`,
      },
      body: JSON.stringify({ tenant_id: organizationId, name: orgName }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      logger.warn(
        { organizationId, status: response.status, body },
        "Hub tenant registration returned non-OK (may not be supported yet)"
      );
      return;
    }

    logger.info({ organizationId }, "Registered tenant in Hub");
  } catch (error) {
    logger.warn({ organizationId, error }, "Failed to register tenant in Hub (graceful)");
  }
}

export async function deregisterHubTenant(organizationId: string): Promise<void> {
  if (!IS_HIVECFM_HUB_CONFIGURED) return;

  try {
    const response = await fetch(`${HIVECFM_HUB_URL}/v1/tenants/${encodeURIComponent(organizationId)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${HIVECFM_HUB_API_KEY}`,
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      logger.warn(
        { organizationId, status: response.status, body },
        "Hub tenant deregistration returned non-OK (may not be supported yet)"
      );
      return;
    }

    logger.info({ organizationId }, "Deregistered tenant from Hub");
  } catch (error) {
    logger.warn({ organizationId, error }, "Failed to deregister tenant from Hub (graceful)");
  }
}

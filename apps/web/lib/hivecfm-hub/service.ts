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

function getHeadlineText(headline: Record<string, string> | string): string {
  if (typeof headline === "string") return headline;
  return headline.default || Object.values(headline)[0] || "";
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

export async function pushResponseToHub(params: PushToHubParams): Promise<void> {
  if (!IS_HIVECFM_HUB_CONFIGURED) return;

  const {
    environmentId,
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
      tenant_id: environmentId,
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

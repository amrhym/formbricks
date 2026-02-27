/**
 * Genesys Bot Connector Types
 *
 * Request and response types matching the Genesys Cloud Bot Connector v1 API spec.
 * @see https://developer.genesys.cloud/commdigital/textbots/botconnector-customer-api-spec
 */
import { z } from "zod";

// ─── Request Types (from Genesys) ───────────────────────────────────────────

/**
 * Actual Genesys Bot Connector v1 request format.
 *
 * Example payload from Genesys:
 * {
 *   "botId": "HiveCFM Survey Bot",
 *   "botVersion": "1.0",
 *   "botSessionId": "uuid",
 *   "inputMessage": { "type": "Text", "text": "hi" },
 *   "languageCode": "en-us",
 *   "botSessionTimeout": 4320,
 *   "chatBot": { "id": "hivecfm-survey-bot", "name": "HiveCFM Survey Bot" },
 *   "genesysConversationId": "uuid",
 *   "parameters": { "surveyId": "...", "environmentId": "..." },
 *   "botState": "{...}"  // only on subsequent turns
 * }
 */
export const ZBotConnectorRequest = z.object({
  /** Unique session ID for this bot conversation */
  botSessionId: z.string(),
  /** Bot identifier */
  botId: z.string().optional(),
  /** Bot version */
  botVersion: z.string().optional(),
  /** Customer's message — Genesys wraps it in inputMessage.text */
  inputMessage: z
    .object({
      type: z.string().optional(),
      text: z.string().default(""),
    })
    .optional(),
  /** Serialized state from previous turn (absent or empty on first turn) */
  botState: z.string().default(""),
  /** Parameters passed from Architect flow (surveyId, environmentId, conversationId) */
  parameters: z.record(z.string(), z.string()).optional().default({}),
  /** Language code (e.g., "en-us") */
  languageCode: z.string().optional().default("en-US"),
  /** Session timeout in minutes */
  botSessionTimeout: z.number().optional(),
  /** Chat bot metadata */
  chatBot: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
    })
    .optional(),
  /** Genesys conversation ID */
  genesysConversationId: z.string().optional(),
});

export type TBotConnectorRequest = z.infer<typeof ZBotConnectorRequest>;

// ─── Response Types (to Genesys) ────────────────────────────────────────────

export interface TBotReplyContent {
  contentType: "Text" | "QuickReply";
  text?: string;
  quickReply?: {
    text: string;
    payload: string;
    action: "Message";
  };
}

export interface TBotReplyMessage {
  type: "Structured";
  content: TBotReplyContent[];
}

export interface TBotIntent {
  name: string;
  confidence: number;
  slots: Record<string, unknown>;
}

export interface TBotConnectorResponse {
  botState: string;
  replyMessages: TBotReplyMessage[];
  intent: TBotIntent;
}

// ─── Bot State (serialized between turns) ───────────────────────────────────

export interface TBotSessionState {
  /** HiveCFM response ID */
  responseId: string;
  /** Survey ID */
  surveyId: string;
  /** Environment ID */
  environmentId: string;
  /** Current question index (0-based) */
  currentQuestionIndex: number;
  /** Question IDs in order */
  questionIds: string[];
  /** Collected answers keyed by question ID */
  answers: Record<string, unknown>;
  /** Genesys conversation ID */
  genesysConversationId?: string;
}

// ─── Intent Names ───────────────────────────────────────────────────────────

export const BOT_INTENTS = {
  SURVEY_IN_PROGRESS: "survey_in_progress",
  SURVEY_COMPLETE: "survey_complete",
  SURVEY_OPTED_OUT: "survey_opted_out",
  SURVEY_ERROR: "survey_error",
} as const;

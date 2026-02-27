/**
 * Genesys Bot Connector Types
 *
 * Request and response types matching the Genesys Cloud Bot Connector v1 API spec.
 * @see https://developer.genesys.cloud/commdigital/textbots/botconnector-customer-api-spec
 */
import { z } from "zod";

// ─── Request Types (from Genesys) ───────────────────────────────────────────

export const ZBotConnectorRequest = z.object({
  /** Unique session ID for this bot conversation */
  botSessionId: z.string(),
  /** Customer's message text (empty string on first turn) */
  utterance: z.string().default(""),
  /** Serialized state from previous turn (empty string on first turn) */
  botState: z.string().default(""),
  /** Parameters passed from Architect flow (conversationId, agentId, surveyId, environmentId, etc.) */
  inputParameters: z.record(z.string(), z.string()).optional().default({}),
  /** Language code (e.g., "en-US") */
  languageCode: z.string().optional().default("en-US"),
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

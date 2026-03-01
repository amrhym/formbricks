import { NextRequest } from "next/server";
import { logger } from "@hivecfm/logger";
import { TResponseData } from "@hivecfm/types/responses";
import { updateResponseWithQuotaEvaluation } from "@/app/api/v1/management/responses/[responseId]/lib/response";
import { createResponseWithQuotaEvaluation } from "@/app/api/v1/management/responses/lib/response";
import { responses } from "@/app/lib/api/response";
import { TApiKeyAuthentication, withV1ApiWrapper } from "@/app/lib/api/with-api-logging";
import { sendToPipeline } from "@/app/lib/pipelines";
import { getSurvey } from "@/lib/survey/service";
import { hasPermission } from "@/modules/organization/settings/api-keys/lib/utils";
import { formatQuestionAsReply, isSupportedInChat, parseAnswer } from "../lib/question-formatter";
import { BOT_INTENTS, type TBotSessionState, type TBotState, ZBotConnectorRequest } from "../lib/types";

// ─── In-memory session store (keyed by botSessionId) ────────────────────────
// Genesys Bot Connector v1 uses botState for status ("MoreData"/"Complete"/"Failed"),
// NOT for storing session data. Session state must be managed server-side.

const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

interface SessionEntry {
  state: TBotSessionState;
  expiresAt: number;
}

const sessionStore = new Map<string, SessionEntry>();

function getSession(botSessionId: string): TBotSessionState | null {
  const entry = sessionStore.get(botSessionId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    sessionStore.delete(botSessionId);
    return null;
  }
  return entry.state;
}

function setSession(botSessionId: string, state: TBotSessionState): void {
  sessionStore.set(botSessionId, { state, expiresAt: Date.now() + SESSION_TTL_MS });
}

function deleteSession(botSessionId: string): void {
  sessionStore.delete(botSessionId);
}

// Periodic cleanup of expired sessions (every 10 minutes)
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of sessionStore) {
      if (now > entry.expiresAt) sessionStore.delete(key);
    }
  },
  10 * 60 * 1000
);

// ─── Helper: strip HTML tags for plain text chat ────────────────────────────

function stripHtmlTags(html: string): string {
  const result = html.replace(/<[^>]*>/g, "");
  return result.trim();
}

// ─── Helper: extract elements from blocks (questions migrated to blocks) ────

function getElementsFromSurvey(survey: any): any[] {
  // New format: questions live inside blocks[].elements[]
  if (survey.blocks && Array.isArray(survey.blocks) && survey.blocks.length > 0) {
    return survey.blocks.flatMap((block: any) => block.elements || []);
  }
  // Legacy fallback: questions array directly on survey
  return survey.questions || [];
}

// ─── Opt-out keywords ───────────────────────────────────────────────────────

const OPT_OUT_KEYWORDS = new Set(["stop", "quit", "cancel", "unsubscribe", "opt out", "optout", "no thanks"]);

function isOptOut(utterance: string): boolean {
  return OPT_OUT_KEYWORDS.has(utterance.trim().toLowerCase());
}

// ─── Response builders ──────────────────────────────────────────────────────

function textReply(msg: string): Record<string, unknown> {
  // Genesys Bot Connector v1 uses lowercase "text" type for plain text messages
  return { type: "text", text: msg };
}

function botResponse(botState: TBotState, msgs: unknown[], intentName: string): Record<string, unknown> {
  const resp: Record<string, unknown> = {
    botState,
    intent: intentName,
    confidence: 1.0,
  };
  // Genesys Bot Connector v1 uses lowercase "replymessages" (not camelCase)
  resp["replymessages"] = msgs;
  return resp;
}

// ─── POST /api/v1/management/bot-connector/turn ─────────────────────────────

export const POST = withV1ApiWrapper({
  handler: async ({
    req,
    authentication,
  }: {
    req: NextRequest;
    authentication: NonNullable<TApiKeyAuthentication>;
  }) => {
    let jsonInput: unknown;
    try {
      jsonInput = await req.json();
    } catch {
      return {
        response: Response.json(
          botResponse("Failed", [textReply("Invalid request")], BOT_INTENTS.SURVEY_ERROR),
          {
            status: 400,
          }
        ),
      };
    }

    const parseResult = ZBotConnectorRequest.safeParse(jsonInput);
    if (!parseResult.success) {
      logger.warn({ errors: parseResult.error.issues }, "Invalid bot connector request");
      return {
        response: Response.json(
          botResponse("Failed", [textReply("Invalid request format")], BOT_INTENTS.SURVEY_ERROR),
          { status: 400 }
        ),
      };
    }

    const body = parseResult.data;
    const utterance = body.inputMessage?.text ?? "";
    const botSessionId = body.botSessionId;

    // Check if we have an existing session for this botSessionId
    const existingSession = getSession(botSessionId);
    const isFirstTurn = !existingSession;

    logger.warn(
      {
        botSessionId,
        isFirstTurn,
        utterance,
        questionIndex: existingSession?.currentQuestionIndex ?? 0,
        sessionExists: !!existingSession,
      },
      "Bot connector turn received"
    );

    try {
      if (isFirstTurn) {
        return await handleFirstTurn(body, utterance, authentication, botSessionId);
      } else {
        return await handleSubsequentTurn(body, utterance, authentication, botSessionId, existingSession);
      }
    } catch (error) {
      logger.error({ error: (error as Error).message, botSessionId }, "Bot connector handler error");
      return {
        response: Response.json(
          botResponse(
            "Failed",
            [textReply("An error occurred. Please try again later.")],
            BOT_INTENTS.SURVEY_ERROR
          ),
          { status: 500 }
        ),
      };
    }
  },
  action: "created",
  targetType: "response",
});

// ─── First Turn: Initialize survey ──────────────────────────────────────────

async function handleFirstTurn(
  body: ReturnType<typeof ZBotConnectorRequest.parse>,
  _utterance: string,
  authentication: NonNullable<TApiKeyAuthentication>,
  botSessionId: string
) {
  const surveyId = body.parameters?.surveyId;
  const environmentId = body.parameters?.environmentId;

  if (!surveyId) {
    return {
      response: Response.json(
        botResponse(
          "Failed",
          [textReply("Survey ID not provided. Pass surveyId in inputParameters.")],
          BOT_INTENTS.SURVEY_ERROR
        ),
        { status: 400 }
      ),
    };
  }

  if (!environmentId) {
    return {
      response: Response.json(
        botResponse(
          "Failed",
          [textReply("Environment ID not provided. Pass environmentId in inputParameters.")],
          BOT_INTENTS.SURVEY_ERROR
        ),
        { status: 400 }
      ),
    };
  }

  // Check permissions
  if (!hasPermission(authentication.environmentPermissions, environmentId, "POST")) {
    return { response: responses.unauthorizedResponse() };
  }

  // Fetch survey
  const survey = await getSurvey(surveyId);
  if (!survey) {
    return {
      response: Response.json(
        botResponse("Failed", [textReply("Survey not found")], BOT_INTENTS.SURVEY_ERROR),
        { status: 404 }
      ),
    };
  }

  if (survey.environmentId !== environmentId) {
    return {
      response: Response.json(
        botResponse(
          "Failed",
          [textReply("Survey does not belong to this environment")],
          BOT_INTENTS.SURVEY_ERROR
        ),
        { status: 400 }
      ),
    };
  }

  // Get questions/elements from survey (blocks format or legacy questions)
  const questions = getElementsFromSurvey(survey);
  const chatQuestions = questions.filter((q) => isSupportedInChat(q.type));

  if (chatQuestions.length === 0) {
    return {
      response: Response.json(
        botResponse(
          "Failed",
          [textReply("This survey has no chat-compatible questions")],
          BOT_INTENTS.SURVEY_ERROR
        ),
        { status: 400 }
      ),
    };
  }

  const language = body.languageCode?.split("-")[0] || "default";

  // Create response record in HiveCFM (finished: false)
  const hivecfmResponse = await createResponseWithQuotaEvaluation({
    environmentId,
    surveyId,
    finished: false,
    data: {},
    meta: {
      source: "genesys_bot_connector",
    },
  });

  sendToPipeline({
    event: "responseCreated",
    environmentId,
    surveyId,
    response: hivecfmResponse,
  });

  // Build session state and store server-side
  const sessionState: TBotSessionState = {
    responseId: hivecfmResponse.id,
    surveyId,
    environmentId,
    currentQuestionIndex: 0,
    questionIds: chatQuestions.map((q) => q.id),
    answers: {},
    genesysConversationId: body.genesysConversationId || body.parameters?.conversationId,
  };

  setSession(botSessionId, sessionState);

  // Return first question
  const firstQuestion = chatQuestions[0];
  const replyMsg = formatQuestionAsReply(firstQuestion, language);
  // Use q0 suffix to start the varying intent pattern
  const responseBody = botResponse("MoreData", [replyMsg], `${BOT_INTENTS.SURVEY_IN_PROGRESS}_q0`);

  logger.warn(
    { botSessionId, totalQuestions: chatQuestions.length, responseBody: JSON.stringify(responseBody) },
    "Bot connector first turn response"
  );

  return {
    response: Response.json(responseBody, { status: 200 }),
  };
}

// ─── Subsequent Turns: Process answer, return next question ─────────────────

async function handleSubsequentTurn(
  body: ReturnType<typeof ZBotConnectorRequest.parse>,
  utterance: string,
  authentication: NonNullable<TApiKeyAuthentication>,
  botSessionId: string,
  sessionState: TBotSessionState
) {
  const { surveyId, environmentId, responseId, questionIds } = sessionState;

  // Verify permissions
  if (!hasPermission(authentication.environmentPermissions, environmentId, "POST")) {
    return { response: responses.unauthorizedResponse() };
  }

  // Check for opt-out
  if (isOptOut(utterance)) {
    logger.warn({ responseId, utterance }, "Customer opted out via bot connector");
    deleteSession(botSessionId);
    return {
      response: Response.json(
        botResponse(
          "Complete",
          [textReply("No problem! You've been opted out. You won't receive further survey messages.")],
          BOT_INTENTS.SURVEY_OPTED_OUT
        ),
        { status: 200 }
      ),
    };
  }

  // Fetch survey for question metadata
  const survey = await getSurvey(surveyId);
  if (!survey) {
    deleteSession(botSessionId);
    return {
      response: Response.json(
        botResponse("Failed", [textReply("Survey no longer available")], BOT_INTENTS.SURVEY_ERROR),
        { status: 404 }
      ),
    };
  }

  const allQuestions = getElementsFromSurvey(survey);
  const language = body.languageCode?.split("-")[0] || "default";

  // Get current question
  const currentQuestionId = questionIds[sessionState.currentQuestionIndex];
  const currentQuestion = allQuestions.find((q) => q.id === currentQuestionId);

  if (!currentQuestion) {
    return await completeSurvey(sessionState, survey, botSessionId);
  }

  // Parse the answer
  const answer = parseAnswer(currentQuestion, utterance, language);
  sessionState.answers[currentQuestionId] = answer;

  // Move to next question
  sessionState.currentQuestionIndex += 1;

  // Check if there are more questions
  if (sessionState.currentQuestionIndex >= questionIds.length) {
    return await completeSurvey(sessionState, survey, botSessionId);
  }

  // Update session state in store
  setSession(botSessionId, sessionState);

  // Update HiveCFM response with answer so far (partial save)
  try {
    await updateResponseWithQuotaEvaluation(responseId, {
      data: sessionState.answers as TResponseData,
      finished: false,
    });
  } catch (error) {
    logger.warn({ error: (error as Error).message, responseId }, "Failed to save partial answer");
  }

  // Return next question
  const nextQuestionId = questionIds[sessionState.currentQuestionIndex];
  const nextQuestion = allQuestions.find((q) => q.id === nextQuestionId);

  if (!nextQuestion) {
    logger.warn(
      { botSessionId, questionIndex: sessionState.currentQuestionIndex },
      "No more questions, completing survey"
    );
    return await completeSurvey(sessionState, survey, botSessionId);
  }

  logger.warn(
    {
      botSessionId,
      questionIndex: sessionState.currentQuestionIndex,
      questionId: nextQuestionId,
      questionType: nextQuestion.type,
      totalQuestions: questionIds.length,
    },
    "Serving next question"
  );

  const replyMsg = formatQuestionAsReply(nextQuestion, language);
  // Vary the intent on each turn to avoid Genesys "unchanged intent" safety limit (4 consecutive same intents → Failure)
  const turnIntent = `${BOT_INTENTS.SURVEY_IN_PROGRESS}_q${sessionState.currentQuestionIndex}`;
  const responseBody = botResponse("MoreData", [replyMsg], turnIntent);

  logger.warn({ botSessionId, responseBody: JSON.stringify(responseBody) }, "Bot connector response body");

  return {
    response: Response.json(responseBody, { status: 200 }),
  };
}

// ─── Complete Survey ────────────────────────────────────────────────────────

async function completeSurvey(sessionState: TBotSessionState, survey: any, botSessionId: string) {
  const { responseId, environmentId, surveyId, answers } = sessionState;

  // Clean up session
  deleteSession(botSessionId);

  // Final update: mark response as finished with all answers
  try {
    const updatedResponse = await updateResponseWithQuotaEvaluation(responseId, {
      data: answers as TResponseData,
      finished: true,
    });

    sendToPipeline({
      event: "responseUpdated",
      environmentId,
      surveyId,
      response: updatedResponse,
    });

    sendToPipeline({
      event: "responseFinished",
      environmentId,
      surveyId,
      response: updatedResponse,
    });
  } catch (error) {
    logger.error({ error: (error as Error).message, responseId }, "Failed to finalize response in HiveCFM");
  }

  // Get thank you message from survey endings (strip HTML tags for plain text chat)
  let thankYouMessage = "Thank you for your feedback! Your responses have been recorded.";
  if (survey.endings && survey.endings.length > 0) {
    const ending = survey.endings[0];
    if (ending.headline) {
      const raw = typeof ending.headline === "string" ? ending.headline : ending.headline["default"];
      if (raw) thankYouMessage = stripHtmlTags(raw);
    }
  }

  return {
    response: Response.json(
      botResponse("Complete", [textReply(thankYouMessage)], BOT_INTENTS.SURVEY_COMPLETE),
      { status: 200 }
    ),
  };
}

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
import {
  BOT_INTENTS,
  type TBotConnectorResponse,
  type TBotReplyMessage,
  type TBotSessionState,
  ZBotConnectorRequest,
} from "../lib/types";

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

function textReply(text: string): TBotReplyMessage {
  return { type: "Structured", content: [{ contentType: "Text", text }] };
}

function botResponse(
  state: TBotSessionState | null,
  replyMessages: TBotReplyMessage[],
  intentName: string
): TBotConnectorResponse {
  return {
    botState: state ? JSON.stringify(state) : "",
    replyMessages,
    intent: { name: intentName, confidence: 1.0, slots: {} },
  };
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
        response: Response.json(botResponse(null, [textReply("Invalid request")], BOT_INTENTS.SURVEY_ERROR), {
          status: 400,
        }),
      };
    }

    // Debug: log the raw request from Genesys to understand the format
    logger.info({ rawBody: JSON.stringify(jsonInput) }, "Bot connector raw request body");

    const parseResult = ZBotConnectorRequest.safeParse(jsonInput);
    if (!parseResult.success) {
      logger.warn(
        { errors: parseResult.error.issues, rawBody: JSON.stringify(jsonInput) },
        "Invalid bot connector request"
      );
      return {
        response: Response.json(
          botResponse(null, [textReply("Invalid request format")], BOT_INTENTS.SURVEY_ERROR),
          { status: 400 }
        ),
      };
    }

    const body = parseResult.data;
    const isFirstTurn = !body.botState || body.botState === "" || body.botState === "{}";

    try {
      if (isFirstTurn) {
        return await handleFirstTurn(body, authentication);
      } else {
        return await handleSubsequentTurn(body, authentication);
      }
    } catch (error) {
      logger.error({ error: (error as Error).message }, "Bot connector handler error");
      return {
        response: Response.json(
          botResponse(
            null,
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
  authentication: NonNullable<TApiKeyAuthentication>
) {
  const surveyId = body.inputParameters?.surveyId;
  const environmentId = body.inputParameters?.environmentId;

  if (!surveyId) {
    return {
      response: Response.json(
        botResponse(
          null,
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
          null,
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
      response: Response.json(botResponse(null, [textReply("Survey not found")], BOT_INTENTS.SURVEY_ERROR), {
        status: 404,
      }),
    };
  }

  if (survey.environmentId !== environmentId) {
    return {
      response: Response.json(
        botResponse(
          null,
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
          null,
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

  // Build session state
  const sessionState: TBotSessionState = {
    responseId: hivecfmResponse.id,
    surveyId,
    environmentId,
    currentQuestionIndex: 0,
    questionIds: chatQuestions.map((q) => q.id),
    answers: {},
    genesysConversationId: body.inputParameters?.conversationId,
  };

  // Return first question
  const firstQuestion = chatQuestions[0];
  const replyMsg = formatQuestionAsReply(firstQuestion, language);

  return {
    response: Response.json(botResponse(sessionState, [replyMsg], BOT_INTENTS.SURVEY_IN_PROGRESS), {
      status: 200,
    }),
  };
}

// ─── Subsequent Turns: Process answer, return next question ─────────────────

async function handleSubsequentTurn(
  body: ReturnType<typeof ZBotConnectorRequest.parse>,
  authentication: NonNullable<TApiKeyAuthentication>
) {
  // Deserialize session state
  let sessionState: TBotSessionState;
  try {
    sessionState = JSON.parse(body.botState);
  } catch {
    return {
      response: Response.json(
        botResponse(null, [textReply("Invalid session state")], BOT_INTENTS.SURVEY_ERROR),
        { status: 400 }
      ),
    };
  }

  const { surveyId, environmentId, responseId, questionIds } = sessionState;

  // Verify permissions
  if (!hasPermission(authentication.environmentPermissions, environmentId, "POST")) {
    return { response: responses.unauthorizedResponse() };
  }

  // Check for opt-out
  if (isOptOut(body.utterance)) {
    logger.info({ responseId, utterance: body.utterance }, "Customer opted out via bot connector");
    return {
      response: Response.json(
        botResponse(
          sessionState,
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
    return {
      response: Response.json(
        botResponse(null, [textReply("Survey no longer available")], BOT_INTENTS.SURVEY_ERROR),
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
    // No more questions - this shouldn't happen but handle gracefully
    return await completeSurvey(sessionState, survey, authentication);
  }

  // Parse the answer
  const answer = parseAnswer(currentQuestion, body.utterance, language);
  sessionState.answers[currentQuestionId] = answer;

  // Move to next question
  sessionState.currentQuestionIndex += 1;

  // Check if there are more questions
  if (sessionState.currentQuestionIndex >= questionIds.length) {
    // All questions answered - complete the survey
    return await completeSurvey(sessionState, survey, authentication);
  }

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
    return await completeSurvey(sessionState, survey, authentication);
  }

  const replyMsg = formatQuestionAsReply(nextQuestion, language);

  return {
    response: Response.json(botResponse(sessionState, [replyMsg], BOT_INTENTS.SURVEY_IN_PROGRESS), {
      status: 200,
    }),
  };
}

// ─── Complete Survey ────────────────────────────────────────────────────────

async function completeSurvey(
  sessionState: TBotSessionState,
  survey: any,
  _authentication: NonNullable<TApiKeyAuthentication>
) {
  const { responseId, environmentId, surveyId, answers } = sessionState;

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

  // Get thank you message from survey endings
  let thankYouMessage = "Thank you for your feedback! Your responses have been recorded.";
  if (survey.endings && survey.endings.length > 0) {
    const ending = survey.endings[0];
    if (ending.headline) {
      const text = typeof ending.headline === "string" ? ending.headline : ending.headline["default"];
      if (text) thankYouMessage = text;
    }
  }

  return {
    response: Response.json(
      botResponse(sessionState, [textReply(thankYouMessage)], BOT_INTENTS.SURVEY_COMPLETE),
      { status: 200 }
    ),
  };
}

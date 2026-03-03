import { NextRequest } from "next/server";
import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";
import { TResponseData } from "@hivecfm/types/responses";
import { updateResponseWithQuotaEvaluation } from "@/app/api/v1/management/responses/[responseId]/lib/response";
import { sendToPipeline } from "@/app/lib/pipelines";
import { formatQuestionForSms, parseAnswer } from "@/lib/campaign/sms-formatter";
import { deleteSmsSession, getSmsSession, setSmsSession } from "@/lib/campaign/sms-session";
import { sendSmsMessage } from "@/lib/novu/service";
import { getSurvey } from "@/lib/survey/service";

// ─── Helper: extract elements from blocks (questions migrated to blocks) ────

function getElementsFromSurvey(survey: any): any[] {
  if (survey.blocks && Array.isArray(survey.blocks) && survey.blocks.length > 0) {
    return survey.blocks.flatMap((block: any) => block.elements || []);
  }
  return survey.questions || [];
}

// ─── Helper: strip HTML tags for plain text ────────────────────────────────

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

// ─── POST /api/v1/novu/sms-inbound ─────────────────────────────────────────

export const POST = async (req: NextRequest) => {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Extract phone number and message text from the webhook payload.
  // Support various possible Novu inbound formats:
  //   { subscriberId, payload: { message } }
  //   { phone, message }
  //   { from, text }
  //   { subscriber: { subscriberId }, payload: { message } }
  const phone =
    body.subscriberId ||
    body.phone ||
    body.from ||
    body.subscriber?.subscriberId ||
    body.payload?.phone ||
    null;

  const messageText =
    body.payload?.message || body.message || body.text || body.payload?.text || body.payload?.body || null;

  if (!phone || !messageText) {
    logger.warn({ body }, "SMS inbound webhook: missing phone or message");
    return Response.json({ ignored: true, reason: "Missing phone or message" }, { status: 200 });
  }

  // Look up active SMS session by phone number
  const session = getSmsSession(phone);

  if (!session) {
    logger.info({ phone }, "SMS inbound: no active session for phone number");
    return Response.json({ ignored: true }, { status: 200 });
  }

  const { campaignSendId, surveyId, environmentId, responseId, currentQuestionIndex, questionIds, answers } =
    session;

  try {
    // Fetch survey to get question metadata
    const survey = await getSurvey(surveyId);
    if (!survey) {
      logger.error({ surveyId }, "SMS inbound: survey not found");
      deleteSmsSession(phone);
      return Response.json({ error: "Survey not found" }, { status: 200 });
    }

    const allQuestions = getElementsFromSurvey(survey);

    // Get current question
    const currentQuestionId = questionIds[currentQuestionIndex];
    const currentQuestion = allQuestions.find((q: any) => q.id === currentQuestionId);

    if (!currentQuestion) {
      logger.warn({ phone, currentQuestionIndex }, "SMS inbound: current question not found");
      deleteSmsSession(phone);
      return Response.json({ error: "Question not found" }, { status: 200 });
    }

    // Parse the answer from the SMS text
    const answer = parseAnswer(currentQuestion, messageText);

    // Save answer to session state
    answers[currentQuestionId] = answer;

    // Update response with the answer so far
    try {
      await updateResponseWithQuotaEvaluation(responseId, {
        data: answers as TResponseData,
        finished: false,
      });
    } catch (error) {
      logger.warn(
        { error: error instanceof Error ? error.message : String(error), responseId },
        "SMS inbound: failed to save partial answer"
      );
    }

    // Advance to next question
    const nextIndex = currentQuestionIndex + 1;

    if (nextIndex < questionIds.length) {
      // More questions: format and send the next one
      const nextQuestionId = questionIds[nextIndex];
      const nextQuestion = allQuestions.find((q: any) => q.id === nextQuestionId);

      if (!nextQuestion) {
        // No more valid questions - complete the survey
        await completeSmsSession(
          phone,
          session,
          answers,
          survey,
          environmentId,
          surveyId,
          responseId,
          campaignSendId
        );
        return Response.json({ success: true, completed: true }, { status: 200 });
      }

      const nextQuestionText = formatQuestionForSms(nextQuestion);
      await sendSmsMessage(environmentId, phone, nextQuestionText);

      // Update session with new state
      setSmsSession(phone, {
        ...session,
        currentQuestionIndex: nextIndex,
        answers,
      });

      return Response.json({ success: true, nextQuestion: nextIndex }, { status: 200 });
    } else {
      // All questions answered - complete the survey
      await completeSmsSession(
        phone,
        session,
        answers,
        survey,
        environmentId,
        surveyId,
        responseId,
        campaignSendId
      );
      return Response.json({ success: true, completed: true }, { status: 200 });
    }
  } catch (error) {
    logger.error(
      { phone, error: error instanceof Error ? error.message : String(error) },
      "SMS inbound: error processing message"
    );
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
};

// ─── Complete SMS Survey Session ────────────────────────────────────────────

async function completeSmsSession(
  phone: string,
  _session: ReturnType<typeof getSmsSession> & {},
  answers: Record<string, unknown>,
  survey: any,
  environmentId: string,
  surveyId: string,
  responseId: string,
  campaignSendId: string
): Promise<void> {
  // Mark response as finished with all answers
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
    logger.error(
      { error: error instanceof Error ? error.message : String(error), responseId },
      "SMS inbound: failed to finalize response"
    );
  }

  // Send thank-you message
  let thankYouMessage = "Thank you for your feedback! Your responses have been recorded.";
  if (survey.endings && survey.endings.length > 0) {
    const ending = survey.endings[0];
    if (ending.headline) {
      const raw = typeof ending.headline === "string" ? ending.headline : ending.headline["default"];
      if (raw) thankYouMessage = stripHtmlTags(raw);
    }
  }

  try {
    await sendSmsMessage(environmentId, phone, thankYouMessage);
  } catch (error) {
    logger.warn(
      { error: error instanceof Error ? error.message : String(error), phone },
      "SMS inbound: failed to send thank-you message"
    );
  }

  // Update CampaignSend status to "sent"
  try {
    await prisma.campaignSend.update({
      where: { id: campaignSendId },
      data: {
        status: "sent",
        sentAt: new Date(),
      },
    });
  } catch (error) {
    logger.warn(
      { error: error instanceof Error ? error.message : String(error), campaignSendId },
      "SMS inbound: failed to update campaign send status"
    );
  }

  // Clean up session
  deleteSmsSession(phone);
}

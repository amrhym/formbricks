import "server-only";
import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";
import { ResourceNotFoundError } from "@hivecfm/types/errors";
import { createResponseWithQuotaEvaluation } from "@/app/api/v1/management/responses/lib/response";
import { formatQuestionForSms, isSupportedInChat } from "@/lib/campaign/sms-formatter";
import { setSmsSession } from "@/lib/campaign/sms-session";
import { createEmailWorkflow, sendSmsMessage, triggerWorkflow } from "@/lib/novu/service";
import { getProjectByEnvironmentId } from "@/lib/project/service";
import { getSurvey } from "@/lib/survey/service";
import { getStyling } from "@/lib/utils/styling";
import { getTranslate } from "@/lingodotdev/server";
import { getContactSurveyLink } from "@/modules/ee/contacts/lib/contact-survey-link";
import { getContactsInSegment } from "@/modules/ee/contacts/lib/contacts";
import { getPreviewEmailTemplateHtml } from "@/modules/email/components/preview-email-template";

const BATCH_SIZE = 5;

// ─── Helper: extract elements from blocks (questions migrated to blocks) ────

function getElementsFromSurvey(survey: any): any[] {
  if (survey.blocks && Array.isArray(survey.blocks) && survey.blocks.length > 0) {
    return survey.blocks.flatMap((block: any) => block.elements || []);
  }
  return survey.questions || [];
}

// ─── Email Campaign Flow ────────────────────────────────────────────────────

async function sendEmailCampaign(campaignId: string): Promise<void> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      survey: true,
      segment: true,
    },
  });

  if (!campaign) {
    throw new ResourceNotFoundError("Campaign", campaignId);
  }

  if (campaign.status !== "draft" && campaign.status !== "scheduled") {
    throw new Error("Campaign has already been sent or is currently sending");
  }

  if (!campaign.segmentId) {
    throw new Error("Campaign has no segment assigned");
  }

  // Fetch contacts in segment
  const contacts = await getContactsInSegment(campaign.segmentId);

  if (!contacts || contacts.length === 0) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "failed" },
    });
    throw new Error("No contacts found in segment");
  }

  // Filter contacts with email
  const contactsWithEmail = contacts.filter((c) => c.attributes.email);

  if (contactsWithEmail.length === 0) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "failed" },
    });
    throw new Error("No contacts with email addresses found in segment");
  }

  // Get survey and project for email template
  const survey = await getSurvey(campaign.surveyId);
  if (!survey) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "failed" },
    });
    throw new Error("Survey not found");
  }

  const project = await getProjectByEnvironmentId(campaign.environmentId);
  if (!project) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "failed" },
    });
    throw new Error("Project not found");
  }

  // Auto-set subject from survey name if not explicitly set
  const subject = campaign.subject || survey.name;

  const styling = getStyling(project, survey);
  const t = await getTranslate();

  // Generate email HTML (use a placeholder URL; the actual link is per-contact but the
  // Novu workflow is created once with the template HTML).
  const emailHtml = await getPreviewEmailTemplateHtml(survey, "{{payload.surveyUrl}}", styling, "default", t);

  // Create Novu email workflow with the HTML content
  const workflowName = `campaign-${campaignId}`;
  const novuWorkflowId = await createEmailWorkflow(campaign.environmentId, workflowName, subject, emailHtml);

  // Store novuWorkflowId on campaign
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      novuWorkflowId,
      subject,
      status: "sending",
      totalCount: contactsWithEmail.length,
    },
  });

  let sentCount = 0;
  let failedCount = 0;

  // Process contacts in batches
  for (let i = 0; i < contactsWithEmail.length; i += BATCH_SIZE) {
    const batch = contactsWithEmail.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (contact) => {
        try {
          // Generate personalized survey link
          const surveyLinkResult = await getContactSurveyLink(contact.contactId, campaign.surveyId);

          if (!surveyLinkResult.ok) {
            logger.error(
              { error: surveyLinkResult.error, contactId: contact.contactId },
              "Failed to generate survey link for campaign send"
            );
            failedCount++;
            await prisma.campaignSend.create({
              data: {
                campaignId,
                contactId: contact.contactId,
                recipient: contact.attributes.email,
                status: "failed",
                error: "Failed to generate survey link",
              },
            });
            return;
          }

          const surveyUrl = surveyLinkResult.data;

          // Create CampaignSend record
          await prisma.campaignSend.create({
            data: {
              campaignId,
              contactId: contact.contactId,
              recipient: contact.attributes.email,
              status: "pending",
            },
          });

          // Trigger Novu workflow for this subscriber (use email as subscriberId)
          await triggerWorkflow(
            campaign.environmentId,
            novuWorkflowId,
            contact.attributes.email,
            { surveyUrl },
            { email: contact.attributes.email }
          );

          sentCount++;
          await prisma.campaignSend.updateMany({
            where: { campaignId, contactId: contact.contactId },
            data: {
              status: "sent",
              sentAt: new Date(),
            },
          });
        } catch (error) {
          failedCount++;
          logger.error(error, `Failed to send campaign email to ${contact.attributes.email}`);
          await prisma.campaignSend.updateMany({
            where: { campaignId, contactId: contact.contactId },
            data: {
              status: "failed",
              error: error instanceof Error ? error.message : "Unknown error",
            },
          });
        }
      })
    );
  }

  // Update campaign final status
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: failedCount === contactsWithEmail.length ? "failed" : "sent",
      sentAt: new Date(),
      sentCount,
      failedCount,
    },
  });
}

// ─── SMS Campaign Flow ──────────────────────────────────────────────────────

async function sendSmsCampaign(campaignId: string): Promise<void> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      survey: true,
      segment: true,
    },
  });

  if (!campaign) {
    throw new ResourceNotFoundError("Campaign", campaignId);
  }

  if (campaign.status !== "draft" && campaign.status !== "scheduled") {
    throw new Error("Campaign has already been sent or is currently sending");
  }

  if (!campaign.segmentId) {
    throw new Error("Campaign has no segment assigned");
  }

  // Fetch survey
  const survey = await getSurvey(campaign.surveyId);
  if (!survey) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "failed" },
    });
    throw new Error("Survey not found");
  }

  // Extract questions and filter to chat-supported types
  const allQuestions = getElementsFromSurvey(survey);
  const chatQuestions = allQuestions.filter((q) => isSupportedInChat(q.type));

  if (chatQuestions.length === 0) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "failed" },
    });
    throw new Error("Survey has no SMS-compatible questions");
  }

  // Fetch contacts in segment
  const contacts = await getContactsInSegment(campaign.segmentId);

  if (!contacts || contacts.length === 0) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "failed" },
    });
    throw new Error("No contacts found in segment");
  }

  // Filter contacts that have a phone attribute
  const contactsWithPhone = contacts.filter((c) => c.attributes.phone);

  if (contactsWithPhone.length === 0) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "failed" },
    });
    throw new Error("No contacts with phone numbers found in segment");
  }

  // Update campaign status to sending
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: "sending",
      totalCount: contactsWithPhone.length,
    },
  });

  let sentCount = 0;
  let failedCount = 0;

  for (const contact of contactsWithPhone) {
    const phone = contact.attributes.phone;

    try {
      // Create CampaignSend record with recipient = phone
      const campaignSend = await prisma.campaignSend.create({
        data: {
          campaignId,
          contactId: contact.contactId,
          recipient: phone,
          status: "pending",
        },
      });

      // Create HiveCFM response (partial, finished: false)
      const hivecfmResponse = await createResponseWithQuotaEvaluation({
        environmentId: campaign.environmentId,
        surveyId: campaign.surveyId,
        finished: false,
        data: {},
        meta: {
          source: "sms_campaign",
        },
      });

      // Initialize SMS session
      setSmsSession(phone, {
        campaignSendId: campaignSend.id,
        campaignId,
        surveyId: campaign.surveyId,
        environmentId: campaign.environmentId,
        contactId: contact.contactId,
        subscriberId: phone,
        currentQuestionIndex: 0,
        questionIds: chatQuestions.map((q) => q.id),
        answers: {},
        responseId: hivecfmResponse.id,
      });

      // Format and send the first question
      const firstQuestionText = formatQuestionForSms(chatQuestions[0]);
      await sendSmsMessage(campaign.environmentId, phone, firstQuestionText);

      sentCount++;
      await prisma.campaignSend.update({
        where: { id: campaignSend.id },
        data: {
          status: "sent",
          sentAt: new Date(),
        },
      });
    } catch (error) {
      failedCount++;
      logger.error(error, `Failed to send SMS campaign to ${phone}`);
      await prisma.campaignSend.updateMany({
        where: { campaignId, contactId: contact.contactId },
        data: {
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  }

  // Update campaign final status
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: failedCount === contactsWithPhone.length ? "failed" : "sent",
      sentAt: new Date(),
      sentCount,
      failedCount,
    },
  });
}

// ─── Public API ─────────────────────────────────────────────────────────────

export const sendCampaign = async (campaignId: string): Promise<void> => {
  // Fetch the campaign to determine provider type
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { providerType: true },
  });

  if (!campaign) {
    throw new ResourceNotFoundError("Campaign", campaignId);
  }

  switch (campaign.providerType) {
    case "email":
      return sendEmailCampaign(campaignId);
    case "sms":
      return sendSmsCampaign(campaignId);
    default:
      throw new Error(`Unsupported campaign provider type: ${campaign.providerType}`);
  }
};

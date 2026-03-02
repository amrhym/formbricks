import "server-only";
import { prisma } from "@hivecfm/database";
import { logger } from "@hivecfm/logger";
import { ResourceNotFoundError } from "@hivecfm/types/errors";
import { getProjectByEnvironmentId } from "@/lib/project/service";
import { getSurvey } from "@/lib/survey/service";
import { getStyling } from "@/lib/utils/styling";
import { getTranslate } from "@/lingodotdev/server";
import { getContactSurveyLink } from "@/modules/ee/contacts/lib/contact-survey-link";
import { getContactsInSegment } from "@/modules/ee/contacts/lib/contacts";
import { getPreviewEmailTemplateHtml } from "@/modules/email/components/preview-email-template";
import { sendEmail } from "@/modules/email/index";

const BATCH_SIZE = 5;

export const sendCampaign = async (campaignId: string): Promise<void> => {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      channel: true,
    },
  });

  if (!campaign) {
    throw new ResourceNotFoundError("Campaign", campaignId);
  }

  if (campaign.status !== "draft") {
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

  // Create CampaignSend records
  await prisma.campaignSend.createMany({
    data: contactsWithEmail.map((contact) => ({
      campaignId,
      contactId: contact.contactId,
      email: contact.attributes.email,
    })),
  });

  // Update campaign status to sending
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: "sending",
      totalCount: contactsWithEmail.length,
    },
  });

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

  const styling = getStyling(project, survey);
  const t = await getTranslate();

  let sentCount = 0;
  let failedCount = 0;

  // Process in batches
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
            await prisma.campaignSend.updateMany({
              where: { campaignId, contactId: contact.contactId },
              data: {
                status: "failed",
                error: "Failed to generate survey link",
              },
            });
            return;
          }

          const surveyUrl = surveyLinkResult.data;

          // Render email HTML
          const html = await getPreviewEmailTemplateHtml(survey, surveyUrl, styling, "default", t);

          // Send email
          const emailSent = await sendEmail({
            to: contact.attributes.email,
            subject: campaign.subject,
            html,
          });

          if (emailSent) {
            sentCount++;
            await prisma.campaignSend.updateMany({
              where: { campaignId, contactId: contact.contactId },
              data: {
                status: "sent",
                sentAt: new Date(),
              },
            });
          } else {
            failedCount++;
            await prisma.campaignSend.updateMany({
              where: { campaignId, contactId: contact.contactId },
              data: {
                status: "failed",
                error: "Email sending returned false",
              },
            });
          }
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
};

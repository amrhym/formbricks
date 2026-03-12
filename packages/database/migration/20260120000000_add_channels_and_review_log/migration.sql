-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('web', 'mobile', 'link', 'email');

-- CreateTable
CREATE TABLE "channels" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ChannelType" NOT NULL,
    "description" TEXT,
    "environment_id" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- AddColumn
ALTER TABLE "Survey" ADD COLUMN "channel_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "channels_environment_id_name_key" ON "channels"("environment_id", "name");

-- CreateIndex
CREATE INDEX "channels_environment_id_idx" ON "channels"("environment_id");

-- CreateIndex
CREATE INDEX "Survey_channel_id_idx" ON "Survey"("channel_id");

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "Environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "SurveyReviewAction" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'RESUBMITTED');

-- AddColumns
ALTER TABLE "Survey" ADD COLUMN "reviewNote" TEXT;
ALTER TABLE "Survey" ADD COLUMN "reviewedBy" TEXT;
ALTER TABLE "Survey" ADD COLUMN "reviewedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SurveyReviewLog" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "SurveyReviewAction" NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyReviewLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SurveyReviewLog_surveyId_idx" ON "SurveyReviewLog"("surveyId");

-- CreateIndex
CREATE INDEX "SurveyReviewLog_userId_idx" ON "SurveyReviewLog"("userId");

-- AddForeignKey
ALTER TABLE "SurveyReviewLog" ADD CONSTRAINT "SurveyReviewLog_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyReviewLog" ADD CONSTRAINT "SurveyReviewLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'sending', 'sent', 'failed');

-- CreateEnum
CREATE TYPE "CampaignSendStatus" AS ENUM ('pending', 'sent', 'failed', 'bounced');

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'draft',
    "subject" TEXT NOT NULL,
    "channel_id" TEXT,
    "survey_id" TEXT NOT NULL,
    "segment_id" TEXT,
    "environment_id" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3),
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "total_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignSend" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "campaign_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "CampaignSendStatus" NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "CampaignSend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Campaign_environment_id_idx" ON "Campaign"("environment_id");

-- CreateIndex
CREATE INDEX "Campaign_survey_id_idx" ON "Campaign"("survey_id");

-- CreateIndex
CREATE INDEX "CampaignSend_campaign_id_idx" ON "CampaignSend"("campaign_id");

-- CreateIndex
CREATE INDEX "CampaignSend_contact_id_idx" ON "CampaignSend"("contact_id");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "Segment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "Environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignSend" ADD CONSTRAINT "CampaignSend_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignSend" ADD CONSTRAINT "CampaignSend_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

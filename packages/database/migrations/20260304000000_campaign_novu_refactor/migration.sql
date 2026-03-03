-- Add scheduled to CampaignStatus
ALTER TYPE "CampaignStatus" ADD VALUE 'scheduled';

-- Remove channel FK from campaigns
ALTER TABLE "Campaign" DROP CONSTRAINT IF EXISTS "Campaign_channel_id_fkey";
ALTER TABLE "Campaign" DROP COLUMN IF EXISTS "channel_id";

-- Add new Novu columns
ALTER TABLE "Campaign" ADD COLUMN "provider_type" TEXT NOT NULL DEFAULT 'email';
ALTER TABLE "Campaign" ADD COLUMN "novu_workflow_id" TEXT;
ALTER TABLE "Campaign" ADD COLUMN "scheduled_at" TIMESTAMP(3);

-- Rename email to recipient in CampaignSend
ALTER TABLE "CampaignSend" RENAME COLUMN "email" TO "recipient";

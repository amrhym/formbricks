-- AlterEnum
ALTER TYPE "SurveyType" ADD VALUE 'voice';

-- AlterEnum
ALTER TYPE "ChannelType" ADD VALUE IF NOT EXISTS 'voice';

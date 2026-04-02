-- Add n8n credential ID column to Organization
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "n8n_credential_id" TEXT;

-- Add cryptographic signature column to tenant_license for tamper protection
ALTER TABLE "tenant_license" ADD COLUMN "license_signature" TEXT;

-- Comment explaining the column
COMMENT ON COLUMN "tenant_license"."license_signature" IS 'Ed25519 signature of license data. Set by license portal. Verified by core app. If NULL or invalid, license is treated as unsigned (grace period for migration).';

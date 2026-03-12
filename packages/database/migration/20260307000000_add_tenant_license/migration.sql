-- CreateTable
CREATE TABLE "tenant_license" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "license_key" TEXT NOT NULL,
    "max_completed_responses" INTEGER NOT NULL DEFAULT 10000,
    "max_users" INTEGER NOT NULL DEFAULT 10,
    "addon_ai_insights" BOOLEAN NOT NULL DEFAULT false,
    "addon_campaign_management" BOOLEAN NOT NULL DEFAULT false,
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_license_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_license_organization_id_key" ON "tenant_license"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_license_license_key_key" ON "tenant_license"("license_key");

-- AddForeignKey
ALTER TABLE "tenant_license" ADD CONSTRAINT "tenant_license_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

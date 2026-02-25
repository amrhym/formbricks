-- CreateTable
CREATE TABLE "tenant_quota" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "maxSurveys" INTEGER NOT NULL DEFAULT 100,
    "max_responses_per_month" INTEGER NOT NULL DEFAULT 10000,
    "max_storage_mb" INTEGER NOT NULL DEFAULT 5120,
    "max_api_calls_per_day" INTEGER NOT NULL DEFAULT 50000,
    "max_contacts" INTEGER NOT NULL DEFAULT 50000,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_quota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_branding" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "logo_url" TEXT,
    "favicon_url" TEXT,
    "primary_color" TEXT NOT NULL DEFAULT '#0F172A',
    "accent_color" TEXT NOT NULL DEFAULT '#3B82F6',
    "custom_css" TEXT,
    "email_header_html" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_branding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_provisioning_log" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_provisioning_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "superset_dashboard_id" TEXT NOT NULL,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "n8n_workflow" JSONB NOT NULL,
    "event_type" TEXT NOT NULL,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_quota_organizationId_key" ON "tenant_quota"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_branding_organizationId_key" ON "organization_branding"("organizationId");

-- CreateIndex
CREATE INDEX "tenant_provisioning_log_organizationId_created_at_idx" ON "tenant_provisioning_log"("organizationId", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_template_name_key" ON "dashboard_template"("name");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_template_name_key" ON "workflow_template"("name");

-- AddForeignKey
ALTER TABLE "tenant_quota" ADD CONSTRAINT "tenant_quota_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_branding" ADD CONSTRAINT "organization_branding_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_provisioning_log" ADD CONSTRAINT "tenant_provisioning_log_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

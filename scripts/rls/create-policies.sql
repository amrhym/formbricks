-- Create RLS Policies for Multi-Tenant Isolation
-- Pattern: tenant_isolation_{table_name_lowercase}
-- Backward-compatible: allows all rows when app.current_tenant is not set
-- Idempotent: DROP POLICY IF EXISTS before CREATE

-- ============================================================
-- Helper: Environment → Project → Organization join subquery
-- Used by all environmentId-scoped tables
-- ============================================================

-- Contact (environmentId)
DROP POLICY IF EXISTS tenant_isolation_contact ON "Contact";
CREATE POLICY tenant_isolation_contact ON "Contact"
  USING (
    current_setting('app.current_tenant', true) IS NULL
    OR "environmentId" IN (
      SELECT e.id FROM "Environment" e
      JOIN "Project" p ON e."projectId" = p.id
      WHERE p."organizationId" = current_setting('app.current_tenant', true)
    )
  );

-- ContactAttribute (via ContactAttributeKey → Environment → Project → Organization)
DROP POLICY IF EXISTS tenant_isolation_contact_attribute ON "ContactAttribute";
CREATE POLICY tenant_isolation_contact_attribute ON "ContactAttribute"
  USING (
    current_setting('app.current_tenant', true) IS NULL
    OR "contactAttributeKeyId" IN (
      SELECT cak.id FROM "ContactAttributeKey" cak
      JOIN "Environment" e ON cak."environmentId" = e.id
      JOIN "Project" p ON e."projectId" = p.id
      WHERE p."organizationId" = current_setting('app.current_tenant', true)
    )
  );

-- ContactAttributeKey (environmentId)
DROP POLICY IF EXISTS tenant_isolation_contact_attribute_key ON "ContactAttributeKey";
CREATE POLICY tenant_isolation_contact_attribute_key ON "ContactAttributeKey"
  USING (
    current_setting('app.current_tenant', true) IS NULL
    OR "environmentId" IN (
      SELECT e.id FROM "Environment" e
      JOIN "Project" p ON e."projectId" = p.id
      WHERE p."organizationId" = current_setting('app.current_tenant', true)
    )
  );

-- Survey (environmentId)
DROP POLICY IF EXISTS tenant_isolation_survey ON "Survey";
CREATE POLICY tenant_isolation_survey ON "Survey"
  USING (
    current_setting('app.current_tenant', true) IS NULL
    OR "environmentId" IN (
      SELECT e.id FROM "Environment" e
      JOIN "Project" p ON e."projectId" = p.id
      WHERE p."organizationId" = current_setting('app.current_tenant', true)
    )
  );

-- Response (via Survey → Environment → Project → Organization)
DROP POLICY IF EXISTS tenant_isolation_response ON "Response";
CREATE POLICY tenant_isolation_response ON "Response"
  USING (
    current_setting('app.current_tenant', true) IS NULL
    OR "surveyId" IN (
      SELECT s.id FROM "Survey" s
      JOIN "Environment" e ON s."environmentId" = e.id
      JOIN "Project" p ON e."projectId" = p.id
      WHERE p."organizationId" = current_setting('app.current_tenant', true)
    )
  );

-- Display (via Survey → Environment → Project → Organization)
DROP POLICY IF EXISTS tenant_isolation_display ON "Display";
CREATE POLICY tenant_isolation_display ON "Display"
  USING (
    current_setting('app.current_tenant', true) IS NULL
    OR "surveyId" IN (
      SELECT s.id FROM "Survey" s
      JOIN "Environment" e ON s."environmentId" = e.id
      JOIN "Project" p ON e."projectId" = p.id
      WHERE p."organizationId" = current_setting('app.current_tenant', true)
    )
  );

-- ActionClass (environmentId)
DROP POLICY IF EXISTS tenant_isolation_action_class ON "ActionClass";
CREATE POLICY tenant_isolation_action_class ON "ActionClass"
  USING (
    current_setting('app.current_tenant', true) IS NULL
    OR "environmentId" IN (
      SELECT e.id FROM "Environment" e
      JOIN "Project" p ON e."projectId" = p.id
      WHERE p."organizationId" = current_setting('app.current_tenant', true)
    )
  );

-- Webhook (environmentId)
DROP POLICY IF EXISTS tenant_isolation_webhook ON "Webhook";
CREATE POLICY tenant_isolation_webhook ON "Webhook"
  USING (
    current_setting('app.current_tenant', true) IS NULL
    OR "environmentId" IN (
      SELECT e.id FROM "Environment" e
      JOIN "Project" p ON e."projectId" = p.id
      WHERE p."organizationId" = current_setting('app.current_tenant', true)
    )
  );

-- Channel (via Survey → Environment → Project → Organization)
DROP POLICY IF EXISTS tenant_isolation_channel ON "Channel";
CREATE POLICY tenant_isolation_channel ON "Channel"
  USING (
    current_setting('app.current_tenant', true) IS NULL
    OR "surveyId" IN (
      SELECT s.id FROM "Survey" s
      JOIN "Environment" e ON s."environmentId" = e.id
      JOIN "Project" p ON e."projectId" = p.id
      WHERE p."organizationId" = current_setting('app.current_tenant', true)
    )
  );

-- Integration (environmentId)
DROP POLICY IF EXISTS tenant_isolation_integration ON "Integration";
CREATE POLICY tenant_isolation_integration ON "Integration"
  USING (
    current_setting('app.current_tenant', true) IS NULL
    OR "environmentId" IN (
      SELECT e.id FROM "Environment" e
      JOIN "Project" p ON e."projectId" = p.id
      WHERE p."organizationId" = current_setting('app.current_tenant', true)
    )
  );

-- Segment (environmentId)
DROP POLICY IF EXISTS tenant_isolation_segment ON "Segment";
CREATE POLICY tenant_isolation_segment ON "Segment"
  USING (
    current_setting('app.current_tenant', true) IS NULL
    OR "environmentId" IN (
      SELECT e.id FROM "Environment" e
      JOIN "Project" p ON e."projectId" = p.id
      WHERE p."organizationId" = current_setting('app.current_tenant', true)
    )
  );

-- Tag (environmentId)
DROP POLICY IF EXISTS tenant_isolation_tag ON "Tag";
CREATE POLICY tenant_isolation_tag ON "Tag"
  USING (
    current_setting('app.current_tenant', true) IS NULL
    OR "environmentId" IN (
      SELECT e.id FROM "Environment" e
      JOIN "Project" p ON e."projectId" = p.id
      WHERE p."organizationId" = current_setting('app.current_tenant', true)
    )
  );

-- ============================================================
-- Direct organizationId tables (simpler RLS)
-- ============================================================

-- Project (organizationId)
DROP POLICY IF EXISTS tenant_isolation_project ON "Project";
CREATE POLICY tenant_isolation_project ON "Project"
  USING (
    current_setting('app.current_tenant', true) IS NULL
    OR "organizationId" = current_setting('app.current_tenant', true)
  );

-- Membership (organizationId)
DROP POLICY IF EXISTS tenant_isolation_membership ON "Membership";
CREATE POLICY tenant_isolation_membership ON "Membership"
  USING (
    current_setting('app.current_tenant', true) IS NULL
    OR "organizationId" = current_setting('app.current_tenant', true)
  );

-- Team (organizationId)
DROP POLICY IF EXISTS tenant_isolation_team ON "Team";
CREATE POLICY tenant_isolation_team ON "Team"
  USING (
    current_setting('app.current_tenant', true) IS NULL
    OR "organizationId" = current_setting('app.current_tenant', true)
  );

-- ApiKey (organizationId)
DROP POLICY IF EXISTS tenant_isolation_api_key ON "ApiKey";
CREATE POLICY tenant_isolation_api_key ON "ApiKey"
  USING (
    current_setting('app.current_tenant', true) IS NULL
    OR "organizationId" = current_setting('app.current_tenant', true)
  );

-- Invite (organizationId)
DROP POLICY IF EXISTS tenant_isolation_invite ON "Invite";
CREATE POLICY tenant_isolation_invite ON "Invite"
  USING (
    current_setting('app.current_tenant', true) IS NULL
    OR "organizationId" = current_setting('app.current_tenant', true)
  );

-- TenantQuota (organizationId, mapped table name)
DROP POLICY IF EXISTS tenant_isolation_tenant_quota ON "tenant_quota";
CREATE POLICY tenant_isolation_tenant_quota ON "tenant_quota"
  USING (
    current_setting('app.current_tenant', true) IS NULL
    OR "organizationId" = current_setting('app.current_tenant', true)
  );

-- OrganizationBranding (organizationId, mapped table name)
DROP POLICY IF EXISTS tenant_isolation_organization_branding ON "organization_branding";
CREATE POLICY tenant_isolation_organization_branding ON "organization_branding"
  USING (
    current_setting('app.current_tenant', true) IS NULL
    OR "organizationId" = current_setting('app.current_tenant', true)
  );

-- TenantProvisioningLog (organizationId, mapped table name)
DROP POLICY IF EXISTS tenant_isolation_tenant_provisioning_log ON "tenant_provisioning_log";
CREATE POLICY tenant_isolation_tenant_provisioning_log ON "tenant_provisioning_log"
  USING (
    current_setting('app.current_tenant', true) IS NULL
    OR "organizationId" = current_setting('app.current_tenant', true)
  );

SELECT 'RLS policies created for all tenant-scoped tables' AS status;

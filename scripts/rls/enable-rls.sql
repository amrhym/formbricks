-- Enable Row Level Security for Multi-Tenant Isolation
-- Idempotent: safe to run multiple times
-- Backward-compatible: allows all rows when app.current_tenant is not set

-- Tables with environmentId (resolve via Environment → Project → Organization)
ALTER TABLE "Contact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContactAttribute" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContactAttributeKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Survey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Response" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Display" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActionClass" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Webhook" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Channel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Integration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Segment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tag" ENABLE ROW LEVEL SECURITY;

-- Tables with direct organizationId
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Team" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_quota" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_branding" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_provisioning_log" ENABLE ROW LEVEL SECURITY;

SELECT 'RLS enabled on all tenant-scoped tables' AS status;

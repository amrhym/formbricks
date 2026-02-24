-- Test RLS Configuration
-- Run this script to verify RLS is properly configured

-- 1. Check RLS is enabled on expected tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true
ORDER BY tablename;

-- 2. Check policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;

-- 3. Test tenant isolation (set a dummy tenant)
SET app.current_tenant = 'test-org-id-does-not-exist';

-- These should return 0 rows (no data for non-existent tenant)
SELECT COUNT(*) AS project_count FROM "Project";
SELECT COUNT(*) AS survey_count FROM "Survey";
SELECT COUNT(*) AS response_count FROM "Response";

-- Reset tenant context
RESET app.current_tenant;

-- 4. Without tenant context, should see all rows (backward compatibility)
SELECT COUNT(*) AS project_count_all FROM "Project";

SELECT 'RLS test completed' AS status;

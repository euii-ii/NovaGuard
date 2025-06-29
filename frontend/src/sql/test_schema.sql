-- Test script to verify the schema works correctly
-- Run this after creating the schema to ensure everything is working

-- Test 1: Verify all tables exist
SELECT 'Testing table existence...' as test_step;

SELECT table_name, 
       CASE WHEN table_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.tables 
WHERE table_name IN (
    'projects', 'vulnerability_scans', 'audit_reports', 'audit_logs', 
    'contracts', 'llm_analysis_logs', 'realtime_sessions', 
    'monitoring_sessions', 'collaborative_workspaces', 
    'shared_audits', 'contract_uploads'
)
ORDER BY table_name;

-- Test 2: Verify projects table has all required columns
SELECT 'Testing projects table columns...' as test_step;

SELECT column_name, data_type,
       CASE WHEN column_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.columns 
WHERE table_name = 'projects'
AND column_name IN ('id', 'name', 'description', 'user_id', 'template', 'network', 'contract_code')
ORDER BY column_name;

-- Test 3: Verify user_id columns are UUID type
SELECT 'Testing user_id column types...' as test_step;

SELECT table_name, column_name, data_type,
       CASE WHEN data_type = 'uuid' THEN '✅ UUID' ELSE '❌ NOT UUID' END as status
FROM information_schema.columns 
WHERE column_name IN ('user_id', 'owner_id', 'shared_by')
AND table_name IN (
    'projects', 'vulnerability_scans', 'audit_reports', 'audit_logs', 
    'contracts', 'llm_analysis_logs', 'realtime_sessions', 
    'monitoring_sessions', 'collaborative_workspaces', 
    'shared_audits', 'contract_uploads'
)
ORDER BY table_name, column_name;

-- Test 4: Verify indexes exist
SELECT 'Testing index existence...' as test_step;

SELECT indexname,
       CASE WHEN indexname IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM pg_indexes 
WHERE indexname LIKE 'idx_%'
ORDER BY indexname;

-- Test 5: Verify RLS is enabled
SELECT 'Testing Row Level Security...' as test_step;

SELECT schemaname, tablename, rowsecurity,
       CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as status
FROM pg_tables 
WHERE tablename IN (
    'projects', 'vulnerability_scans', 'audit_reports', 'audit_logs', 
    'contracts', 'llm_analysis_logs', 'realtime_sessions', 
    'monitoring_sessions', 'collaborative_workspaces', 
    'shared_audits', 'contract_uploads'
)
ORDER BY tablename;

-- Test 6: Verify policies exist
SELECT 'Testing policy existence...' as test_step;

SELECT schemaname, tablename, policyname,
       CASE WHEN policyname IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM pg_policies 
WHERE tablename IN (
    'projects', 'vulnerability_scans', 'audit_reports', 'audit_logs', 
    'contracts', 'llm_analysis_logs', 'realtime_sessions', 
    'monitoring_sessions', 'collaborative_workspaces', 
    'shared_audits', 'contract_uploads'
)
ORDER BY tablename, policyname;

-- Test 7: Test basic insert/select (if auth context allows)
SELECT 'Testing basic operations...' as test_step;

-- This will only work if you have proper auth context
-- Comment out if running without Supabase auth
/*
INSERT INTO projects (name, description, user_id, template, network) 
VALUES ('Test Project', 'Test Description', auth.uid(), 'test', 'ethereum');

SELECT COUNT(*) as project_count FROM projects WHERE user_id = auth.uid();

DELETE FROM projects WHERE name = 'Test Project' AND user_id = auth.uid();
*/

SELECT 'Schema validation complete!' as result;

-- Migration script to convert TEXT user_id columns to UUID
-- Run this ONLY if you have an existing database with TEXT user_id columns

-- WARNING: This migration will convert existing TEXT user_ids to UUIDs
-- Make sure to backup your database before running this migration

BEGIN;

-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

DROP POLICY IF EXISTS "Users can view own scans" ON vulnerability_scans;
DROP POLICY IF EXISTS "Users can insert own scans" ON vulnerability_scans;
DROP POLICY IF EXISTS "Users can update own scans" ON vulnerability_scans;

DROP POLICY IF EXISTS "Users can view own audit reports" ON audit_reports;
DROP POLICY IF EXISTS "Users can insert own audit reports" ON audit_reports;

DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can insert own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can update own audit logs" ON audit_logs;

DROP POLICY IF EXISTS "Users can view own contracts" ON contracts;
DROP POLICY IF EXISTS "Users can insert own contracts" ON contracts;
DROP POLICY IF EXISTS "Users can update own contracts" ON contracts;
DROP POLICY IF EXISTS "Users can delete own contracts" ON contracts;

DROP POLICY IF EXISTS "Users can view own llm logs" ON llm_analysis_logs;
DROP POLICY IF EXISTS "Users can insert own llm logs" ON llm_analysis_logs;

DROP POLICY IF EXISTS "Users can view own realtime sessions" ON realtime_sessions;
DROP POLICY IF EXISTS "Users can insert own realtime sessions" ON realtime_sessions;

DROP POLICY IF EXISTS "Users can view own monitoring sessions" ON monitoring_sessions;
DROP POLICY IF EXISTS "Users can insert own monitoring sessions" ON monitoring_sessions;
DROP POLICY IF EXISTS "Users can update own monitoring sessions" ON monitoring_sessions;

DROP POLICY IF EXISTS "Users can view own workspaces" ON collaborative_workspaces;
DROP POLICY IF EXISTS "Users can insert own workspaces" ON collaborative_workspaces;
DROP POLICY IF EXISTS "Users can update own workspaces" ON collaborative_workspaces;
DROP POLICY IF EXISTS "Users can delete own workspaces" ON collaborative_workspaces;

DROP POLICY IF EXISTS "Users can view shared audits in their workspaces" ON shared_audits;
DROP POLICY IF EXISTS "Users can insert shared audits" ON shared_audits;

DROP POLICY IF EXISTS "Users can view own uploads" ON contract_uploads;
DROP POLICY IF EXISTS "Users can insert own uploads" ON contract_uploads;

-- Disable RLS temporarily
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerability_scans DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE llm_analysis_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE realtime_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE collaborative_workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE shared_audits DISABLE ROW LEVEL SECURITY;
ALTER TABLE contract_uploads DISABLE ROW LEVEL SECURITY;

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add template column if missing
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'projects' AND column_name = 'template'
    ) THEN
        ALTER TABLE projects ADD COLUMN template TEXT;
    END IF;

    -- Add network column if missing
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'projects' AND column_name = 'network'
    ) THEN
        ALTER TABLE projects ADD COLUMN network TEXT DEFAULT 'ethereum';
    END IF;
END
$$;

-- Convert TEXT user_id columns to UUID
-- Note: This assumes existing user_ids are valid UUIDs in TEXT format
-- If they are not UUIDs, you'll need to map them to actual UUIDs first

ALTER TABLE projects ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
ALTER TABLE vulnerability_scans ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
ALTER TABLE audit_reports ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
ALTER TABLE audit_logs ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
ALTER TABLE contracts ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
ALTER TABLE llm_analysis_logs ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
ALTER TABLE realtime_sessions ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
ALTER TABLE monitoring_sessions ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
ALTER TABLE collaborative_workspaces ALTER COLUMN owner_id TYPE UUID USING owner_id::UUID;
ALTER TABLE shared_audits ALTER COLUMN shared_by TYPE UUID USING shared_by::UUID;
ALTER TABLE contract_uploads ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

-- Re-enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerability_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_analysis_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE realtime_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborative_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_uploads ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Now run the create_tables.sql script to recreate the policies with correct types

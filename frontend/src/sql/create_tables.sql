-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    project_data JSONB DEFAULT '{}',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
    type TEXT DEFAULT 'contract' CHECK (type IN ('contract', 'dapp')),
    template TEXT,
    network TEXT DEFAULT 'ethereum',
    contract_code TEXT
);

-- Ensure template column exists (for existing tables that might not have it)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'projects' AND column_name = 'template'
    ) THEN
        ALTER TABLE projects ADD COLUMN template TEXT;
    END IF;
END
$$;

-- Ensure network column exists (for existing tables that might not have it)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'projects' AND column_name = 'network'
    ) THEN
        ALTER TABLE projects ADD COLUMN network TEXT DEFAULT 'ethereum';
    END IF;
END
$$;

-- Create vulnerability_scans table
CREATE TABLE IF NOT EXISTS vulnerability_scans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    contract_address TEXT NOT NULL,
    network TEXT NOT NULL,
    scan_results JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed'))
);

-- Create audit_reports table
CREATE TABLE IF NOT EXISTS audit_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    audit_id TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL,
    contract_code TEXT,
    audit_report JSONB DEFAULT '{}',
    security_score INTEGER DEFAULT 0,
    risk_level TEXT DEFAULT 'unknown',
    vulnerabilities_count INTEGER DEFAULT 0,
    execution_time INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    audit_id TEXT NOT NULL,
    user_id UUID NOT NULL,
    contract_code TEXT,
    chain TEXT DEFAULT 'ethereum',
    analysis_mode TEXT DEFAULT 'comprehensive',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    result JSONB DEFAULT '{}',
    security_score INTEGER,
    risk_level TEXT,
    vulnerabilities_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create contracts table
CREATE TABLE IF NOT EXISTS contracts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    contract_address TEXT,
    contract_code TEXT NOT NULL,
    protocol_type TEXT DEFAULT 'unknown',
    chain_id TEXT DEFAULT 'ethereum',
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create llm_analysis_logs table
CREATE TABLE IF NOT EXISTS llm_analysis_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    contract_code TEXT,
    analysis_result JSONB DEFAULT '{}',
    model_used TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create realtime_sessions table
CREATE TABLE IF NOT EXISTS realtime_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL,
    file_path TEXT,
    content_size INTEGER DEFAULT 0,
    change_type TEXT DEFAULT 'edit',
    syntax_errors INTEGER DEFAULT 0,
    vulnerabilities_found INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create monitoring_sessions table
CREATE TABLE IF NOT EXISTS monitoring_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    contract_address TEXT NOT NULL,
    chain TEXT DEFAULT 'ethereum',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'stopped')),
    configuration JSONB DEFAULT '{}',
    alerts_sent INTEGER DEFAULT 0,
    last_alert_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create collaborative_workspaces table
CREATE TABLE IF NOT EXISTS collaborative_workspaces (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shared_audits table
CREATE TABLE IF NOT EXISTS shared_audits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    audit_id TEXT NOT NULL,
    workspace_id UUID REFERENCES collaborative_workspaces(id),
    shared_by UUID NOT NULL,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contract_uploads table
CREATE TABLE IF NOT EXISTS contract_uploads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    filename TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    upload_status TEXT DEFAULT 'pending' CHECK (upload_status IN ('pending', 'completed', 'failed')),
    contract_id UUID REFERENCES contracts(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
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

-- Create policies for projects table
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
CREATE POLICY "Users can view own projects" ON projects
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
CREATE POLICY "Users can insert own projects" ON projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own projects" ON projects;
CREATE POLICY "Users can update own projects" ON projects
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
CREATE POLICY "Users can delete own projects" ON projects
    FOR DELETE USING (auth.uid() = user_id);

-- Create policies for vulnerability_scans table
DROP POLICY IF EXISTS "Users can view own scans" ON vulnerability_scans;
CREATE POLICY "Users can view own scans" ON vulnerability_scans
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own scans" ON vulnerability_scans;
CREATE POLICY "Users can insert own scans" ON vulnerability_scans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own scans" ON vulnerability_scans;
CREATE POLICY "Users can update own scans" ON vulnerability_scans
    FOR UPDATE USING (auth.uid() = user_id);

-- Create policies for audit_reports table
DROP POLICY IF EXISTS "Users can view own audit reports" ON audit_reports;
CREATE POLICY "Users can view own audit reports" ON audit_reports
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own audit reports" ON audit_reports;
CREATE POLICY "Users can insert own audit reports" ON audit_reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for audit_logs table
DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_logs;
CREATE POLICY "Users can view own audit logs" ON audit_logs
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own audit logs" ON audit_logs;
CREATE POLICY "Users can insert own audit logs" ON audit_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own audit logs" ON audit_logs;
CREATE POLICY "Users can update own audit logs" ON audit_logs
    FOR UPDATE USING (auth.uid() = user_id);

-- Create policies for contracts table
DROP POLICY IF EXISTS "Users can view own contracts" ON contracts;
CREATE POLICY "Users can view own contracts" ON contracts
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own contracts" ON contracts;
CREATE POLICY "Users can insert own contracts" ON contracts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own contracts" ON contracts;
CREATE POLICY "Users can update own contracts" ON contracts
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own contracts" ON contracts;
CREATE POLICY "Users can delete own contracts" ON contracts
    FOR DELETE USING (auth.uid() = user_id);

-- Create policies for llm_analysis_logs table
DROP POLICY IF EXISTS "Users can view own llm logs" ON llm_analysis_logs;
CREATE POLICY "Users can view own llm logs" ON llm_analysis_logs
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own llm logs" ON llm_analysis_logs;
CREATE POLICY "Users can insert own llm logs" ON llm_analysis_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for realtime_sessions table
DROP POLICY IF EXISTS "Users can view own realtime sessions" ON realtime_sessions;
CREATE POLICY "Users can view own realtime sessions" ON realtime_sessions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own realtime sessions" ON realtime_sessions;
CREATE POLICY "Users can insert own realtime sessions" ON realtime_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for monitoring_sessions table
DROP POLICY IF EXISTS "Users can view own monitoring sessions" ON monitoring_sessions;
CREATE POLICY "Users can view own monitoring sessions" ON monitoring_sessions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own monitoring sessions" ON monitoring_sessions;
CREATE POLICY "Users can insert own monitoring sessions" ON monitoring_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own monitoring sessions" ON monitoring_sessions;
CREATE POLICY "Users can update own monitoring sessions" ON monitoring_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Create policies for collaborative_workspaces table
DROP POLICY IF EXISTS "Users can view own workspaces" ON collaborative_workspaces;
CREATE POLICY "Users can view own workspaces" ON collaborative_workspaces
    FOR SELECT USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can insert own workspaces" ON collaborative_workspaces;
CREATE POLICY "Users can insert own workspaces" ON collaborative_workspaces
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update own workspaces" ON collaborative_workspaces;
CREATE POLICY "Users can update own workspaces" ON collaborative_workspaces
    FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can delete own workspaces" ON collaborative_workspaces;
CREATE POLICY "Users can delete own workspaces" ON collaborative_workspaces
    FOR DELETE USING (auth.uid() = owner_id);

-- Create policies for shared_audits table
DROP POLICY IF EXISTS "Users can view shared audits in their workspaces" ON shared_audits;
CREATE POLICY "Users can view shared audits in their workspaces" ON shared_audits
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM collaborative_workspaces
            WHERE id = workspace_id AND owner_id = auth.uid()
        ) OR shared_by = auth.uid()
    );

DROP POLICY IF EXISTS "Users can insert shared audits" ON shared_audits;
CREATE POLICY "Users can insert shared audits" ON shared_audits
    FOR INSERT WITH CHECK (auth.uid() = shared_by);

-- Create policies for contract_uploads table
DROP POLICY IF EXISTS "Users can view own uploads" ON contract_uploads;
CREATE POLICY "Users can view own uploads" ON contract_uploads
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own uploads" ON contract_uploads;
CREATE POLICY "Users can insert own uploads" ON contract_uploads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- INDEXES SECTION
-- ============================================================================
-- Create indexes for better performance
-- Note: Indexes are created AFTER all tables to avoid dependency issues

-- Drop existing indexes first to ensure clean recreation
DROP INDEX IF EXISTS idx_projects_user_id;
DROP INDEX IF EXISTS idx_projects_updated_at;
DROP INDEX IF EXISTS idx_projects_template;
DROP INDEX IF EXISTS idx_projects_network;

-- Create indexes for projects table
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);
CREATE INDEX IF NOT EXISTS idx_projects_template ON projects(template);
CREATE INDEX IF NOT EXISTS idx_projects_network ON projects(network);
-- Drop other indexes first
DROP INDEX IF EXISTS idx_vulnerability_scans_user_id;
DROP INDEX IF EXISTS idx_vulnerability_scans_created_at;
DROP INDEX IF EXISTS idx_audit_reports_user_id;
DROP INDEX IF EXISTS idx_audit_reports_audit_id;
DROP INDEX IF EXISTS idx_audit_logs_user_id;
DROP INDEX IF EXISTS idx_audit_logs_audit_id;
DROP INDEX IF EXISTS idx_contracts_user_id;
DROP INDEX IF EXISTS idx_contracts_address;
DROP INDEX IF EXISTS idx_llm_analysis_logs_user_id;
DROP INDEX IF EXISTS idx_realtime_sessions_user_id;
DROP INDEX IF EXISTS idx_realtime_sessions_session_id;
DROP INDEX IF EXISTS idx_monitoring_sessions_user_id;
DROP INDEX IF EXISTS idx_collaborative_workspaces_owner_id;
DROP INDEX IF EXISTS idx_shared_audits_workspace_id;
DROP INDEX IF EXISTS idx_contract_uploads_user_id;

-- Create other indexes
CREATE INDEX IF NOT EXISTS idx_vulnerability_scans_user_id ON vulnerability_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_vulnerability_scans_created_at ON vulnerability_scans(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_reports_user_id ON audit_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_reports_audit_id ON audit_reports(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_audit_id ON audit_logs(audit_id);
CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_address ON contracts(contract_address);
CREATE INDEX IF NOT EXISTS idx_llm_analysis_logs_user_id ON llm_analysis_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_realtime_sessions_user_id ON realtime_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_realtime_sessions_session_id ON realtime_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_sessions_user_id ON monitoring_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_collaborative_workspaces_owner_id ON collaborative_workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_shared_audits_workspace_id ON shared_audits(workspace_id);
CREATE INDEX IF NOT EXISTS idx_contract_uploads_user_id ON contract_uploads(user_id);

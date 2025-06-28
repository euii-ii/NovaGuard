-- Flash-Audit Complete Supabase Database Schema
-- Comprehensive serverless infrastructure for smart contract auditing platform

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (extends Clerk authentication)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_user_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
    api_usage_count INTEGER DEFAULT 0,
    api_usage_limit INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    preferences JSONB DEFAULT '{}'::jsonb
);

-- Projects table for smart contract projects
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'contract' CHECK (type IN ('contract', 'dapp', 'defi', 'nft', 'dao', 'bridge')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    network TEXT DEFAULT 'Ethereum' CHECK (network IN ('Ethereum', 'Polygon', 'Arbitrum', 'Optimism', 'Base', 'BNB', 'Aptos', 'Solana', 'Sui')),
    project_data JSONB DEFAULT '{}'::jsonb, -- Contains files, settings, configuration
    template_id TEXT,
    visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'team')),
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compilations table for contract compilation history
CREATE TABLE IF NOT EXISTS compilations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    contract_name TEXT NOT NULL,
    contract_code TEXT NOT NULL,
    compiler_version TEXT DEFAULT '0.8.19',
    settings JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'compiling', 'completed', 'failed')),
    result JSONB DEFAULT '{}'::jsonb, -- Contains bytecode, abi, errors, warnings
    gas_estimate BIGINT,
    compilation_time INTEGER, -- in milliseconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Deployments table for contract deployment tracking
CREATE TABLE IF NOT EXISTS deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    compilation_id UUID REFERENCES compilations(id) ON DELETE SET NULL,
    contract_name TEXT NOT NULL,
    network TEXT NOT NULL,
    contract_address TEXT,
    transaction_hash TEXT,
    deployer_address TEXT,
    constructor_args JSONB DEFAULT '[]'::jsonb,
    gas_used BIGINT,
    gas_price BIGINT,
    deployment_cost TEXT, -- in ETH/MATIC/etc
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'deploying', 'deployed', 'failed', 'verified')),
    verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'failed')),
    block_number BIGINT,
    deployment_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deployed_at TIMESTAMP WITH TIME ZONE
);

-- Vulnerability scans table
CREATE TABLE IF NOT EXISTS vulnerability_scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    contract_address TEXT,
    contract_code TEXT,
    network TEXT,
    scan_type TEXT DEFAULT 'comprehensive' CHECK (scan_type IN ('quick', 'comprehensive', 'deep', 'custom')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scanning', 'completed', 'failed')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    vulnerabilities_found INTEGER DEFAULT 0,
    security_score INTEGER CHECK (security_score >= 0 AND security_score <= 100),
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    scan_results JSONB DEFAULT '{}'::jsonb,
    agent_results JSONB DEFAULT '{}'::jsonb, -- Results from different AI agents
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Audit results table for detailed vulnerability findings
CREATE TABLE IF NOT EXISTS audit_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_id UUID NOT NULL REFERENCES vulnerability_scans(id) ON DELETE CASCADE,
    vulnerability_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    affected_lines TEXT,
    code_snippet TEXT,
    fix_suggestion TEXT,
    confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
    false_positive_likelihood INTEGER CHECK (false_positive_likelihood >= 0 AND false_positive_likelihood <= 100),
    gas_impact TEXT CHECK (gas_impact IN ('none', 'low', 'medium', 'high')),
    exploit_scenario TEXT,
    references TEXT[],
    agent_source TEXT, -- Which AI agent found this vulnerability
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Terminal sessions table for IDE terminal functionality
CREATE TABLE IF NOT EXISTS terminal_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    session_type TEXT DEFAULT 'compilation' CHECK (session_type IN ('compilation', 'deployment', 'testing', 'general')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'terminated', 'error')),
    command_history JSONB DEFAULT '[]'::jsonb,
    output_log TEXT DEFAULT '',
    environment_vars JSONB DEFAULT '{}'::jsonb,
    working_directory TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LLM interactions table for tracking AI model usage
CREATE TABLE IF NOT EXISTS llm_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID,
    model_name TEXT NOT NULL,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('audit', 'code_review', 'optimization', 'explanation', 'fix_suggestion')),
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_cost DECIMAL(10, 6),
    request_data JSONB DEFAULT '{}'::jsonb,
    response_data JSONB DEFAULT '{}'::jsonb,
    processing_time INTEGER, -- in milliseconds
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Templates table for smart contract templates
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('Token', 'NFT', 'DeFi', 'DAO', 'Governance', 'Bridge', 'Oracle', 'Gaming')),
    network TEXT DEFAULT 'Ethereum',
    version TEXT DEFAULT '1.0.0',
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_official BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT true,
    download_count INTEGER DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0.00,
    template_data JSONB NOT NULL, -- Contains files, configuration, metadata
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Collaboration table for team features
CREATE TABLE IF NOT EXISTS collaborations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
    permissions JSONB DEFAULT '{}'::jsonb,
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended', 'removed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- API usage tracking
CREATE TABLE IF NOT EXISTS api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER,
    response_time INTEGER, -- in milliseconds
    request_size INTEGER, -- in bytes
    response_size INTEGER, -- in bytes
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('scan_complete', 'deployment_success', 'deployment_failed', 'collaboration_invite', 'system_update')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_compilations_user_id ON compilations(user_id);
CREATE INDEX IF NOT EXISTS idx_compilations_project_id ON compilations(project_id);
CREATE INDEX IF NOT EXISTS idx_deployments_user_id ON deployments(user_id);
CREATE INDEX IF NOT EXISTS idx_deployments_contract_address ON deployments(contract_address);
CREATE INDEX IF NOT EXISTS idx_vulnerability_scans_user_id ON vulnerability_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_vulnerability_scans_status ON vulnerability_scans(status);
CREATE INDEX IF NOT EXISTS idx_audit_results_scan_id ON audit_results(scan_id);
CREATE INDEX IF NOT EXISTS idx_audit_results_severity ON audit_results(severity);
CREATE INDEX IF NOT EXISTS idx_terminal_sessions_user_id ON terminal_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_llm_interactions_user_id ON llm_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_collaborations_project_id ON collaborations(project_id);
CREATE INDEX IF NOT EXISTS idx_collaborations_user_id ON collaborations(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_collaborations_updated_at BEFORE UPDATE ON collaborations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

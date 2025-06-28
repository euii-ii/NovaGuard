
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For advanced indexing
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- For query performance monitoring

-- Users table (extends Clerk authentication)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_user_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise', 'team', 'custom')),
    api_usage_count INTEGER DEFAULT 0,
    api_usage_limit INTEGER DEFAULT 100,
    monthly_scan_count INTEGER DEFAULT 0,
    monthly_scan_limit INTEGER DEFAULT 10,
    total_projects INTEGER DEFAULT 0,
    total_scans_performed INTEGER DEFAULT 0,
    reputation_score INTEGER DEFAULT 0,
    github_username TEXT,
    twitter_handle TEXT,
    linkedin_profile TEXT,
    company_name TEXT,
    job_title TEXT,
    location TEXT,
    timezone TEXT DEFAULT 'UTC',
    language_preference TEXT DEFAULT 'en',
    two_factor_enabled BOOLEAN DEFAULT false,
    email_notifications BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT false,
    security_alerts BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    is_premium BOOLEAN DEFAULT false,
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    preferences JSONB DEFAULT '{}'::jsonb,
    security_settings JSONB DEFAULT '{}'::jsonb,
    billing_info JSONB DEFAULT '{}'::jsonb
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
    type TEXT NOT NULL CHECK (type IN ('scan_complete', 'deployment_success', 'deployment_failed', 'collaboration_invite', 'system_update', 'security_alert', 'billing_update', 'feature_announcement')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_read BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organizations table for team management
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    website_url TEXT,
    logo_url TEXT,
    industry TEXT,
    company_size TEXT CHECK (company_size IN ('1-10', '11-50', '51-200', '201-1000', '1000+')),
    subscription_tier TEXT DEFAULT 'team' CHECK (subscription_tier IN ('team', 'enterprise', 'custom')),
    max_members INTEGER DEFAULT 10,
    current_members INTEGER DEFAULT 1,
    billing_email TEXT,
    tax_id TEXT,
    address JSONB DEFAULT '{}'::jsonb,
    settings JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization members table
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'manager', 'developer', 'auditor', 'viewer')),
    permissions JSONB DEFAULT '{}'::jsonb,
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    joined_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'removed')),
    last_activity TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- Vulnerability database for known security issues
CREATE TABLE IF NOT EXISTS vulnerability_database (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cve_id TEXT UNIQUE,
    swc_id TEXT,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('reentrancy', 'overflow', 'access_control', 'logic_error', 'gas_optimization', 'best_practices', 'compliance')),
    severity TEXT NOT NULL CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    impact TEXT NOT NULL,
    remediation TEXT NOT NULL,
    code_patterns TEXT[],
    affected_versions TEXT[],
    references TEXT[],
    cwe_mapping TEXT[],
    owasp_mapping TEXT[],
    detection_rules JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance frameworks table
CREATE TABLE IF NOT EXISTS compliance_frameworks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    description TEXT,
    authority TEXT, -- e.g., 'SEC', 'CFTC', 'EU', 'ISO'
    framework_type TEXT CHECK (framework_type IN ('regulatory', 'industry', 'internal', 'security')),
    requirements JSONB NOT NULL, -- Detailed compliance requirements
    test_cases JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, version)
);

-- Compliance assessments table
CREATE TABLE IF NOT EXISTS compliance_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    framework_id UUID NOT NULL REFERENCES compliance_frameworks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    compliance_level TEXT CHECK (compliance_level IN ('non_compliant', 'partially_compliant', 'compliant', 'fully_compliant')),
    assessment_results JSONB DEFAULT '{}'::jsonb,
    recommendations JSONB DEFAULT '{}'::jsonb,
    evidence_files TEXT[],
    assessor_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Gas optimization suggestions table
CREATE TABLE IF NOT EXISTS gas_optimizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_id UUID NOT NULL REFERENCES vulnerability_scans(id) ON DELETE CASCADE,
    optimization_type TEXT NOT NULL CHECK (optimization_type IN ('storage', 'computation', 'deployment', 'transaction', 'loop', 'function')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    code_location TEXT,
    original_code TEXT,
    optimized_code TEXT,
    gas_saved_estimate INTEGER,
    implementation_difficulty TEXT CHECK (implementation_difficulty IN ('easy', 'medium', 'hard')),
    confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status TEXT DEFAULT 'suggested' CHECK (status IN ('suggested', 'implemented', 'rejected', 'under_review')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit reports table for comprehensive reporting
CREATE TABLE IF NOT EXISTS audit_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    report_type TEXT DEFAULT 'security' CHECK (report_type IN ('security', 'gas_optimization', 'compliance', 'comprehensive')),
    title TEXT NOT NULL,
    executive_summary TEXT,
    methodology TEXT,
    scope TEXT,
    findings_summary JSONB DEFAULT '{}'::jsonb,
    recommendations JSONB DEFAULT '{}'::jsonb,
    risk_assessment JSONB DEFAULT '{}'::jsonb,
    compliance_status JSONB DEFAULT '{}'::jsonb,
    report_data JSONB DEFAULT '{}'::jsonb,
    report_format TEXT DEFAULT 'pdf' CHECK (report_format IN ('pdf', 'html', 'json', 'markdown')),
    report_url TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'final', 'published')),
    version TEXT DEFAULT '1.0',
    generated_by TEXT, -- AI model or human auditor
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE
);

-- Security incidents table for tracking real-world exploits
CREATE TABLE IF NOT EXISTS security_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    contract_address TEXT,
    network TEXT,
    incident_type TEXT NOT NULL CHECK (incident_type IN ('exploit', 'hack', 'rug_pull', 'flash_loan_attack', 'governance_attack', 'oracle_manipulation')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    impact_description TEXT,
    financial_loss DECIMAL(20, 8),
    currency TEXT DEFAULT 'USD',
    affected_users INTEGER,
    vulnerability_exploited TEXT,
    attack_vector TEXT,
    timeline JSONB DEFAULT '{}'::jsonb,
    post_mortem_url TEXT,
    fix_implemented BOOLEAN DEFAULT false,
    fix_description TEXT,
    lessons_learned TEXT,
    related_cve TEXT,
    reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    incident_date TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Benchmarks table for performance tracking
CREATE TABLE IF NOT EXISTS benchmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    benchmark_type TEXT NOT NULL CHECK (benchmark_type IN ('gas_usage', 'execution_time', 'deployment_cost', 'security_score')),
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(20, 8) NOT NULL,
    unit TEXT NOT NULL,
    network TEXT,
    block_number BIGINT,
    comparison_baseline DECIMAL(20, 8),
    improvement_percentage DECIMAL(5, 2),
    test_conditions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI model performance tracking
CREATE TABLE IF NOT EXISTS ai_model_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_name TEXT NOT NULL,
    model_version TEXT NOT NULL,
    task_type TEXT NOT NULL CHECK (task_type IN ('vulnerability_detection', 'gas_optimization', 'code_review', 'compliance_check')),
    accuracy_score DECIMAL(5, 4),
    precision_score DECIMAL(5, 4),
    recall_score DECIMAL(5, 4),
    f1_score DECIMAL(5, 4),
    false_positive_rate DECIMAL(5, 4),
    false_negative_rate DECIMAL(5, 4),
    processing_time_avg INTEGER, -- in milliseconds
    cost_per_request DECIMAL(10, 6),
    test_dataset_size INTEGER,
    evaluation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    is_production BOOLEAN DEFAULT false
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_network ON projects(network);
CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(type);
CREATE INDEX IF NOT EXISTS idx_compilations_user_id ON compilations(user_id);
CREATE INDEX IF NOT EXISTS idx_compilations_project_id ON compilations(project_id);
CREATE INDEX IF NOT EXISTS idx_compilations_status ON compilations(status);
CREATE INDEX IF NOT EXISTS idx_deployments_user_id ON deployments(user_id);
CREATE INDEX IF NOT EXISTS idx_deployments_contract_address ON deployments(contract_address);
CREATE INDEX IF NOT EXISTS idx_deployments_network ON deployments(network);
CREATE INDEX IF NOT EXISTS idx_vulnerability_scans_user_id ON vulnerability_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_vulnerability_scans_status ON vulnerability_scans(status);
CREATE INDEX IF NOT EXISTS idx_vulnerability_scans_risk_level ON vulnerability_scans(risk_level);
CREATE INDEX IF NOT EXISTS idx_audit_results_scan_id ON audit_results(scan_id);
CREATE INDEX IF NOT EXISTS idx_audit_results_severity ON audit_results(severity);
CREATE INDEX IF NOT EXISTS idx_audit_results_vulnerability_type ON audit_results(vulnerability_type);
CREATE INDEX IF NOT EXISTS idx_terminal_sessions_user_id ON terminal_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_llm_interactions_user_id ON llm_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_llm_interactions_model_name ON llm_interactions(model_name);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_is_public ON templates(is_public);
CREATE INDEX IF NOT EXISTS idx_collaborations_project_id ON collaborations(project_id);
CREATE INDEX IF NOT EXISTS idx_collaborations_user_id ON collaborations(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage(endpoint);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_vulnerability_database_category ON vulnerability_database(category);
CREATE INDEX IF NOT EXISTS idx_vulnerability_database_severity ON vulnerability_database(severity);
CREATE INDEX IF NOT EXISTS idx_compliance_assessments_project_id ON compliance_assessments(project_id);
CREATE INDEX IF NOT EXISTS idx_compliance_assessments_framework_id ON compliance_assessments(framework_id);
CREATE INDEX IF NOT EXISTS idx_gas_optimizations_scan_id ON gas_optimizations(scan_id);
CREATE INDEX IF NOT EXISTS idx_gas_optimizations_type ON gas_optimizations(optimization_type);
CREATE INDEX IF NOT EXISTS idx_audit_reports_project_id ON audit_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_reports_user_id ON audit_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_security_incidents_contract_address ON security_incidents(contract_address);
CREATE INDEX IF NOT EXISTS idx_security_incidents_incident_type ON security_incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_benchmarks_project_id ON benchmarks(project_id);
CREATE INDEX IF NOT EXISTS idx_benchmarks_type ON benchmarks(benchmark_type);
CREATE INDEX IF NOT EXISTS idx_ai_model_performance_model ON ai_model_performance(model_name, model_version);

-- =====================================================
-- ADVANCED FUNCTIONS AND TRIGGERS
-- =====================================================

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update user activity
CREATE OR REPLACE FUNCTION update_user_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users SET last_activity = NOW() WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to calculate security score
CREATE OR REPLACE FUNCTION calculate_security_score(scan_id UUID)
RETURNS INTEGER AS $$
DECLARE
    critical_count INTEGER;
    high_count INTEGER;
    medium_count INTEGER;
    low_count INTEGER;
    total_score INTEGER;
BEGIN
    SELECT
        COUNT(CASE WHEN severity = 'critical' THEN 1 END),
        COUNT(CASE WHEN severity = 'high' THEN 1 END),
        COUNT(CASE WHEN severity = 'medium' THEN 1 END),
        COUNT(CASE WHEN severity = 'low' THEN 1 END)
    INTO critical_count, high_count, medium_count, low_count
    FROM audit_results
    WHERE audit_results.scan_id = calculate_security_score.scan_id;

    -- Calculate weighted score (100 - penalties)
    total_score := 100 - (critical_count * 40 + high_count * 20 + medium_count * 10 + low_count * 5);

    -- Ensure score is between 0 and 100
    IF total_score < 0 THEN
        total_score := 0;
    END IF;

    RETURN total_score;
END;
$$ language 'plpgsql';

-- Function to update project statistics
CREATE OR REPLACE FUNCTION update_project_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE projects
    SET last_accessed = NOW()
    WHERE id = NEW.project_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to enforce API limits
CREATE OR REPLACE FUNCTION check_api_limits()
RETURNS TRIGGER AS $$
DECLARE
    current_usage INTEGER;
    usage_limit INTEGER;
BEGIN
    SELECT api_usage_count, api_usage_limit
    INTO current_usage, usage_limit
    FROM users
    WHERE id = NEW.user_id;

    IF current_usage >= usage_limit THEN
        RAISE EXCEPTION 'API usage limit exceeded for user %', NEW.user_id;
    END IF;

    -- Increment usage count
    UPDATE users
    SET api_usage_count = api_usage_count + 1
    WHERE id = NEW.user_id;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create all triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_collaborations_updated_at BEFORE UPDATE ON collaborations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organization_members_updated_at BEFORE UPDATE ON organization_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vulnerability_database_updated_at BEFORE UPDATE ON vulnerability_database FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliance_frameworks_updated_at BEFORE UPDATE ON compliance_frameworks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_audit_reports_updated_at BEFORE UPDATE ON audit_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Activity tracking triggers
CREATE TRIGGER track_user_activity_scans AFTER INSERT ON vulnerability_scans FOR EACH ROW EXECUTE FUNCTION update_user_activity();
CREATE TRIGGER track_user_activity_projects AFTER INSERT ON projects FOR EACH ROW EXECUTE FUNCTION update_user_activity();
CREATE TRIGGER track_user_activity_deployments AFTER INSERT ON deployments FOR EACH ROW EXECUTE FUNCTION update_user_activity();

-- Project statistics triggers
CREATE TRIGGER update_project_stats_scans AFTER INSERT ON vulnerability_scans FOR EACH ROW EXECUTE FUNCTION update_project_stats();
CREATE TRIGGER update_project_stats_deployments AFTER INSERT ON deployments FOR EACH ROW EXECUTE FUNCTION update_project_stats();

-- API limit enforcement
CREATE TRIGGER enforce_api_limits BEFORE INSERT ON vulnerability_scans FOR EACH ROW EXECUTE FUNCTION check_api_limits();
CREATE TRIGGER enforce_api_limits_llm BEFORE INSERT ON llm_interactions FOR EACH ROW EXECUTE FUNCTION check_api_limits();

-- =====================================================
-- ADVANCED VIEWS FOR ANALYTICS AND REPORTING
-- =====================================================

-- User dashboard view
CREATE OR REPLACE VIEW user_dashboard AS
SELECT
    u.id,
    u.full_name,
    u.email,
    u.subscription_tier,
    u.api_usage_count,
    u.api_usage_limit,
    u.total_projects,
    u.total_scans_performed,
    u.reputation_score,
    COUNT(DISTINCT p.id) as active_projects,
    COUNT(DISTINCT vs.id) as recent_scans,
    AVG(vs.security_score) as avg_security_score,
    MAX(vs.created_at) as last_scan_date,
    COUNT(DISTINCT n.id) as unread_notifications
FROM users u
LEFT JOIN projects p ON u.id = p.user_id AND p.status = 'active'
LEFT JOIN vulnerability_scans vs ON u.id = vs.user_id AND vs.created_at > NOW() - INTERVAL '30 days'
LEFT JOIN notifications n ON u.id = n.user_id AND n.is_read = false
GROUP BY u.id, u.full_name, u.email, u.subscription_tier, u.api_usage_count, u.api_usage_limit, u.total_projects, u.total_scans_performed, u.reputation_score;

-- Project security overview
CREATE OR REPLACE VIEW project_security_overview AS
SELECT
    p.id as project_id,
    p.name as project_name,
    p.type as project_type,
    p.network,
    COUNT(DISTINCT vs.id) as total_scans,
    MAX(vs.security_score) as best_security_score,
    MIN(vs.security_score) as worst_security_score,
    AVG(vs.security_score) as avg_security_score,
    COUNT(DISTINCT CASE WHEN ar.severity = 'critical' THEN ar.id END) as critical_vulnerabilities,
    COUNT(DISTINCT CASE WHEN ar.severity = 'high' THEN ar.id END) as high_vulnerabilities,
    COUNT(DISTINCT CASE WHEN ar.severity = 'medium' THEN ar.id END) as medium_vulnerabilities,
    COUNT(DISTINCT CASE WHEN ar.severity = 'low' THEN ar.id END) as low_vulnerabilities,
    MAX(vs.created_at) as last_scan_date,
    COUNT(DISTINCT d.id) as total_deployments,
    MAX(d.deployed_at) as last_deployment_date
FROM projects p
LEFT JOIN vulnerability_scans vs ON p.id = vs.project_id
LEFT JOIN audit_results ar ON vs.id = ar.scan_id
LEFT JOIN deployments d ON p.id = d.project_id
GROUP BY p.id, p.name, p.type, p.network;

-- Vulnerability trends view
CREATE OR REPLACE VIEW vulnerability_trends AS
SELECT
    DATE_TRUNC('week', vs.created_at) as week,
    COUNT(*) as total_scans,
    AVG(vs.security_score) as avg_security_score,
    COUNT(DISTINCT CASE WHEN ar.severity = 'critical' THEN ar.id END) as critical_count,
    COUNT(DISTINCT CASE WHEN ar.severity = 'high' THEN ar.id END) as high_count,
    COUNT(DISTINCT CASE WHEN ar.severity = 'medium' THEN ar.id END) as medium_count,
    COUNT(DISTINCT CASE WHEN ar.severity = 'low' THEN ar.id END) as low_count,
    vs.network
FROM vulnerability_scans vs
LEFT JOIN audit_results ar ON vs.id = ar.scan_id
WHERE vs.created_at > NOW() - INTERVAL '6 months'
GROUP BY DATE_TRUNC('week', vs.created_at), vs.network
ORDER BY week DESC;

-- Organization analytics view
CREATE OR REPLACE VIEW organization_analytics AS
SELECT
    o.id as organization_id,
    o.name as organization_name,
    o.subscription_tier,
    COUNT(DISTINCT om.user_id) as total_members,
    COUNT(DISTINCT p.id) as total_projects,
    COUNT(DISTINCT vs.id) as total_scans,
    AVG(vs.security_score) as avg_security_score,
    SUM(li.total_cost) as total_ai_cost,
    COUNT(DISTINCT ar.id) as total_reports,
    MAX(vs.created_at) as last_activity
FROM organizations o
LEFT JOIN organization_members om ON o.id = om.organization_id AND om.status = 'active'
LEFT JOIN projects p ON om.user_id = p.user_id
LEFT JOIN vulnerability_scans vs ON p.id = vs.project_id
LEFT JOIN llm_interactions li ON om.user_id = li.user_id
LEFT JOIN audit_reports ar ON p.id = ar.project_id
GROUP BY o.id, o.name, o.subscription_tier;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerability_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY users_own_data ON users FOR ALL USING (clerk_user_id = current_setting('app.current_user_id', true));

-- Projects visibility based on ownership and collaboration
CREATE POLICY projects_access ON projects FOR ALL USING (
    user_id = (SELECT id FROM users WHERE clerk_user_id = current_setting('app.current_user_id', true))
    OR id IN (
        SELECT project_id FROM collaborations
        WHERE user_id = (SELECT id FROM users WHERE clerk_user_id = current_setting('app.current_user_id', true))
        AND status = 'active'
    )
);

-- Vulnerability scans access
CREATE POLICY scans_access ON vulnerability_scans FOR ALL USING (
    user_id = (SELECT id FROM users WHERE clerk_user_id = current_setting('app.current_user_id', true))
    OR project_id IN (
        SELECT project_id FROM collaborations
        WHERE user_id = (SELECT id FROM users WHERE clerk_user_id = current_setting('app.current_user_id', true))
        AND status = 'active'
    )
);

-- =====================================================
-- INITIAL DATA AND CONFIGURATION
-- =====================================================

-- Insert default compliance frameworks
INSERT INTO compliance_frameworks (name, version, description, authority, framework_type, requirements) VALUES
('OWASP Smart Contract Top 10', '2023', 'OWASP Top 10 Smart Contract Security Risks', 'OWASP', 'security', '{"risks": ["SC01", "SC02", "SC03", "SC04", "SC05", "SC06", "SC07", "SC08", "SC09", "SC10"]}'),
('SWC Registry', '1.0', 'Smart Contract Weakness Classification Registry', 'ConsenSys', 'security', '{"categories": ["reentrancy", "access_control", "arithmetic", "unchecked_calls", "denial_of_service", "bad_randomness", "front_running", "time_manipulation", "short_address"]}'),
('CertiK Security Standards', '2.0', 'CertiK Smart Contract Security Standards', 'CertiK', 'security', '{"standards": ["access_control", "reentrancy", "overflow", "logic_errors", "gas_optimization"]}')
ON CONFLICT (name, version) DO NOTHING;

-- Insert common vulnerability patterns
INSERT INTO vulnerability_database (name, category, severity, description, impact, remediation, code_patterns) VALUES
('Reentrancy Attack', 'reentrancy', 'critical', 'Contract calls external contract before updating state', 'Funds can be drained', 'Use checks-effects-interactions pattern or reentrancy guard', ARRAY['call.value', 'send()', 'transfer()']),
('Integer Overflow/Underflow', 'overflow', 'high', 'Arithmetic operations exceed variable limits', 'Unexpected behavior, fund loss', 'Use SafeMath library or Solidity 0.8+', ARRAY['uint256', 'addition', 'subtraction', 'multiplication']),
('Unchecked External Calls', 'unchecked_calls', 'medium', 'External calls without checking return values', 'Silent failures', 'Always check return values', ARRAY['call()', 'delegatecall()', 'send()']),
('Access Control Issues', 'access_control', 'high', 'Missing or improper access controls', 'Unauthorized access', 'Implement proper role-based access control', ARRAY['onlyOwner', 'modifier', 'require(msg.sender']),
('Gas Limit DoS', 'denial_of_service', 'medium', 'Operations that can exceed gas limit', 'Contract becomes unusable', 'Implement pull over push pattern', ARRAY['for loop', 'while loop', 'array.length'])
ON CONFLICT (name) DO NOTHING;

-- Create admin user function
CREATE OR REPLACE FUNCTION create_admin_user(
    p_clerk_user_id TEXT,
    p_email TEXT,
    p_full_name TEXT
) RETURNS UUID AS $$
DECLARE
    user_id UUID;
BEGIN
    INSERT INTO users (clerk_user_id, email, full_name, subscription_tier, api_usage_limit, is_verified)
    VALUES (p_clerk_user_id, p_email, p_full_name, 'enterprise', 10000, true)
    RETURNING id INTO user_id;

    RETURN user_id;
END;
$$ language 'plpgsql';

-- =====================================================
-- PERFORMANCE OPTIMIZATION
-- =====================================================

-- Create materialized views for heavy analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_security_metrics AS
SELECT
    DATE_TRUNC('day', created_at) as date,
    network,
    COUNT(*) as scans_count,
    AVG(security_score) as avg_security_score,
    COUNT(CASE WHEN risk_level = 'critical' THEN 1 END) as critical_scans,
    COUNT(CASE WHEN risk_level = 'high' THEN 1 END) as high_risk_scans
FROM vulnerability_scans
WHERE created_at > NOW() - INTERVAL '1 year'
GROUP BY DATE_TRUNC('day', created_at), network;

-- Refresh materialized view daily
CREATE OR REPLACE FUNCTION refresh_security_metrics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW mv_security_metrics;
END;
$$ language 'plpgsql';


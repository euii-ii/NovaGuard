-- Enhanced Database Schema for Smart Contract Security Auditor
-- Supports vulnerability patterns, AI analysis results, and predictive analytics

-- Users and Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'premium', 'enterprise', 'admin')),
    permissions JSONB DEFAULT '["read"]',
    api_key_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    subscription_tier VARCHAR(50) DEFAULT 'free',
    rate_limit_tier VARCHAR(50) DEFAULT 'standard'
);

-- Vulnerability Patterns Database
CREATE TABLE vulnerability_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_name VARCHAR(255) NOT NULL,
    pattern_type VARCHAR(100) NOT NULL, -- 'static', 'dynamic', 'ai-detected'
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    detection_rules JSONB NOT NULL,
    code_patterns JSONB, -- Regex patterns, AST patterns, etc.
    chain_specific BOOLEAN DEFAULT false,
    supported_chains JSONB DEFAULT '[]',
    confidence_threshold DECIMAL(3,2) DEFAULT 0.7,
    false_positive_rate DECIMAL(3,2) DEFAULT 0.1,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(3,2) DEFAULT 0.0
);

-- AI Analysis Results
CREATE TABLE ai_analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id VARCHAR(100) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    contract_address VARCHAR(42),
    contract_code_hash VARCHAR(64), -- SHA-256 hash of contract code
    chain_id INTEGER,
    chain_name VARCHAR(50),
    analysis_type VARCHAR(50) NOT NULL, -- 'single-agent', 'multi-agent', 'defi-specialized'
    agents_used JSONB NOT NULL, -- Array of agent types used
    failed_agents JSONB DEFAULT '[]',
    
    -- Analysis Results
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    risk_level VARCHAR(20) CHECK (risk_level IN ('Low', 'Medium', 'High', 'Critical')),
    confidence_score DECIMAL(3,2),
    vulnerabilities_found INTEGER DEFAULT 0,
    
    -- Detailed Results
    vulnerabilities JSONB NOT NULL DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    gas_optimizations JSONB DEFAULT '[]',
    code_quality JSONB DEFAULT '{}',
    
    -- Metadata
    execution_time_ms INTEGER,
    analysis_version VARCHAR(20),
    model_versions JSONB, -- Versions of AI models used
    aggregation_method VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Indexing
    CONSTRAINT valid_score CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100))
);

-- Contract Information Cache
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address VARCHAR(42) NOT NULL,
    chain_id INTEGER NOT NULL,
    chain_name VARCHAR(50) NOT NULL,
    
    -- Contract Details
    name VARCHAR(255),
    compiler_version VARCHAR(50),
    optimization_used BOOLEAN,
    source_code TEXT,
    bytecode TEXT,
    abi JSONB,
    
    -- Metadata
    deployment_block INTEGER,
    deployment_timestamp TIMESTAMP,
    creator_address VARCHAR(42),
    transaction_count INTEGER DEFAULT 0,
    
    -- Analysis History
    first_analyzed_at TIMESTAMP,
    last_analyzed_at TIMESTAMP,
    analysis_count INTEGER DEFAULT 0,
    
    -- Contract Characteristics
    is_defi BOOLEAN DEFAULT false,
    is_cross_chain BOOLEAN DEFAULT false,
    has_mev_risk BOOLEAN DEFAULT false,
    protocol_type VARCHAR(100),
    complexity_score INTEGER,
    
    -- Cache Control
    source_verified BOOLEAN DEFAULT false,
    cache_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(address, chain_id)
);

-- Vulnerability Instances (specific vulnerabilities found in contracts)
CREATE TABLE vulnerability_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_result_id UUID REFERENCES ai_analysis_results(id) ON DELETE CASCADE,
    pattern_id UUID REFERENCES vulnerability_patterns(id),
    contract_id UUID REFERENCES contracts(id),
    
    -- Vulnerability Details
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    category VARCHAR(100) NOT NULL,
    confidence DECIMAL(3,2) NOT NULL,
    
    -- Location Information
    affected_lines JSONB DEFAULT '[]',
    code_snippet TEXT,
    function_name VARCHAR(255),
    
    -- Detection Information
    detected_by VARCHAR(50) NOT NULL, -- Agent type that detected it
    detection_method VARCHAR(100), -- 'static', 'ai', 'pattern-match'
    
    -- Impact Assessment
    impact_description TEXT,
    exploit_scenario TEXT,
    fix_recommendation TEXT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'fixed', 'false_positive')),
    verified BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Real-time Monitoring Data
CREATE TABLE monitoring_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    contract_id UUID REFERENCES contracts(id),
    
    -- Monitoring Configuration
    monitoring_config JSONB NOT NULL,
    alert_thresholds JSONB DEFAULT '{}',
    webhook_url VARCHAR(500),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    stopped_at TIMESTAMP,
    
    -- Statistics
    alerts_triggered INTEGER DEFAULT 0,
    mev_detected INTEGER DEFAULT 0,
    anomalies_detected INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MEV Detection Results
CREATE TABLE mev_detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monitoring_session_id UUID REFERENCES monitoring_sessions(id),
    contract_id UUID REFERENCES contracts(id),
    
    -- Transaction Information
    transaction_hash VARCHAR(66) NOT NULL,
    block_number INTEGER NOT NULL,
    block_timestamp TIMESTAMP NOT NULL,
    
    -- MEV Details
    mev_type VARCHAR(50) NOT NULL, -- 'frontrunning', 'sandwich', 'flashloan', 'arbitrage'
    extracted_value DECIMAL(20,8), -- In ETH or native token
    gas_price_premium DECIMAL(10,4), -- Multiplier above average
    
    -- Detection Details
    detection_confidence DECIMAL(3,2) NOT NULL,
    detection_method VARCHAR(100),
    related_transactions JSONB DEFAULT '[]',
    
    -- Analysis
    profit_analysis JSONB DEFAULT '{}',
    victim_impact JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Anomaly Detection Results
CREATE TABLE anomaly_detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monitoring_session_id UUID REFERENCES monitoring_sessions(id),
    contract_id UUID REFERENCES contracts(id),
    
    -- Anomaly Information
    anomaly_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    description TEXT NOT NULL,
    
    -- Detection Details
    detection_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confidence_score DECIMAL(3,2) NOT NULL,
    baseline_deviation DECIMAL(10,4),
    
    -- Context Data
    context_data JSONB DEFAULT '{}',
    affected_metrics JSONB DEFAULT '[]',
    
    -- Resolution
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
    resolution_notes TEXT,
    resolved_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analytics and Reporting
CREATE TABLE analytics_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type VARCHAR(100) NOT NULL,
    report_period VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly'
    generated_for DATE NOT NULL,
    
    -- Report Data
    report_data JSONB NOT NULL,
    summary JSONB DEFAULT '{}',
    
    -- Metadata
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    generated_by VARCHAR(100) DEFAULT 'system',
    
    UNIQUE(report_type, report_period, generated_for)
);

-- User Activity Tracking
CREATE TABLE user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    activity_type VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100), -- 'contract', 'analysis', 'monitoring'
    resource_id UUID,
    
    -- Activity Details
    activity_data JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    
    -- Billing/Usage
    credits_consumed INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Performance
CREATE INDEX idx_ai_analysis_results_user_id ON ai_analysis_results(user_id);
CREATE INDEX idx_ai_analysis_results_contract_address ON ai_analysis_results(contract_address);
CREATE INDEX idx_ai_analysis_results_chain_name ON ai_analysis_results(chain_name);
CREATE INDEX idx_ai_analysis_results_created_at ON ai_analysis_results(created_at);
CREATE INDEX idx_ai_analysis_results_overall_score ON ai_analysis_results(overall_score);

CREATE INDEX idx_contracts_address_chain ON contracts(address, chain_id);
CREATE INDEX idx_contracts_protocol_type ON contracts(protocol_type);
CREATE INDEX idx_contracts_is_defi ON contracts(is_defi);

CREATE INDEX idx_vulnerability_instances_analysis_result_id ON vulnerability_instances(analysis_result_id);
CREATE INDEX idx_vulnerability_instances_severity ON vulnerability_instances(severity);
CREATE INDEX idx_vulnerability_instances_category ON vulnerability_instances(category);

CREATE INDEX idx_mev_detections_contract_id ON mev_detections(contract_id);
CREATE INDEX idx_mev_detections_block_number ON mev_detections(block_number);
CREATE INDEX idx_mev_detections_mev_type ON mev_detections(mev_type);

CREATE INDEX idx_anomaly_detections_contract_id ON anomaly_detections(contract_id);
CREATE INDEX idx_anomaly_detections_detection_timestamp ON anomaly_detections(detection_timestamp);
CREATE INDEX idx_anomaly_detections_severity ON anomaly_detections(severity);

CREATE INDEX idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX idx_user_activities_created_at ON user_activities(created_at);
CREATE INDEX idx_user_activities_activity_type ON user_activities(activity_type);

-- Flash Audit Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  user_role TEXT DEFAULT 'free' CHECK (user_role IN ('free', 'premium', 'enterprise', 'admin')),
  api_key TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Contracts table
CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  contract_address TEXT NOT NULL,
  contract_code TEXT NOT NULL,
  protocol_type TEXT NOT NULL,
  chain_id TEXT NOT NULL,
  name TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit results table
CREATE TABLE IF NOT EXISTS public.audit_results (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  audit_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  results JSONB,
  vulnerability_score INTEGER,
  gas_optimization_score INTEGER,
  security_score INTEGER,
  confidence_score DECIMAL(3,2),
  analysis_duration INTEGER, -- in milliseconds
  agent_results JSONB, -- results from different AI agents
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Vulnerabilities table
CREATE TABLE IF NOT EXISTS public.vulnerabilities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  audit_result_id UUID REFERENCES public.audit_results(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  line_number INTEGER,
  code_snippet TEXT,
  recommendation TEXT,
  confidence DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Real-time monitoring table
CREATE TABLE IF NOT EXISTS public.monitoring_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  contract_address TEXT NOT NULL,
  chain TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'stopped')),
  configuration JSONB,
  alerts_sent INTEGER DEFAULT 0,
  last_alert_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics table
CREATE TABLE IF NOT EXISTS public.analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Workspaces table (for collaborative features)
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workspace members table
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- API usage tracking
CREATE TABLE IF NOT EXISTS public.api_usage (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rate_limit_consumed INTEGER DEFAULT 1
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON public.contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_address ON public.contracts(contract_address);
CREATE INDEX IF NOT EXISTS idx_audit_results_contract_id ON public.audit_results(contract_id);
CREATE INDEX IF NOT EXISTS idx_audit_results_user_id ON public.audit_results(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_results_status ON public.audit_results(status);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_audit_result_id ON public.vulnerabilities(audit_result_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_severity ON public.vulnerabilities(severity);
CREATE INDEX IF NOT EXISTS idx_monitoring_sessions_user_id ON public.monitoring_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_sessions_status ON public.monitoring_sessions(status);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON public.analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON public.analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON public.api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON public.api_usage(timestamp);

-- Row Level Security (RLS) policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Contracts policies
CREATE POLICY "Users can view own contracts" ON public.contracts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contracts" ON public.contracts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contracts" ON public.contracts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contracts" ON public.contracts
  FOR DELETE USING (auth.uid() = user_id);

-- Audit results policies
CREATE POLICY "Users can view own audit results" ON public.audit_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audit results" ON public.audit_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Vulnerabilities policies (inherit from audit results)
CREATE POLICY "Users can view vulnerabilities of own audits" ON public.vulnerabilities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.audit_results ar 
      WHERE ar.id = vulnerabilities.audit_result_id 
      AND ar.user_id = auth.uid()
    )
  );

-- Monitoring sessions policies
CREATE POLICY "Users can manage own monitoring sessions" ON public.monitoring_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Analytics policies
CREATE POLICY "Users can view own analytics" ON public.analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert analytics" ON public.analytics
  FOR INSERT WITH CHECK (true);

-- Workspace policies
CREATE POLICY "Users can view workspaces they belong to" ON public.workspaces
  FOR SELECT USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspaces.id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace owners can manage workspaces" ON public.workspaces
  FOR ALL USING (auth.uid() = owner_id);

-- API usage policies
CREATE POLICY "Users can view own API usage" ON public.api_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert API usage" ON public.api_usage
  FOR INSERT WITH CHECK (true);

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monitoring_sessions_updated_at BEFORE UPDATE ON public.monitoring_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON public.workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create a user profile
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
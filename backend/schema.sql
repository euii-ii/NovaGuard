-- Create audits table for storing audit results
CREATE TABLE IF NOT EXISTS audits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    contract_address TEXT,
    chain TEXT DEFAULT 'ethereum',
    contract_code TEXT,
    project_name TEXT,
    project_description TEXT,
    analysis_results JSONB,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_audits_user_id ON audits(user_id);
CREATE INDEX IF NOT EXISTS idx_audits_created_at ON audits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audits_status ON audits(status);

-- Enable Row Level Security
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own audits
CREATE POLICY "Users can view their own audits" ON audits
    FOR SELECT USING (auth.uid()::text = user_id);

-- Create policy to allow users to insert their own audits
CREATE POLICY "Users can insert their own audits" ON audits
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Create policy to allow users to update their own audits
CREATE POLICY "Users can update their own audits" ON audits
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_audits_updated_at 
    BEFORE UPDATE ON audits 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

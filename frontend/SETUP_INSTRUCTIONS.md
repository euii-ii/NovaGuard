# Fix Clerk + Supabase Integration Errors

## Step 1: Create Supabase Tables

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `gqdbmvtgychgwztlbaus`
3. Go to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the following SQL:

```sql
-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    user_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    project_data JSONB DEFAULT '{}',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
    type TEXT DEFAULT 'contract' CHECK (type IN ('contract', 'dapp'))
);

-- Create vulnerability_scans table
CREATE TABLE IF NOT EXISTS vulnerability_scans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    contract_address TEXT NOT NULL,
    network TEXT NOT NULL,
    scan_results JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed'))
);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerability_scans ENABLE ROW LEVEL SECURITY;

-- Create policies for projects table
CREATE POLICY "Users can view own projects" ON projects
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own projects" ON projects
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own projects" ON projects
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own projects" ON projects
    FOR DELETE USING (auth.uid()::text = user_id);

-- Create policies for vulnerability_scans table
CREATE POLICY "Users can view own scans" ON vulnerability_scans
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own scans" ON vulnerability_scans
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own scans" ON vulnerability_scans
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);
CREATE INDEX IF NOT EXISTS idx_vulnerability_scans_user_id ON vulnerability_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_vulnerability_scans_created_at ON vulnerability_scans(created_at);
```

6. Click **Run** to execute the SQL

## Step 2: Create Clerk JWT Template

1. Go to your Clerk Dashboard: https://dashboard.clerk.com/
2. Select your application
3. Go to **JWT Templates** in the left sidebar
4. Click **New template**
5. Select **Supabase** from the template options
6. Name it exactly: `supabase`
7. Use this configuration:

```json
{
  "aud": "authenticated",
  "exp": "{{user.created_at + 3600}}",
  "iat": "{{user.created_at}}",
  "iss": "https://gqdbmvtgychgwztlbaus.supabase.co/auth/v1",
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address.email_address}}",
  "phone": "",
  "app_metadata": {
    "provider": "clerk",
    "providers": ["clerk"]
  },
  "user_metadata": {
    "email": "{{user.primary_email_address.email_address}}",
    "email_verified": "{{user.primary_email_address.verification.status == 'verified'}}",
    "phone_verified": false,
    "sub": "{{user.id}}"
  },
  "role": "authenticated"
}
```

8. Click **Save**

## Step 3: Test the Integration

After completing steps 1 and 2:

1. Refresh your application
2. Sign in with Clerk
3. Check the browser console - you should see successful connection logs
4. The 404 errors should be resolved
5. The JWT template error should be fixed

## Expected Results

- ✅ No more "JWT template doesn't exist" errors
- ✅ No more 404 errors when fetching projects
- ✅ Successful Supabase queries
- ✅ User data synced between Clerk and Supabase

## Troubleshooting

If you still see errors:

1. **Check table creation**: Go to Supabase > Table Editor to verify tables exist
2. **Check JWT template**: Ensure it's named exactly "supabase" (lowercase)
3. **Check RLS policies**: Verify policies are created in Supabase
4. **Clear browser cache**: Hard refresh the page (Ctrl+F5)

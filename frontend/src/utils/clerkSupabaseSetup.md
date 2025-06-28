# Clerk + Supabase Integration Setup

## Step 1: Configure JWT Template in Clerk Dashboard

1. Go to your Clerk Dashboard: https://dashboard.clerk.com/
2. Navigate to **JWT Templates** in the sidebar
3. Click **New template**
4. Choose **Supabase** as the template type
5. Configure the template with these settings:

### JWT Template Configuration:
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

6. Name the template: `supabase`
7. Save the template

## Step 2: Configure Supabase RLS Policies

In your Supabase dashboard, you need to set up Row Level Security (RLS) policies that recognize Clerk users.

### For the `projects` table:
```sql
-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their own projects
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid()::text = user_id);

-- Policy for users to insert their own projects
CREATE POLICY "Users can insert own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Policy for users to update their own projects
CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Policy for users to delete their own projects
CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid()::text = user_id);
```

### For the `vulnerability_scans` table:
```sql
-- Enable RLS
ALTER TABLE vulnerability_scans ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their own scans
CREATE POLICY "Users can view own scans" ON vulnerability_scans
  FOR SELECT USING (auth.uid()::text = user_id);

-- Policy for users to insert their own scans
CREATE POLICY "Users can insert own scans" ON vulnerability_scans
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Policy for users to update their own scans
CREATE POLICY "Users can update own scans" ON vulnerability_scans
  FOR UPDATE USING (auth.uid()::text = user_id);
```

## Step 3: Test the Integration

After setting up the JWT template and RLS policies, the integration should work automatically. The `useSupabaseAuth` hook will:

1. Get a JWT token from Clerk using the `supabase` template
2. Set this token as the auth token for Supabase
3. All Supabase queries will now be authenticated as the Clerk user

## Troubleshooting

If you see errors in the console:

1. **"Invalid JWT"**: Check that the JWT template is configured correctly
2. **"Row Level Security policy violation"**: Check that RLS policies are set up correctly
3. **"No template found"**: Make sure the JWT template is named exactly `supabase`

## Verification

Once set up correctly, you should see:
- Clerk user ID in the browser console logs
- Successful Supabase queries in the Network tab
- User data appearing in your Supabase Auth dashboard

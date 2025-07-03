const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupDatabase() {
  try {
    console.log('Setting up database...');
    
    // Create the audits table
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
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
            project_metadata JSONB,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'draft')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create indexes for faster queries
        CREATE INDEX IF NOT EXISTS idx_audits_user_id ON audits(user_id);
        CREATE INDEX IF NOT EXISTS idx_audits_created_at ON audits(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_audits_status ON audits(status);
      `
    });

    if (error) {
      console.error('Error setting up database:', error);
      
      // Try alternative approach - direct table creation
      console.log('Trying alternative approach...');
      
      const { error: createError } = await supabase
        .from('audits')
        .select('id')
        .limit(1);
        
      if (createError && createError.code === '42P01') {
        console.log('Table does not exist. Please create it manually in Supabase dashboard.');
        console.log('Use the SQL from backend/schema.sql');
      } else {
        console.log('✅ Database table already exists or accessible');
      }
    } else {
      console.log('✅ Database setup completed successfully');
    }
    
  } catch (error) {
    console.error('Setup failed:', error);
    console.log('Please create the table manually using the SQL in backend/schema.sql');
  }
}

setupDatabase();

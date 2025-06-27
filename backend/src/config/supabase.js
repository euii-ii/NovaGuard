const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration. Please check your environment variables.');
  process.exit(1);
}

// Admin client with service role key for server-side operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Client with anon key for client-side operations
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

module.exports = {
  supabaseAdmin,
  supabaseClient,
  supabaseUrl,
  supabaseAnonKey
};const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration. Please check your environment variables.');
  process.exit(1);
}

// Admin client with service role key for server-side operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Client with anon key for client-side operations
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

module.exports = {
  supabaseAdmin,
  supabaseClient,
  supabaseUrl,
  supabaseAnonKey
};
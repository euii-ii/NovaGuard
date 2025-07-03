// Vercel serverless function for health check
const { createClient } = require('@supabase/supabase-js');
const { clerkClient } = require('@clerk/clerk-sdk-node');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin;
if (supabaseUrl && supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let supabaseStatus = 'not configured';
    let clerkStatus = 'not configured';

    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('users')
          .select('count')
          .limit(1);

        supabaseStatus = error ? 'disconnected' : 'connected';
      } catch (error) {
        supabaseStatus = 'error';
      }
    }

    // Check Clerk status
    if (process.env.CLERK_SECRET_KEY) {
      try {
        const clerk = clerkClient({
          secretKey: process.env.CLERK_SECRET_KEY
        });
        // Try to get organization list as a simple health check
        await clerk.organizations.getOrganizationList({ limit: 1 });
        clerkStatus = 'connected';
      } catch (error) {
        clerkStatus = 'error';
      }
    }

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0-vercel-clerk',
      environment: process.env.NODE_ENV || 'production',
      services: {
        clerk: {
          status: clerkStatus,
          configured: process.env.CLERK_SECRET_KEY ? 'yes' : 'no'
        },
        supabase: {
          status: supabaseStatus,
          url: process.env.SUPABASE_URL ? 'configured' : 'not configured'
        },
        aiModels: {
          status: 'active',
          models: ['kimi-dev-72b', 'gemma-3n-e4b-it']
        }
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

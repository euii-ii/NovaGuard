// Simple status endpoint for Flash-Audit
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0-vercel-clerk',
      environment: process.env.NODE_ENV || 'production',
      message: 'Flash-Audit API is running successfully',
      services: {
        clerk: {
          configured: process.env.CLERK_SECRET_KEY ? 'yes' : 'no'
        },
        supabase: {
          configured: process.env.SUPABASE_URL ? 'yes' : 'no'
        },
        openrouter: {
          configured: process.env.OPENROUTER_API_KEY ? 'yes' : 'no'
        }
      }
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

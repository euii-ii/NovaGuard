// Enhanced Vercel serverless function for audit results
const { withAuth } = require('../middleware/auth');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
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

// CORS headers helper
const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
};

// Simulate getting audit results by ID
const getAuditResults = async (auditId, userId) => {
  console.log(`Fetching audit results for ${auditId} by user ${userId}`);

  // In a real implementation, this would fetch from database
  // For demo purposes, return mock completed results
  return {
    success: true,
    data: {
      id: auditId,
      status: 'completed',
      contractAddress: '0x1234567890123456789012345678901234567890',
      chain: 'ethereum',
      vulnerabilities: [
        {
          name: "Reentrancy Vulnerability",
          affectedLines: "42-47",
          description: "The withdraw function is vulnerable to reentrancy attacks due to external calls before state updates.",
          severity: "high",
          fixSuggestion: "Use the checks-effects-interactions pattern or implement a reentrancy guard."
        },
        {
          name: "Integer Overflow",
          affectedLines: "65-68",
          description: "Arithmetic operations may overflow without proper checks.",
          severity: "medium",
          fixSuggestion: "Use SafeMath library or Solidity 0.8+ built-in overflow protection."
        }
      ],
      securityScore: 68,
      riskCategory: {
        label: "high",
        justification: "Critical reentrancy vulnerability detected that could lead to fund loss."
      },
      codeInsights: {
        gasOptimizationTips: [
          "Use packed structs to reduce storage costs",
          "Consider using events instead of storage for historical data"
        ],
        antiPatternNotices: [
          "External calls before state changes detected",
          "Missing access control on critical functions"
        ],
        dangerousUsage: [
          "Raw call() usage without proper error handling",
          "Unchecked external contract interactions"
        ]
      },
      completedAt: new Date().toISOString(),
      analysisMetadata: {
        userId,
        analysisType: 'comprehensive',
        duration: '45 seconds',
        modelsUsed: ['kimi-dev-72b', 'gemma-3n-e4b-it']
      }
    }
  };
};

const resultsHandler = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.auth;
    
    // Extract audit ID from URL path
    const urlParts = req.url.split('/');
    const auditId = urlParts[urlParts.length - 1];

    if (!auditId || auditId === 'results') {
      return res.status(400).json({ 
        error: 'Audit ID is required',
        details: 'Please provide a valid audit ID in the URL path'
      });
    }

    console.log(`Results request from user: ${userId} for audit: ${auditId}`);

    // Get audit results
    const result = await getAuditResults(auditId, userId);

    res.status(200).json(result);
  } catch (error) {
    console.error('Results API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

// Export with Clerk authentication middleware
module.exports = withAuth(resultsHandler);

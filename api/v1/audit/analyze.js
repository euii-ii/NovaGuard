// Enhanced Vercel serverless function for v1 audit analysis
const { withAuth } = require('../../middleware/auth');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

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

// OpenRouter API configuration
const OPENROUTER_CONFIG = {
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  headers: {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.SITE_URL || 'https://flash-audit.vercel.app',
    'X-Title': 'Flash Audit'
  }
};

// Enhanced audit analysis function
const analyzeContract = async (contractCode, options = {}) => {
  const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Log audit start to database
    if (supabaseAdmin && options.userId) {
      await supabaseAdmin
        .from('audit_logs')
        .insert({
          audit_id: auditId,
          user_id: options.userId,
          contract_code: contractCode.substring(0, 1000),
          chain: options.chain || 'ethereum',
          analysis_mode: options.analysisType || 'standard',
          status: 'in_progress',
          created_at: new Date().toISOString()
        });
    }

    const securityPrompt = `
      Analyze this Solidity smart contract for security vulnerabilities and provide a JSON response:
      
      ${contractCode}
      
      Return ONLY a JSON object with this exact structure:
      {
        "vulnerabilities": [
          {
            "name": "Vulnerability Name",
            "affectedLines": "line numbers",
            "description": "detailed description",
            "severity": "critical|high|medium|low",
            "fixSuggestion": "how to fix this issue",
            "category": "reentrancy|access-control|arithmetic|logic|gas|other"
          }
        ],
        "securityScore": 85,
        "riskCategory": {
          "label": "critical|high|medium|low",
          "justification": "explanation of risk level"
        },
        "codeInsights": {
          "gasOptimizationTips": ["tip1", "tip2"],
          "antiPatternNotices": ["pattern1", "pattern2"],
          "dangerousUsage": ["usage1", "usage2"],
          "bestPractices": ["practice1", "practice2"]
        }
      }
    `;

    // Use OpenRouter for analysis
    const response = await axios.post(`${OPENROUTER_CONFIG.baseURL}/chat/completions`, {
      model: 'google/gemma-2-9b-it:free',
      messages: [{ role: 'user', content: securityPrompt }],
      temperature: 0.1,
      max_tokens: 2000
    }, OPENROUTER_CONFIG);

    let analysisResult;
    try {
      const content = response.data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
        analysisResult.auditId = auditId;
        analysisResult.timestamp = new Date().toISOString();
        analysisResult.success = true;
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      analysisResult = {
        success: true,
        auditId,
        vulnerabilities: [{
          name: "Analysis Error",
          affectedLines: "N/A",
          description: "Unable to parse security analysis results",
          severity: "medium",
          fixSuggestion: "Manual review recommended",
          category: "other"
        }],
        securityScore: 50,
        riskCategory: {
          label: "medium",
          justification: "Analysis incomplete due to parsing error"
        },
        codeInsights: {
          gasOptimizationTips: ["Review contract for optimization opportunities"],
          antiPatternNotices: ["Manual code review recommended"],
          dangerousUsage: ["Check for common vulnerabilities manually"],
          bestPractices: ["Perform manual security audit"]
        }
      };
    }

    // Log successful analysis to database
    if (supabaseAdmin && options.userId) {
      await supabaseAdmin
        .from('audit_logs')
        .update({
          status: 'completed',
          result: analysisResult,
          security_score: analysisResult.securityScore,
          risk_level: analysisResult.riskCategory.label,
          vulnerabilities_count: analysisResult.vulnerabilities.length,
          completed_at: new Date().toISOString()
        })
        .eq('audit_id', auditId);
    }

    return analysisResult;
  } catch (error) {
    console.error('Contract analysis error:', error);
    
    // Log error to database
    if (supabaseAdmin && options.userId) {
      await supabaseAdmin
        .from('audit_logs')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('audit_id', auditId);
    }
    
    return {
      success: false,
      auditId,
      error: error.message,
      vulnerabilities: [],
      securityScore: 0,
      riskCategory: {
        label: "high",
        justification: "Unable to complete security analysis"
      }
    };
  }
};

const analyzeHandler = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { contractCode, contractAddress, chain, analysisType, options } = req.body;
    const { userId, email } = req.auth;

    if (!contractCode) {
      return res.status(400).json({
        success: false,
        error: 'Contract code is required',
        details: 'Please provide the contract source code for analysis'
      });
    }

    console.log(`V1 Audit analysis request from user: ${email} (${userId})`);

    const result = await analyzeContract(contractCode, {
      contractAddress,
      chain: chain || 'ethereum',
      analysisType: analysisType || 'standard',
      options: options || {},
      userId,
      userEmail: email
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('V1 Audit API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Export with Clerk authentication middleware
module.exports = withAuth(analyzeHandler);

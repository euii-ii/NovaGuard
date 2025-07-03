// Enhanced Vercel serverless function for contract upload and analysis
const { withAuth } = require('../middleware/auth');
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

// Quick contract analysis
const performQuickAnalysis = async (contractCode, userId) => {
  const auditId = `quick_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const quickPrompt = `
      Perform a quick security analysis of this Solidity contract and return a JSON response:
      
      ${contractCode.substring(0, 2000)} // First 2000 chars for quick analysis
      
      Return ONLY a JSON object:
      {
        "quickScan": {
          "riskLevel": "low|medium|high|critical",
          "issuesFound": 3,
          "criticalIssues": 0,
          "recommendations": ["rec1", "rec2"]
        },
        "auditId": "${auditId}",
        "status": "completed"
      }
    `;

    const response = await axios.post(`${OPENROUTER_CONFIG.baseURL}/chat/completions`, {
      model: 'google/gemma-2-9b-it:free',
      messages: [{ role: 'user', content: quickPrompt }],
      temperature: 0.1,
      max_tokens: 1000
    }, OPENROUTER_CONFIG);

    let result;
    try {
      const content = response.data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (parseError) {
      result = {
        quickScan: {
          riskLevel: "medium",
          issuesFound: 0,
          criticalIssues: 0,
          recommendations: ["Manual review recommended due to analysis error"]
        },
        auditId,
        status: "completed"
      };
    }

    return result;
  } catch (error) {
    console.error('Quick analysis error:', error);
    return {
      quickScan: {
        riskLevel: "high",
        issuesFound: 0,
        criticalIssues: 0,
        recommendations: ["Analysis failed - manual review required"]
      },
      auditId,
      status: "failed",
      error: error.message
    };
  }
};

const contractUploadHandler = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }

  try {
    const { 
      contract_address, 
      contract_code, 
      protocol_type, 
      chain_id, 
      name, 
      description 
    } = req.body;
    const { userId, email } = req.auth;

    if (!contract_code) {
      return res.status(400).json({
        success: false,
        error: 'Contract code is required'
      });
    }

    console.log(`Contract upload and analysis from user: ${email} (${userId})`);

    // Create contract record in database
    let contractRecord = null;
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('contracts')
        .insert({
          user_id: userId,
          contract_address: contract_address || `temp-${Date.now()}`,
          contract_code: contract_code,
          protocol_type: protocol_type || 'unknown',
          chain_id: chain_id || 'ethereum',
          name: name || 'Unnamed Contract',
          description: description || '',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
      } else {
        contractRecord = data;
      }
    }

    // Perform quick analysis
    const quickAnalysis = await performQuickAnalysis(contract_code, userId);

    // Log the upload and analysis
    if (supabaseAdmin) {
      await supabaseAdmin
        .from('contract_uploads')
        .insert({
          user_id: userId,
          contract_id: contractRecord?.id,
          filename: `${name || 'contract'}.sol`,
          contract_code: contract_code.substring(0, 1000),
          file_size: contract_code.length,
          quick_analysis: quickAnalysis,
          uploaded_at: new Date().toISOString()
        });
    }

    res.status(200).json({
      success: true,
      contract: contractRecord,
      audit: quickAnalysis,
      uploadMetadata: {
        userId,
        userEmail: email,
        uploadedAt: new Date().toISOString(),
        contractSize: contract_code.length,
        version: '2.0.0-serverless'
      }
    });
  } catch (error) {
    console.error('Contract upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Upload and analysis failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Export with Clerk authentication middleware
module.exports = withAuth(contractUploadHandler);

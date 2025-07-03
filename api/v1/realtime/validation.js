// Enhanced Vercel serverless function for real-time code validation
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

// Real-time syntax validation (from backend controller)
const validateSyntax = (content, filePath) => {
  const errors = [];
  const warnings = [];
  const suggestions = [];
  
  // Basic Solidity syntax validation
  if (filePath.endsWith('.sol')) {
    // Check for pragma directive
    if (!content.includes('pragma solidity')) {
      warnings.push({
        line: 1,
        column: 1,
        message: 'Missing pragma solidity directive',
        severity: 'warning',
        type: 'syntax'
      });
    }
    
    // Check for contract declaration
    if (!content.match(/contract\s+\w+/)) {
      errors.push({
        line: 1,
        column: 1,
        message: 'No contract declaration found',
        severity: 'error',
        type: 'syntax'
      });
    }
    
    // Check for common syntax issues
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      // Check for missing semicolons
      if (line.trim() && !line.trim().endsWith(';') && !line.trim().endsWith('{') && !line.trim().endsWith('}') && !line.includes('//')) {
        if (line.includes('=') || line.includes('return') || line.includes('require') || line.includes('emit')) {
          warnings.push({
            line: lineNum,
            column: line.length,
            message: 'Missing semicolon',
            severity: 'warning',
            type: 'syntax'
          });
        }
      }
      
      // Check for potential security issues
      if (line.includes('tx.origin')) {
        warnings.push({
          line: lineNum,
          column: line.indexOf('tx.origin') + 1,
          message: 'Use of tx.origin is discouraged for security reasons',
          severity: 'warning',
          type: 'security'
        });
      }
      
      if (line.includes('selfdestruct')) {
        warnings.push({
          line: lineNum,
          column: line.indexOf('selfdestruct') + 1,
          message: 'selfdestruct is deprecated and dangerous',
          severity: 'warning',
          type: 'security'
        });
      }
      
      // Suggest improvements
      if (line.includes('public') && line.includes('function') && !line.includes('view') && !line.includes('pure')) {
        suggestions.push({
          line: lineNum,
          column: line.indexOf('function') + 1,
          message: 'Consider adding view or pure modifier if function does not modify state',
          severity: 'info',
          type: 'optimization'
        });
      }
    });
  }
  
  return { errors, warnings, suggestions };
};

// Live vulnerability detection (from backend controller)
const detectVulnerabilities = async (content, filePath, userId) => {
  try {
    const vulnerabilityPrompt = `
      Analyze this Solidity code for potential security vulnerabilities in real-time:
      
      File: ${filePath}
      Code:
      ${content.substring(0, 2000)} // First 2000 chars for real-time analysis
      
      Return ONLY a JSON object:
      {
        "vulnerabilities": [
          {
            "type": "reentrancy|access-control|arithmetic|logic|gas",
            "line": 42,
            "column": 10,
            "message": "Potential vulnerability description",
            "severity": "critical|high|medium|low",
            "suggestion": "How to fix this issue"
          }
        ],
        "riskScore": 75,
        "analysisTime": "2024-01-01T00:00:00Z"
      }
    `;

    const response = await axios.post(`${OPENROUTER_CONFIG.baseURL}/chat/completions`, {
      model: 'google/gemma-2-9b-it:free',
      messages: [{ role: 'user', content: vulnerabilityPrompt }],
      temperature: 0.1,
      max_tokens: 1000
    }, OPENROUTER_CONFIG);

    let result;
    try {
      const responseContent = response.data.choices[0].message.content;
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (parseError) {
      result = {
        vulnerabilities: [],
        riskScore: 0,
        analysisTime: new Date().toISOString(),
        error: 'Failed to parse vulnerability analysis'
      };
    }

    return result;
  } catch (error) {
    console.error('Vulnerability detection error:', error);
    return {
      vulnerabilities: [],
      riskScore: 0,
      analysisTime: new Date().toISOString(),
      error: error.message
    };
  }
};

// Code completion suggestions (from backend controller)
const getCodeCompletions = async (content, position, filePath) => {
  try {
    const completionPrompt = `
      Provide code completion suggestions for this Solidity code:
      
      File: ${filePath}
      Position: Line ${position.line}, Column ${position.column}
      
      Code context:
      ${content}
      
      Return ONLY a JSON object:
      {
        "completions": [
          {
            "text": "suggested code",
            "description": "what this does",
            "type": "function|variable|modifier|event",
            "insertText": "code to insert"
          }
        ]
      }
    `;

    const response = await axios.post(`${OPENROUTER_CONFIG.baseURL}/chat/completions`, {
      model: 'google/gemma-2-9b-it:free',
      messages: [{ role: 'user', content: completionPrompt }],
      temperature: 0.3,
      max_tokens: 500
    }, OPENROUTER_CONFIG);

    let result;
    try {
      const responseContent = response.data.choices[0].message.content;
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (parseError) {
      result = {
        completions: [],
        error: 'Failed to generate completions'
      };
    }

    return result;
  } catch (error) {
    console.error('Code completion error:', error);
    return {
      completions: [],
      error: error.message
    };
  }
};

const validationHandler = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { content, filePath, position, action } = req.body;
    const { userId, email } = req.auth;

    if (!content || !filePath) {
      return res.status(400).json({
        error: 'Content and filePath are required'
      });
    }

    console.log(`Real-time validation request from user: ${email} (${userId}), action: ${action || 'validate'}`);

    let result = {};

    // Perform syntax validation
    const syntaxValidation = validateSyntax(content, filePath);
    result.syntax = syntaxValidation;

    // Perform vulnerability detection if requested
    if (action === 'vulnerability-check' || action === 'full-analysis') {
      const vulnerabilities = await detectVulnerabilities(content, filePath, userId);
      result.vulnerabilities = vulnerabilities;
    }

    // Provide code completions if position is provided
    if (position && (action === 'completion' || action === 'full-analysis')) {
      const completions = await getCodeCompletions(content, position, filePath);
      result.completions = completions;
    }

    // Log the validation session (simplified)
    if (supabaseAdmin) {
      try {
        await supabaseAdmin
          .from('realtime_sessions')
          .insert({
            user_id: userId,
            file_path: filePath,
            action: action || 'validate',
            content_size: content.length,
            errors_count: syntaxValidation.errors.length,
            warnings_count: syntaxValidation.warnings.length,
            created_at: new Date().toISOString()
          });
      } catch (dbError) {
        console.warn('Database logging failed:', dbError.message);
        // Continue without failing the request
      }
    }

    result.metadata = {
      userId,
      userEmail: email,
      filePath,
      action: action || 'validate',
      timestamp: new Date().toISOString(),
      version: '2.0.0-serverless'
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('Real-time validation error:', error);
    res.status(500).json({
      error: 'Validation failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Export with Clerk authentication middleware
module.exports = withAuth(validationHandler);

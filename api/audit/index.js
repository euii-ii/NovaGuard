// Vercel serverless function for audit endpoints
const axios = require('axios');
const { withAuth } = require('../middleware/auth');

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

// Dual LLM strategy configuration
const KIMI_CONFIG = {
  ...OPENROUTER_CONFIG,
  headers: {
    ...OPENROUTER_CONFIG.headers,
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY_KIMI || process.env.OPENROUTER_API_KEY}`
  }
};

const GEMMA_CONFIG = {
  ...OPENROUTER_CONFIG,
  headers: {
    ...OPENROUTER_CONFIG.headers,
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY_GEMMA || process.env.OPENROUTER_API_KEY}`
  }
};

// Audit analysis function
const analyzeContract = async (contractCode, options = {}) => {
  const kimiModel = process.env.KIMI_MODEL || 'moonshotai/kimi-dev-72b:free';
  const gemmaModel = process.env.GEMMA_MODEL || 'google/gemma-3n-e4b-it:free';

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
          "severity": "high|medium|low",
          "fixSuggestion": "how to fix this issue"
        }
      ],
      "securityScore": 85,
      "riskCategory": {
        "label": "high|medium|low",
        "justification": "explanation of risk level"
      },
      "codeInsights": {
        "gasOptimizationTips": ["tip1", "tip2"],
        "antiPatternNotices": ["pattern1", "pattern2"],
        "dangerousUsage": ["usage1", "usage2"]
      }
    }
  `;

  try {
    // Use Kimi for security analysis
    const securityResponse = await axios.post(`${KIMI_CONFIG.baseURL}/chat/completions`, {
      model: kimiModel,
      messages: [{ role: 'user', content: securityPrompt }],
      temperature: 0.1,
      max_tokens: 2000
    }, KIMI_CONFIG);

    let analysisResult;
    try {
      const content = securityResponse.data.choices[0].message.content;
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      // Fallback result if parsing fails
      analysisResult = {
        vulnerabilities: [{
          name: "Analysis Error",
          affectedLines: "N/A",
          description: "Unable to parse security analysis results",
          severity: "medium",
          fixSuggestion: "Manual review recommended"
        }],
        securityScore: 50,
        riskCategory: {
          label: "medium",
          justification: "Analysis incomplete due to parsing error"
        },
        codeInsights: {
          gasOptimizationTips: ["Review contract for optimization opportunities"],
          antiPatternNotices: ["Manual code review recommended"],
          dangerousUsage: ["Check for common vulnerabilities manually"]
        }
      };
    }

    return analysisResult;
  } catch (error) {
    console.error('Contract analysis error:', error);
    
    // Return error result
    return {
      vulnerabilities: [{
        name: "Analysis Service Error",
        affectedLines: "N/A",
        description: `Failed to analyze contract: ${error.message}`,
        severity: "high",
        fixSuggestion: "Retry analysis or perform manual review"
      }],
      securityScore: 0,
      riskCategory: {
        label: "high",
        justification: "Unable to complete security analysis"
      },
      codeInsights: {
        gasOptimizationTips: ["Analysis service unavailable"],
        antiPatternNotices: ["Manual review required"],
        dangerousUsage: ["Service error - manual verification needed"]
      }
    };
  }
};

const auditHandler = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { contractCode, chain, contractAddress, sourceType } = req.body;
    const { userId, email } = req.auth; // Get user info from Clerk auth

    if (!contractCode) {
      return res.status(400).json({
        error: 'Contract code is required',
        details: 'Please provide the contract source code for analysis'
      });
    }

    console.log(`Audit request from user: ${email} (${userId})`);

    // Analyze the contract
    const result = await analyzeContract(contractCode, {
      chain: chain || 'ethereum',
      contractAddress,
      sourceType: sourceType || 'solidity',
      userId,
      userEmail: email
    });

    // Add user context to the response
    result.auditMetadata = {
      userId,
      userEmail: email,
      timestamp: new Date().toISOString(),
      chain: chain || 'ethereum',
      contractAddress
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('Audit API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

// Export with Clerk authentication middleware
module.exports = withAuth(auditHandler);

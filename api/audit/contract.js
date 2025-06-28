// Vercel serverless function for contract audit
const axios = require('axios');

// CORS headers helper
const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
};

// Contract audit function using dual LLM strategy
const auditContract = async (contractData) => {
  const { contractCode, chain, contractAddress, sourceType } = contractData;
  
  const kimiModel = process.env.KIMI_MODEL || 'moonshotai/kimi-dev-72b:free';
  const gemmaModel = process.env.GEMMA_MODEL || 'google/gemma-3n-e4b-it:free';
  
  const baseConfig = {
    baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    headers: {
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.SITE_URL || 'https://flash-audit.vercel.app',
      'X-Title': 'Flash Audit'
    }
  };

  const kimiConfig = {
    ...baseConfig,
    headers: {
      ...baseConfig.headers,
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY_KIMI || process.env.OPENROUTER_API_KEY}`
    }
  };

  const gemmaConfig = {
    ...baseConfig,
    headers: {
      ...baseConfig.headers,
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY_GEMMA || process.env.OPENROUTER_API_KEY}`
    }
  };

  // Security analysis prompt for Kimi
  const securityPrompt = `
    You are a smart contract security expert. Analyze this ${sourceType || 'Solidity'} contract for vulnerabilities.
    
    Contract Code:
    ${contractCode}
    
    Chain: ${chain || 'Ethereum'}
    ${contractAddress ? `Address: ${contractAddress}` : ''}
    
    Provide a comprehensive security analysis in JSON format with this exact structure:
    {
      "vulnerabilities": [
        {
          "name": "Vulnerability Name",
          "affectedLines": "line numbers or function names",
          "description": "Detailed explanation of the vulnerability",
          "severity": "critical|high|medium|low",
          "fixSuggestion": "Specific steps to fix this issue"
        }
      ],
      "securityScore": 85,
      "riskCategory": {
        "label": "critical|high|medium|low",
        "justification": "Explanation of overall risk assessment"
      },
      "codeInsights": {
        "gasOptimizationTips": ["specific optimization suggestions"],
        "antiPatternNotices": ["detected anti-patterns"],
        "dangerousUsage": ["dangerous function calls or patterns"]
      }
    }
    
    Focus on: reentrancy, access control, integer overflow/underflow, unchecked external calls, gas limit issues, and logic errors.
  `;

  try {
    // Use Kimi for security analysis
    const securityResponse = await axios.post(`${kimiConfig.baseURL}/chat/completions`, {
      model: kimiModel,
      messages: [{ role: 'user', content: securityPrompt }],
      temperature: 0.1,
      max_tokens: 3000
    }, kimiConfig);

    let result;
    try {
      const content = securityResponse.data.choices[0].message.content;
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      // Fallback result
      result = {
        vulnerabilities: [{
          name: "Analysis Parsing Error",
          affectedLines: "N/A",
          description: "Unable to parse security analysis results properly",
          severity: "medium",
          fixSuggestion: "Retry analysis or perform manual code review"
        }],
        securityScore: 50,
        riskCategory: {
          label: "medium",
          justification: "Analysis incomplete due to parsing error"
        },
        codeInsights: {
          gasOptimizationTips: ["Manual review recommended for gas optimization"],
          antiPatternNotices: ["Manual code review needed"],
          dangerousUsage: ["Check for common vulnerabilities manually"]
        }
      };
    }

    // Enhance with additional analysis using Gemma for gas optimization
    try {
      const gasPrompt = `
        Analyze this smart contract for gas optimization opportunities:
        ${contractCode}
        
        Provide 3-5 specific gas optimization tips in JSON array format:
        ["tip1", "tip2", "tip3"]
      `;

      const gasResponse = await axios.post(`${gemmaConfig.baseURL}/chat/completions`, {
        model: gemmaModel,
        messages: [{ role: 'user', content: gasPrompt }],
        temperature: 0.2,
        max_tokens: 1000
      }, gemmaConfig);

      const gasContent = gasResponse.data.choices[0].message.content;
      const gasMatch = gasContent.match(/\[[\s\S]*\]/);
      if (gasMatch) {
        const gasTips = JSON.parse(gasMatch[0]);
        if (Array.isArray(gasTips)) {
          result.codeInsights.gasOptimizationTips = gasTips;
        }
      }
    } catch (gasError) {
      console.error('Gas optimization analysis error:', gasError);
      // Keep existing gas tips if enhancement fails
    }

    return result;
  } catch (error) {
    console.error('Contract audit error:', error);
    
    return {
      vulnerabilities: [{
        name: "Audit Service Error",
        affectedLines: "N/A",
        description: `Failed to complete contract audit: ${error.message}`,
        severity: "high",
        fixSuggestion: "Retry audit or perform manual security review"
      }],
      securityScore: 0,
      riskCategory: {
        label: "high",
        justification: "Unable to complete security audit due to service error"
      },
      codeInsights: {
        gasOptimizationTips: ["Service unavailable - manual optimization review needed"],
        antiPatternNotices: ["Manual review required due to service error"],
        dangerousUsage: ["Service error - comprehensive manual verification required"]
      }
    };
  }
};

module.exports = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { contractCode, chain, contractAddress, sourceType, options } = req.body;

    if (!contractCode) {
      return res.status(400).json({ 
        error: 'Contract code is required',
        details: 'Please provide the contract source code for analysis'
      });
    }

    // Validate contract size
    const maxSize = parseInt(process.env.MAX_CONTRACT_SIZE_BYTES) || 1048576; // 1MB default
    if (contractCode.length > maxSize) {
      return res.status(400).json({
        error: 'Contract too large',
        details: `Contract size exceeds maximum limit of ${maxSize} bytes`
      });
    }

    const result = await auditContract({
      contractCode,
      chain: chain || 'ethereum',
      contractAddress,
      sourceType: sourceType || 'solidity',
      options: options || {}
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Contract audit API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

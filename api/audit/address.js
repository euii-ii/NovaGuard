// Vercel serverless function for contract address analysis
const axios = require('axios');
const { withAuth } = require('../middleware/auth');

// CORS headers helper
const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
};

// Simulate contract analysis for address-based audits
const analyzeContractAddress = async (contractAddress, chain, options = {}) => {
  // In a real implementation, this would:
  // 1. Fetch contract source code from blockchain explorer APIs
  // 2. Analyze the bytecode if source is not available
  // 3. Use the same LLM analysis as the source code audit

  console.log(`Analyzing contract at ${contractAddress} on ${chain}`);

  // For demo purposes, return a structured analysis result
  return {
    success: true,
    auditId: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    contractAddress,
    chain,
    status: 'completed',
    vulnerabilities: [
      {
        name: "Potential Reentrancy Risk",
        affectedLines: "45-52",
        description: "The contract contains external calls that may be vulnerable to reentrancy attacks. This is based on bytecode analysis.",
        severity: "high",
        fixSuggestion: "Implement reentrancy guards or use the checks-effects-interactions pattern."
      },
      {
        name: "Unchecked Return Values",
        affectedLines: "78-82",
        description: "External calls do not check return values, which could lead to silent failures.",
        severity: "medium",
        fixSuggestion: "Always check return values of external calls and handle failures appropriately."
      }
    ],
    securityScore: 72,
    riskCategory: {
      label: "medium",
      justification: "Contract has some security concerns but no critical vulnerabilities detected in bytecode analysis."
    },
    codeInsights: {
      gasOptimizationTips: [
        "Consider using packed structs to reduce storage costs",
        "Batch multiple operations to reduce transaction overhead"
      ],
      antiPatternNotices: [
        "Contract uses older Solidity patterns that could be modernized",
        "Some functions could benefit from access control improvements"
      ],
      dangerousUsage: [
        "External calls without proper checks detected",
        "Potential for state manipulation through external calls"
      ]
    },
    analysisMetadata: {
      analysisType: 'address-based',
      sourceAvailable: false,
      bytecodeAnalysis: true,
      timestamp: new Date().toISOString(),
      userId: options.userId,
      userEmail: options.userEmail
    }
  };
};

const addressAuditHandler = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { contractAddress, chain, agents, analysisMode } = req.body;
    const { userId, email } = req.auth;

    if (!contractAddress) {
      return res.status(400).json({ 
        error: 'Contract address is required',
        details: 'Please provide a valid contract address for analysis'
      });
    }

    // Validate contract address format (basic validation)
    if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
      return res.status(400).json({
        error: 'Invalid contract address format',
        details: 'Contract address must be a valid Ethereum address (0x followed by 40 hex characters)'
      });
    }

    console.log(`Address audit request from user: ${email} (${userId}) for ${contractAddress} on ${chain}`);

    // Analyze the contract address
    const result = await analyzeContractAddress(contractAddress, chain || 'ethereum', {
      agents: agents || ['security', 'gas-optimization'],
      analysisMode: analysisMode || 'comprehensive',
      userId,
      userEmail: email
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Address audit API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

// Export with Clerk authentication middleware
module.exports = withAuth(addressAuditHandler);

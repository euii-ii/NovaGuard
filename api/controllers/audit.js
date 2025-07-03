// Comprehensive Audit Controller - migrated from original backend controllers
const { withAuth, withOptionalAuth } = require('../middleware/auth');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const crypto = require('crypto');

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

// OpenRouter configuration
const OPENROUTER_CONFIG = {
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  headers: {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.SITE_URL || 'https://flash-audit.vercel.app',
    'X-Title': 'Flash Audit'
  }
};

// Comprehensive audit controller class (from backend)
class AuditController {
  constructor() {
    this.supportedChains = ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base', 'zksync', 'sepolia', 'mumbai'];
    this.analysisAgents = ['security', 'quality', 'economics', 'defi', 'crossChain', 'mev'];
    this.analysisModes = ['quick', 'comprehensive', 'defi-focused'];
  }

  // Validate contract analysis request (from backend)
  validateContractAnalysisRequest(data) {
    const errors = [];

    if (!data.contractCode || typeof data.contractCode !== 'string') {
      errors.push('Contract code is required and must be a string');
    }

    if (data.contractCode && data.contractCode.length < 10) {
      errors.push('Contract code must be at least 10 characters long');
    }

    if (data.contractCode && data.contractCode.length > 1000000) {
      errors.push('Contract code exceeds maximum size of 1MB');
    }

    if (data.chain && !this.supportedChains.includes(data.chain)) {
      errors.push(`Unsupported chain: ${data.chain}. Supported chains: ${this.supportedChains.join(', ')}`);
    }

    if (data.agents && !Array.isArray(data.agents)) {
      errors.push('Agents must be an array');
    }

    if (data.agents) {
      const invalidAgents = data.agents.filter(agent => !this.analysisAgents.includes(agent));
      if (invalidAgents.length > 0) {
        errors.push(`Invalid agents: ${invalidAgents.join(', ')}. Supported agents: ${this.analysisAgents.join(', ')}`);
      }
    }

    if (data.analysisMode && !this.analysisModes.includes(data.analysisMode)) {
      errors.push(`Invalid analysis mode: ${data.analysisMode}. Supported modes: ${this.analysisModes.join(', ')}`);
    }

    return errors;
  }

  // Validate address analysis request (from backend)
  validateAddressAnalysisRequest(data) {
    const errors = [];

    if (!data.contractAddress) {
      errors.push('Contract address is required');
    }

    if (data.contractAddress && !/^0x[a-fA-F0-9]{40}$/.test(data.contractAddress)) {
      errors.push('Invalid contract address format');
    }

    if (data.chain && !this.supportedChains.includes(data.chain)) {
      errors.push(`Unsupported chain: ${data.chain}. Supported chains: ${this.supportedChains.join(', ')}`);
    }

    return errors;
  }

  // Perform comprehensive contract analysis (from backend)
  async performContractAnalysis(contractCode, options = {}, userId = null) {
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      console.log('Starting comprehensive contract analysis', { auditId, userId, codeLength: contractCode.length });

      // Enhanced analysis prompt
      const analysisPrompt = `
Perform a comprehensive smart contract security analysis:

Contract Code:
${contractCode}

Analysis Configuration:
- Chain: ${options.chain || 'ethereum'}
- Mode: ${options.analysisMode || 'comprehensive'}
- Agents: ${(options.agents || ['security', 'quality', 'economics']).join(', ')}
- Priority: ${options.priority || 'normal'}

Return ONLY a valid JSON object with this structure:
{
  "auditId": "${auditId}",
  "vulnerabilities": [
    {
      "id": "unique_id",
      "name": "Vulnerability Name",
      "severity": "critical|high|medium|low",
      "category": "reentrancy|access-control|arithmetic|logic|gas|defi|mev|other",
      "description": "Detailed description",
      "location": {"line": 42, "function": "functionName"},
      "impact": "Potential impact",
      "recommendation": "How to fix",
      "confidence": 0.95,
      "references": ["CWE-123"]
    }
  ],
  "securityScore": 85,
  "qualityScore": 78,
  "gasScore": 82,
  "overallScore": 81,
  "riskCategory": {
    "label": "low|medium|high|critical",
    "justification": "Risk level explanation"
  },
  "codeInsights": {
    "gasOptimizationTips": ["tip1", "tip2"],
    "antiPatternNotices": ["pattern1", "pattern2"],
    "dangerousUsage": ["usage1", "usage2"],
    "bestPractices": ["practice1", "practice2"],
    "complexity": "low|medium|high",
    "maintainabilityScore": 75
  },
  "defiAnalysis": {
    "tokenomics": "analysis",
    "liquidityRisks": ["risk1"],
    "flashLoanVulnerabilities": ["vuln1"],
    "yieldFarmingRisks": ["risk1"],
    "governanceRisks": ["risk1"],
    "oracleRisks": ["risk1"]
  },
  "complianceChecks": {
    "erc20Compliance": true,
    "erc721Compliance": false,
    "accessControlPatterns": ["Ownable"],
    "upgradeabilityPatterns": ["Proxy"],
    "pausabilityImplemented": true
  },
  "summary": "Brief analysis summary",
  "recommendations": ["rec1", "rec2"],
  "executionTime": ${Date.now() - startTime},
  "analyzedAt": "${new Date().toISOString()}"
}
      `;

      // Call LLM for analysis
      const response = await axios.post(`${OPENROUTER_CONFIG.baseURL}/chat/completions`, {
        model: 'google/gemma-2-9b-it:free',
        messages: [
          {
            role: 'system',
            content: 'You are a professional smart contract security auditor. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 4000
      }, OPENROUTER_CONFIG);

      let analysisResult;
      try {
        const content = response.data.choices[0].message.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
          analysisResult.auditId = auditId;
          analysisResult.success = true;
          analysisResult.executionTime = Date.now() - startTime;
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse LLM response:', parseError);
        analysisResult = {
          success: true,
          auditId,
          vulnerabilities: [],
          securityScore: 50,
          qualityScore: 50,
          gasScore: 50,
          overallScore: 50,
          riskCategory: {
            label: "medium",
            justification: "Analysis parsing failed"
          },
          codeInsights: {
            gasOptimizationTips: ["Manual review recommended"],
            antiPatternNotices: ["Analysis parsing failed"],
            dangerousUsage: [],
            bestPractices: [],
            complexity: "unknown",
            maintainabilityScore: 50
          },
          summary: "Analysis completed with parsing issues",
          recommendations: ["Manual security review recommended"],
          executionTime: Date.now() - startTime,
          analyzedAt: new Date().toISOString(),
          parseError: true
        };
      }

      // Log to database
      if (supabaseAdmin && userId) {
        try {
          await supabaseAdmin
            .from('audit_reports')
            .insert({
              audit_id: auditId,
              user_id: userId,
              contract_code: contractCode.substring(0, 1000),
              audit_report: analysisResult,
              security_score: analysisResult.securityScore,
              risk_level: analysisResult.riskCategory.label,
              vulnerabilities_count: analysisResult.vulnerabilities.length,
              execution_time: analysisResult.executionTime,
              created_at: new Date().toISOString()
            });
        } catch (dbError) {
          console.warn('Database logging failed:', dbError.message);
        }
      }

      console.log('Contract analysis completed', { 
        auditId, 
        score: analysisResult.overallScore,
        vulnerabilities: analysisResult.vulnerabilities.length,
        executionTime: analysisResult.executionTime 
      });

      return analysisResult;

    } catch (error) {
      console.error('Contract analysis failed', { auditId, error: error.message });
      
      return {
        success: false,
        auditId,
        error: error.message,
        vulnerabilities: [],
        securityScore: 0,
        qualityScore: 0,
        gasScore: 0,
        overallScore: 0,
        riskCategory: {
          label: "high",
          justification: "Analysis failed due to error"
        },
        executionTime: Date.now() - startTime,
        analyzedAt: new Date().toISOString()
      };
    }
  }

  // Get audit history (from backend)
  async getAuditHistory(userId, limit = 10, offset = 0) {
    try {
      if (!supabaseAdmin) {
        return {
          success: true,
          audits: [],
          total: 0,
          message: 'Database not configured'
        };
      }

      const { data: audits, error, count } = await supabaseAdmin
        .from('audit_reports')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        success: true,
        audits: audits || [],
        total: count || 0,
        limit,
        offset
      };
    } catch (error) {
      console.error('Get audit history error:', error);
      return {
        success: false,
        error: error.message,
        audits: [],
        total: 0
      };
    }
  }

  // Health check for audit services (from backend)
  async getAuditHealth() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        auditEngine: 'operational',
        llmService: 'operational',
        database: supabaseAdmin ? 'operational' : 'not-configured',
        openRouter: process.env.OPENROUTER_API_KEY ? 'operational' : 'not-configured'
      },
      supportedChains: this.supportedChains,
      supportedAgents: this.analysisAgents,
      supportedModes: this.analysisModes,
      version: '2.0.0-serverless'
    };

    // Test LLM service
    try {
      if (process.env.OPENROUTER_API_KEY) {
        health.services.llmService = 'operational';
        health.llmModel = 'google/gemma-2-9b-it:free';
      } else {
        health.services.llmService = 'not-configured';
      }
    } catch (error) {
      health.services.llmService = 'error';
    }

    return {
      success: true,
      health: health
    };
  }
}

// Serverless function handler
const auditControllerHandler = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const auditController = new AuditController();
    const { userId, email } = req.auth || {};

    if (req.method === 'GET') {
      const { action, limit, offset } = req.query;

      switch (action) {
        case 'history':
          if (!userId) {
            return res.status(401).json({
              success: false,
              error: 'Authentication required'
            });
          }

          const history = await auditController.getAuditHistory(
            userId, 
            parseInt(limit) || 10, 
            parseInt(offset) || 0
          );
          
          history.metadata = {
            userId,
            userEmail: email,
            timestamp: new Date().toISOString()
          };
          
          res.status(200).json(history);
          break;

        case 'health':
          const health = await auditController.getAuditHealth();
          res.status(200).json(health);
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid action. Supported actions: history, health'
          });
      }
    } else if (req.method === 'POST') {
      const { action, contractCode, contractAddress, chain, agents, analysisMode, priority, options } = req.body;

      switch (action) {
        case 'analyze':
          if (!userId) {
            return res.status(401).json({
              success: false,
              error: 'Authentication required'
            });
          }

          // Validate request
          const validationErrors = auditController.validateContractAnalysisRequest({
            contractCode, chain, agents, analysisMode
          });

          if (validationErrors.length > 0) {
            return res.status(400).json({
              success: false,
              error: 'Validation failed',
              details: validationErrors
            });
          }

          console.log(`Contract analysis request from user: ${email} (${userId})`);

          const analysisOptions = {
            chain: chain || 'ethereum',
            agents: agents || ['security', 'quality', 'economics'],
            analysisMode: analysisMode || 'comprehensive',
            priority: priority || 'normal',
            ...options
          };

          const result = await auditController.performContractAnalysis(
            contractCode, 
            analysisOptions, 
            userId
          );

          result.metadata = {
            userId,
            userEmail: email,
            timestamp: new Date().toISOString(),
            version: '2.0.0-serverless'
          };

          res.status(200).json(result);
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid action. Supported actions: analyze'
          });
      }
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Audit controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Audit controller failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Export with optional authentication (health check doesn't require auth)
module.exports = withOptionalAuth(auditControllerHandler);

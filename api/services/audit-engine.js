// Enhanced Audit Engine Service - migrated from backend
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

// Audit Engine Class (migrated from backend)
class AuditEngine {
  constructor() {
    this.openRouterConfig = {
      baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://flash-audit.vercel.app',
        'X-Title': 'Flash Audit'
      }
    };
  }

  // Validate contract input (from backend)
  validateContractInput(contractCode) {
    if (!contractCode || typeof contractCode !== 'string') {
      throw new Error('Contract code must be a non-empty string');
    }

    if (contractCode.trim().length < 10) {
      throw new Error('Contract code must be at least 10 characters long');
    }

    if (contractCode.length > 1000000) {
      throw new Error('Contract code exceeds maximum size of 1MB');
    }

    // Basic Solidity validation
    if (!contractCode.includes('contract ') && !contractCode.includes('library ') && !contractCode.includes('interface ')) {
      throw new Error('No contract, library, or interface declaration found');
    }
  }

  // Parse contract structure (from backend)
  async parseContract(contractCode) {
    try {
      const parseResult = {
        contracts: [],
        functions: [],
        modifiers: [],
        events: [],
        variables: [],
        imports: [],
        pragmaDirectives: [],
        complexity: 'medium',
        linesOfCode: contractCode.split('\n').length
      };

      // Extract contract names
      const contractMatches = contractCode.match(/contract\s+(\w+)/g);
      if (contractMatches) {
        parseResult.contracts = contractMatches.map(match => match.split(' ')[1]);
      }

      // Extract function signatures
      const functionMatches = contractCode.match(/function\s+(\w+)\s*\([^)]*\)/g);
      if (functionMatches) {
        parseResult.functions = functionMatches.map(match => {
          const name = match.match(/function\s+(\w+)/)[1];
          const isPublic = match.includes('public');
          const isExternal = match.includes('external');
          const isView = match.includes('view');
          const isPure = match.includes('pure');
          const isPayable = match.includes('payable');
          
          return {
            name,
            visibility: isPublic ? 'public' : isExternal ? 'external' : 'internal',
            stateMutability: isPure ? 'pure' : isView ? 'view' : isPayable ? 'payable' : 'nonpayable'
          };
        });
      }

      // Extract modifiers
      const modifierMatches = contractCode.match(/modifier\s+(\w+)/g);
      if (modifierMatches) {
        parseResult.modifiers = modifierMatches.map(match => match.split(' ')[1]);
      }

      // Extract events
      const eventMatches = contractCode.match(/event\s+(\w+)/g);
      if (eventMatches) {
        parseResult.events = eventMatches.map(match => match.split(' ')[1]);
      }

      // Extract pragma directives
      const pragmaMatches = contractCode.match(/pragma\s+solidity\s+[^;]+/g);
      if (pragmaMatches) {
        parseResult.pragmaDirectives = pragmaMatches;
      }

      // Calculate complexity
      const complexityFactors = [
        parseResult.functions.length,
        parseResult.contracts.length * 2,
        parseResult.modifiers.length,
        parseResult.linesOfCode / 10
      ];
      
      const complexityScore = complexityFactors.reduce((sum, factor) => sum + factor, 0);
      
      if (complexityScore < 20) {
        parseResult.complexity = 'low';
      } else if (complexityScore > 50) {
        parseResult.complexity = 'high';
      }

      return parseResult;
    } catch (error) {
      console.error('Contract parsing error:', error);
      return {
        contracts: [],
        functions: [],
        modifiers: [],
        events: [],
        variables: [],
        imports: [],
        pragmaDirectives: [],
        complexity: 'unknown',
        linesOfCode: contractCode.split('\n').length,
        parseError: error.message
      };
    }
  }

  // Perform static analysis (from backend)
  performStaticAnalysis(contractCode, parseResult) {
    const issues = [];
    const lines = contractCode.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmedLine = line.trim();

      // Check for common vulnerabilities
      if (trimmedLine.includes('tx.origin')) {
        issues.push({
          type: 'security',
          severity: 'high',
          line: lineNum,
          message: 'Use of tx.origin is discouraged for security reasons',
          category: 'access-control'
        });
      }

      if (trimmedLine.includes('selfdestruct')) {
        issues.push({
          type: 'security',
          severity: 'medium',
          line: lineNum,
          message: 'selfdestruct is deprecated and potentially dangerous',
          category: 'logic'
        });
      }

      if (trimmedLine.includes('delegatecall')) {
        issues.push({
          type: 'security',
          severity: 'high',
          line: lineNum,
          message: 'delegatecall can be dangerous if not properly secured',
          category: 'access-control'
        });
      }

      // Check for reentrancy patterns
      if (trimmedLine.includes('.call(') || trimmedLine.includes('.send(') || trimmedLine.includes('.transfer(')) {
        issues.push({
          type: 'security',
          severity: 'medium',
          line: lineNum,
          message: 'Potential reentrancy vulnerability - ensure proper checks-effects-interactions pattern',
          category: 'reentrancy'
        });
      }

      // Check for gas optimization opportunities
      if (trimmedLine.includes('storage') && trimmedLine.includes('=')) {
        issues.push({
          type: 'gas',
          severity: 'low',
          line: lineNum,
          message: 'Consider using memory instead of storage for temporary variables',
          category: 'gas'
        });
      }
    });

    return {
      issues,
      totalIssues: issues.length,
      securityIssues: issues.filter(i => i.type === 'security').length,
      gasIssues: issues.filter(i => i.type === 'gas').length,
      qualityIssues: issues.filter(i => i.type === 'quality').length
    };
  }

  // Combine analysis results (from backend)
  combineAnalysisResults(parseResult, llmAnalysis, staticAnalysis) {
    const combinedVulnerabilities = [
      ...(llmAnalysis.vulnerabilities || []),
      ...staticAnalysis.issues.map(issue => ({
        name: issue.message,
        severity: issue.severity,
        category: issue.category,
        description: issue.message,
        location: { line: issue.line },
        source: 'static-analysis'
      }))
    ];

    return {
      vulnerabilities: combinedVulnerabilities,
      parseResult,
      llmAnalysis,
      staticAnalysis,
      totalVulnerabilities: combinedVulnerabilities.length,
      criticalVulnerabilities: combinedVulnerabilities.filter(v => v.severity === 'critical').length,
      highVulnerabilities: combinedVulnerabilities.filter(v => v.severity === 'high').length,
      mediumVulnerabilities: combinedVulnerabilities.filter(v => v.severity === 'medium').length,
      lowVulnerabilities: combinedVulnerabilities.filter(v => v.severity === 'low').length
    };
  }

  // Calculate security scores (from backend)
  calculateSecurityScores(combinedAnalysis) {
    const { vulnerabilities } = combinedAnalysis;
    
    let score = 100;
    
    // Deduct points based on vulnerability severity
    vulnerabilities.forEach(vuln => {
      switch (vuln.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 8;
          break;
        case 'low':
          score -= 3;
          break;
      }
    });

    // Ensure score doesn't go below 0
    score = Math.max(0, score);

    // Calculate risk level
    let riskLevel = 'Low';
    if (score < 30) riskLevel = 'Critical';
    else if (score < 50) riskLevel = 'High';
    else if (score < 70) riskLevel = 'Medium';

    return {
      overall: score,
      security: score,
      quality: combinedAnalysis.llmAnalysis?.qualityScore || 75,
      gas: combinedAnalysis.llmAnalysis?.gasScore || 75,
      riskLevel
    };
  }

  // Generate comprehensive audit report (from backend)
  generateAuditReport(data) {
    const {
      auditId,
      contractCode,
      parseResult,
      llmAnalysis,
      combinedAnalysis,
      scores,
      options,
      executionTime
    } = data;

    return {
      auditId,
      timestamp: new Date().toISOString(),
      version: '2.0.0-serverless',
      executionTime,
      
      // Contract information
      contractInfo: {
        linesOfCode: parseResult.linesOfCode,
        complexity: parseResult.complexity,
        contracts: parseResult.contracts,
        functions: parseResult.functions.length,
        modifiers: parseResult.modifiers.length,
        events: parseResult.events.length
      },

      // Security analysis
      security: {
        score: scores.security,
        riskLevel: scores.riskLevel,
        vulnerabilities: combinedAnalysis.vulnerabilities,
        totalVulnerabilities: combinedAnalysis.totalVulnerabilities,
        criticalCount: combinedAnalysis.criticalVulnerabilities,
        highCount: combinedAnalysis.highVulnerabilities,
        mediumCount: combinedAnalysis.mediumVulnerabilities,
        lowCount: combinedAnalysis.lowVulnerabilities
      },

      // Code quality
      quality: {
        score: scores.quality,
        issues: llmAnalysis.codeQuality?.issues || [],
        strengths: llmAnalysis.codeQuality?.strengths || [],
        maintainability: llmAnalysis.codeQuality?.maintainability || 'medium',
        readability: llmAnalysis.codeQuality?.readability || 'medium',
        testability: llmAnalysis.codeQuality?.testability || 'medium'
      },

      // Gas optimization
      gas: {
        score: scores.gas,
        optimizations: llmAnalysis.gasOptimizations || [],
        estimatedSavings: llmAnalysis.gasOptimizations?.reduce((total, opt) => {
          const savings = opt.estimatedSavings?.match(/\d+/);
          return total + (savings ? parseInt(savings[0]) : 0);
        }, 0) || 0
      },

      // DeFi analysis
      defi: llmAnalysis.defiAnalysis || null,

      // Compliance
      compliance: llmAnalysis.complianceChecks || null,

      // Recommendations
      recommendations: llmAnalysis.recommendations || [],

      // Summary
      summary: llmAnalysis.summary || `Contract analyzed with ${combinedAnalysis.totalVulnerabilities} issues found`,

      // Metadata
      metadata: {
        model: llmAnalysis.model,
        analysisOptions: options,
        parseSuccess: !parseResult.parseError,
        llmSuccess: !llmAnalysis.parseError
      }
    };
  }

  // Main audit function (from backend)
  async auditContract(contractCode, options = {}) {
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      console.log('Starting comprehensive contract audit', { auditId, codeLength: contractCode.length });

      // Validate input
      this.validateContractInput(contractCode);

      // Parse contract
      const parseResult = await this.parseContract(contractCode);

      // Perform static analysis
      const staticAnalysis = this.performStaticAnalysis(contractCode, parseResult);

      // Perform LLM analysis
      const llmAnalysis = await this.performLLMAnalysis(contractCode, parseResult);

      // Combine results
      const combinedAnalysis = this.combineAnalysisResults(parseResult, llmAnalysis, staticAnalysis);

      // Calculate scores
      const scores = this.calculateSecurityScores(combinedAnalysis);

      // Generate report
      const auditReport = this.generateAuditReport({
        auditId,
        contractCode,
        parseResult,
        llmAnalysis,
        combinedAnalysis,
        scores,
        options,
        executionTime: Date.now() - startTime
      });

      console.log('Contract audit completed', { 
        auditId, 
        score: scores.overall,
        vulnerabilities: combinedAnalysis.totalVulnerabilities,
        executionTime: Date.now() - startTime 
      });

      return auditReport;

    } catch (error) {
      console.error('Contract audit failed', { auditId, error: error.message });
      throw error;
    }
  }

  // Perform LLM analysis
  async performLLMAnalysis(contractCode, parseResult) {
    try {
      const prompt = `
Analyze this Solidity smart contract for security vulnerabilities and code quality:

Contract Structure:
- Contracts: ${parseResult.contracts.join(', ')}
- Functions: ${parseResult.functions.length}
- Complexity: ${parseResult.complexity}
- Lines of Code: ${parseResult.linesOfCode}

Contract Code:
${contractCode}

Return ONLY a valid JSON object with comprehensive analysis.
      `;

      const response = await axios.post(`${this.openRouterConfig.baseURL}/chat/completions`, {
        model: 'google/gemma-2-9b-it:free',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 3000
      }, this.openRouterConfig);

      const content = response.data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in LLM response');
      }
    } catch (error) {
      console.error('LLM analysis error:', error);
      return {
        vulnerabilities: [],
        overallScore: 50,
        riskLevel: 'Medium',
        summary: 'LLM analysis failed',
        recommendations: ['Manual review recommended'],
        gasOptimizations: [],
        codeQuality: { score: 50, issues: [], strengths: [] }
      };
    }
  }
}

// Serverless function handler
const auditEngineHandler = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { contractCode, options } = req.body;
    const { userId, email } = req.auth;

    if (!contractCode) {
      return res.status(400).json({
        success: false,
        error: 'Contract code is required'
      });
    }

    console.log(`Audit engine request from user: ${email} (${userId})`);

    const auditEngine = new AuditEngine();
    const auditReport = await auditEngine.auditContract(contractCode, options || {});

    // Log audit to database
    if (supabaseAdmin) {
      await supabaseAdmin
        .from('audit_reports')
        .insert({
          audit_id: auditReport.auditId,
          user_id: userId,
          contract_code: contractCode.substring(0, 1000),
          audit_report: auditReport,
          security_score: auditReport.security.score,
          risk_level: auditReport.security.riskLevel,
          vulnerabilities_count: auditReport.security.totalVulnerabilities,
          execution_time: auditReport.executionTime,
          created_at: new Date().toISOString()
        });
    }

    auditReport.metadata.userId = userId;
    auditReport.metadata.userEmail = email;

    res.status(200).json({
      success: true,
      auditReport
    });
  } catch (error) {
    console.error('Audit engine error:', error);
    res.status(500).json({
      success: false,
      error: 'Audit failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Export with Clerk authentication middleware
module.exports = withAuth(auditEngineHandler);

const axios = require('axios');
const logger = require('../../../backend/src/utils/logger');

class LLMService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseURL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    this.model = process.env.LLM_MODEL || 'google/gemma-2-9b-it';
    this.timeout = parseInt(process.env.AUDIT_TIMEOUT_MS) || 30000;
    
    if (!this.apiKey) {
      logger.error('OpenRouter API key not configured');
      throw new Error('OpenRouter API key is required');
    }
  }

  /**
   * Analyze smart contract for security vulnerabilities using LLM
   * @param {string} contractCode - Solidity contract code
   * @param {Object} contractInfo - Additional contract information
   * @returns {Object} LLM analysis results
   */
  async analyzeContract(contractCode, contractInfo = {}) {
    try {
      logger.info('Starting LLM contract analysis', { 
        model: this.model,
        codeLength: contractCode.length 
      });

      const prompt = this.buildSecurityAnalysisPrompt(contractCode, contractInfo);
      
      const response = await this.callLLM(prompt);
      
      const analysis = this.parseAnalysisResponse(response);
      
      logger.info('LLM analysis completed', { 
        vulnerabilitiesFound: analysis.vulnerabilities?.length || 0,
        overallScore: analysis.overallScore 
      });

      return analysis;

    } catch (error) {
      logger.error('LLM analysis failed', { error: error.message });
      throw new Error(`LLM analysis failed: ${error.message}`);
    }
  }

  /**
   * Build comprehensive security analysis prompt for LLM
   * @param {string} contractCode - Solidity contract code
   * @param {Object} contractInfo - Additional contract information
   * @returns {string} Formatted prompt
   */
  buildSecurityAnalysisPrompt(contractCode, contractInfo) {
    const basePrompt = `You are an expert smart contract security auditor. Analyze the following Solidity code for security vulnerabilities and provide a comprehensive security assessment.

IMPORTANT: Respond ONLY with valid JSON in the exact format specified below. Do not include any explanatory text outside the JSON.

Required JSON Response Format:
{
  "vulnerabilities": [
    {
      "name": "Vulnerability Name",
      "description": "Detailed description of the vulnerability",
      "severity": "Low|Medium|High|Critical",
      "category": "reentrancy|access-control|arithmetic|unchecked-calls|gas-limit|timestamp-dependence|tx-origin|other",
      "affectedLines": [1, 2, 3],
      "codeSnippet": "vulnerable code snippet",
      "recommendation": "How to fix this vulnerability",
      "impact": "Potential impact description",
      "confidence": "Low|Medium|High"
    }
  ],
  "overallScore": 85,
  "riskLevel": "Low|Medium|High|Critical",
  "summary": "Brief overall security assessment",
  "recommendations": [
    "General recommendation 1",
    "General recommendation 2"
  ],
  "gasOptimizations": [
    {
      "description": "Gas optimization suggestion",
      "affectedLines": [1, 2],
      "potentialSavings": "Estimated gas savings"
    }
  ],
  "codeQuality": {
    "score": 80,
    "issues": ["Issue 1", "Issue 2"],
    "strengths": ["Strength 1", "Strength 2"]
  }
}

Contract Information:
- Contract Name: ${contractInfo.contractName || 'Unknown'}
- Functions Count: ${contractInfo.functions?.length || 0}
- Modifiers Count: ${contractInfo.modifiers?.length || 0}
- Code Complexity: ${contractInfo.complexity || 'Unknown'}

Solidity Code to Analyze:
\`\`\`solidity
${contractCode}
\`\`\`

Focus on these critical security areas:
1. Reentrancy attacks
2. Integer overflow/underflow
3. Access control issues
4. Unchecked external calls
5. Gas limit and DoS vulnerabilities
6. Timestamp dependence
7. tx.origin usage
8. Proper use of modifiers
9. State variable visibility
10. Function visibility and access patterns

Provide specific line numbers where vulnerabilities are found and actionable recommendations for fixes.`;

    return basePrompt;
  }

  /**
   * Call OpenRouter LLM API
   * @param {string} prompt - Analysis prompt
   * @returns {string} LLM response
   */
  async callLLM(prompt) {
    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a professional smart contract security auditor. Always respond with valid JSON only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 4000,
          temperature: 0.1,
          top_p: 0.9,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://smart-contract-auditor.com',
            'X-Title': 'Smart Contract Security Auditor',
          },
          timeout: this.timeout,
        }
      );

      if (!response.data?.choices?.[0]?.message?.content) {
        throw new Error('Invalid response from LLM API');
      }

      return response.data.choices[0].message.content;

    } catch (error) {
      if (error.response) {
        logger.error('LLM API error', { 
          status: error.response.status,
          data: error.response.data 
        });
        throw new Error(`LLM API error: ${error.response.status} - ${error.response.data?.error?.message || 'Unknown error'}`);
      } else if (error.request) {
        logger.error('LLM API network error', { error: error.message });
        throw new Error('Network error connecting to LLM API');
      } else {
        logger.error('LLM API request error', { error: error.message });
        throw new Error(`LLM API request error: ${error.message}`);
      }
    }
  }

  /**
   * Parse and validate LLM response
   * @param {string} response - Raw LLM response
   * @returns {Object} Parsed analysis results
   */
  parseAnalysisResponse(response) {
    try {
      // Clean the response to extract JSON
      let cleanResponse = response.trim();
      
      // Remove markdown code blocks if present
      cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Find JSON object in response
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }

      const analysis = JSON.parse(cleanResponse);

      // Validate required fields
      if (!analysis.vulnerabilities || !Array.isArray(analysis.vulnerabilities)) {
        analysis.vulnerabilities = [];
      }

      if (typeof analysis.overallScore !== 'number') {
        analysis.overallScore = this.calculateDefaultScore(analysis.vulnerabilities);
      }

      if (!analysis.riskLevel) {
        analysis.riskLevel = this.calculateRiskLevel(analysis.overallScore);
      }

      // Ensure all vulnerabilities have required fields
      analysis.vulnerabilities = analysis.vulnerabilities.map(vuln => ({
        name: vuln.name || 'Unknown Vulnerability',
        description: vuln.description || 'No description provided',
        severity: vuln.severity || 'Medium',
        category: vuln.category || 'other',
        affectedLines: Array.isArray(vuln.affectedLines) ? vuln.affectedLines : [],
        codeSnippet: vuln.codeSnippet || '',
        recommendation: vuln.recommendation || 'Review and fix this issue',
        impact: vuln.impact || 'Potential security risk',
        confidence: vuln.confidence || 'Medium',
      }));

      return {
        ...analysis,
        analyzedAt: new Date().toISOString(),
        model: this.model,
      };

    } catch (error) {
      logger.error('Failed to parse LLM response', { 
        error: error.message,
        response: response.substring(0, 500) 
      });

      // Return fallback analysis
      return {
        vulnerabilities: [],
        overallScore: 50,
        riskLevel: 'Medium',
        summary: 'Analysis failed - manual review required',
        recommendations: ['Manual security review recommended'],
        gasOptimizations: [],
        codeQuality: {
          score: 50,
          issues: ['Analysis parsing failed'],
          strengths: [],
        },
        analyzedAt: new Date().toISOString(),
        model: this.model,
        parseError: true,
      };
    }
  }

  /**
   * Calculate default security score based on vulnerabilities
   * @param {Array} vulnerabilities - Array of vulnerabilities
   * @returns {number} Security score (0-100)
   */
  calculateDefaultScore(vulnerabilities) {
    if (!vulnerabilities || vulnerabilities.length === 0) {
      return 90;
    }

    const severityWeights = {
      'Critical': 30,
      'High': 20,
      'Medium': 10,
      'Low': 5,
    };

    let totalDeduction = 0;
    vulnerabilities.forEach(vuln => {
      totalDeduction += severityWeights[vuln.severity] || 5;
    });

    return Math.max(0, 100 - totalDeduction);
  }

  /**
   * Calculate risk level based on score
   * @param {number} score - Security score
   * @returns {string} Risk level
   */
  calculateRiskLevel(score) {
    if (score >= 80) return 'Low';
    if (score >= 60) return 'Medium';
    if (score >= 40) return 'High';
    return 'Critical';
  }

  /**
   * Get model information
   * @returns {Object} Model configuration
   */
  getModelInfo() {
    return {
      model: this.model,
      baseURL: this.baseURL,
      timeout: this.timeout,
      configured: !!this.apiKey,
    };
  }
}

module.exports = new LLMService();

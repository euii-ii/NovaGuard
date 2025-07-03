// Real-time Development Controller - migrated from original backend
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

// Real-time Development Controller Class (from original backend)
class RealTimeDevelopmentController {
  constructor() {
    this.activeSessions = new Map();
    this.userPreferences = new Map();
    this.capabilities = {
      instantFeedback: {
        enabled: true,
        features: ['syntax-validation', 'quick-hints', 'contextual-help', 'performance-tips'],
        debounceDelay: 500,
        supportedLanguages: ['solidity']
      },
      codeCompletion: {
        enabled: true,
        contextAware: true,
        smartSuggestions: true,
        triggerCharacters: ['.', '(', ' ', '{'],
        maxSuggestions: 50
      },
      liveVulnerabilityDetection: {
        enabled: true,
        detectionMethods: ['pattern-based', 'rule-based', 'ai-powered'],
        severityLevels: ['low', 'medium', 'high'],
        realTimeAlerts: true,
        supportedCategories: [
          'reentrancy', 'access-control', 'arithmetic', 'timestamp-dependency',
          'unchecked-calls', 'delegatecall', 'selfdestruct'
        ]
      },
      syntaxValidation: {
        enabled: true,
        realTime: true,
        errorTypes: ['syntax', 'semantic', 'style'],
        quickFixes: true,
        cacheEnabled: true
      }
    };
  }

  // Validate request schemas (from original backend)
  validateCodeChangeRequest(data) {
    const errors = [];
    
    if (!data.filePath || typeof data.filePath !== 'string') {
      errors.push('filePath is required and must be a string');
    }
    
    if (!data.content || typeof data.content !== 'string') {
      errors.push('content is required and must be a string');
    }
    
    if (data.cursorPosition) {
      if (typeof data.cursorPosition.line !== 'number' || data.cursorPosition.line < 0) {
        errors.push('cursorPosition.line must be a non-negative number');
      }
      if (typeof data.cursorPosition.column !== 'number' || data.cursorPosition.column < 0) {
        errors.push('cursorPosition.column must be a non-negative number');
      }
    }
    
    return errors;
  }

  // Process code change with real-time analysis (from original backend)
  async processCodeChange(data, userId) {
    try {
      const sessionId = `session_${userId}_${Date.now()}`;
      
      // Perform syntax validation
      const syntaxValidation = this.validateSyntax(data.content, data.filePath);
      
      // Perform live vulnerability detection
      const vulnerabilityDetection = await this.detectVulnerabilities(data.content, data.filePath);
      
      // Get code completion suggestions if cursor position is provided
      let completions = null;
      if (data.cursorPosition) {
        completions = await this.getCodeCompletions(data.content, data.cursorPosition, data.filePath);
      }
      
      // Store session data
      this.activeSessions.set(sessionId, {
        userId,
        filePath: data.filePath,
        lastUpdate: new Date().toISOString(),
        changeType: data.changeType || 'edit'
      });
      
      // Log to database
      if (supabaseAdmin) {
        try {
          await supabaseAdmin
            .from('realtime_sessions')
            .insert({
              session_id: sessionId,
              user_id: userId,
              file_path: data.filePath,
              content_size: data.content.length,
              change_type: data.changeType || 'edit',
              syntax_errors: syntaxValidation.errors.length,
              vulnerabilities_found: vulnerabilityDetection.vulnerabilities.length,
              created_at: new Date().toISOString()
            });
        } catch (dbError) {
          console.warn('Database logging failed:', dbError.message);
        }
      }
      
      return {
        sessionId,
        syntaxValidation,
        vulnerabilityDetection,
        completions,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Process code change error:', error);
      throw error;
    }
  }

  // Validate Solidity syntax (from original backend)
  validateSyntax(content, filePath) {
    const errors = [];
    const warnings = [];
    const suggestions = [];
    
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmedLine = line.trim();
      
      // Check for pragma directive
      if (index === 0 && !content.includes('pragma solidity')) {
        warnings.push({
          line: lineNum,
          column: 1,
          message: 'Missing pragma solidity directive',
          severity: 'warning',
          type: 'syntax'
        });
      }
      
      // Check for missing semicolons
      if (trimmedLine && !trimmedLine.endsWith(';') && !trimmedLine.endsWith('{') && 
          !trimmedLine.endsWith('}') && !trimmedLine.includes('//') && !trimmedLine.includes('/*')) {
        if (trimmedLine.includes('=') || trimmedLine.includes('return') || 
            trimmedLine.includes('require') || trimmedLine.includes('emit')) {
          errors.push({
            line: lineNum,
            column: line.length,
            message: 'Missing semicolon',
            severity: 'error',
            type: 'syntax'
          });
        }
      }
      
      // Check for security issues
      if (trimmedLine.includes('tx.origin')) {
        warnings.push({
          line: lineNum,
          column: line.indexOf('tx.origin') + 1,
          message: 'Use of tx.origin is discouraged for security reasons',
          severity: 'warning',
          type: 'security'
        });
      }
      
      // Suggest improvements
      if (trimmedLine.includes('public') && trimmedLine.includes('function') && 
          !trimmedLine.includes('view') && !trimmedLine.includes('pure')) {
        suggestions.push({
          line: lineNum,
          column: line.indexOf('function') + 1,
          message: 'Consider adding view or pure modifier if function does not modify state',
          severity: 'info',
          type: 'optimization'
        });
      }
    });
    
    return {
      errors,
      warnings,
      suggestions,
      isValid: errors.length === 0,
      timestamp: new Date().toISOString()
    };
  }

  // Detect vulnerabilities in real-time (from original backend)
  async detectVulnerabilities(content, filePath) {
    try {
      const vulnerabilities = [];
      const lines = content.split('\n');
      
      // Pattern-based detection
      lines.forEach((line, index) => {
        const lineNum = index + 1;
        const trimmedLine = line.trim();
        
        // Reentrancy detection
        if (trimmedLine.includes('.call(') || trimmedLine.includes('.send(') || 
            trimmedLine.includes('.transfer(')) {
          vulnerabilities.push({
            type: 'reentrancy',
            line: lineNum,
            column: line.indexOf('.call(') + 1 || line.indexOf('.send(') + 1 || line.indexOf('.transfer(') + 1,
            message: 'Potential reentrancy vulnerability',
            severity: 'high',
            category: 'reentrancy',
            suggestion: 'Use checks-effects-interactions pattern or reentrancy guard'
          });
        }
        
        // Access control issues
        if (trimmedLine.includes('tx.origin')) {
          vulnerabilities.push({
            type: 'access-control',
            line: lineNum,
            column: line.indexOf('tx.origin') + 1,
            message: 'tx.origin should not be used for authorization',
            severity: 'medium',
            category: 'access-control',
            suggestion: 'Use msg.sender instead of tx.origin'
          });
        }
        
        // Dangerous functions
        if (trimmedLine.includes('selfdestruct')) {
          vulnerabilities.push({
            type: 'logic',
            line: lineNum,
            column: line.indexOf('selfdestruct') + 1,
            message: 'selfdestruct is deprecated and dangerous',
            severity: 'high',
            category: 'logic',
            suggestion: 'Consider alternative contract upgrade patterns'
          });
        }
      });
      
      // AI-powered detection (if enabled)
      if (process.env.OPENROUTER_API_KEY && content.length > 100) {
        try {
          const aiVulnerabilities = await this.detectVulnerabilitiesWithAI(content);
          vulnerabilities.push(...aiVulnerabilities);
        } catch (aiError) {
          console.warn('AI vulnerability detection failed:', aiError.message);
        }
      }
      
      return {
        vulnerabilities,
        riskScore: this.calculateRiskScore(vulnerabilities),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Vulnerability detection error:', error);
      return {
        vulnerabilities: [],
        riskScore: 0,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // AI-powered vulnerability detection (from original backend)
  async detectVulnerabilitiesWithAI(content) {
    try {
      const prompt = `
Analyze this Solidity code for security vulnerabilities and return a JSON array:

${content.substring(0, 1500)} // Limit for real-time analysis

Return ONLY a JSON array of vulnerabilities:
[
  {
    "type": "vulnerability_type",
    "line": 42,
    "column": 10,
    "message": "Description",
    "severity": "critical|high|medium|low",
    "category": "reentrancy|access-control|arithmetic|logic",
    "suggestion": "How to fix"
  }
]
      `;

      const response = await axios.post(`${OPENROUTER_CONFIG.baseURL}/chat/completions`, {
        model: 'google/gemma-2-9b-it:free',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 1000
      }, OPENROUTER_CONFIG);

      const aiResponse = response.data.choices[0].message.content;
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return [];
    } catch (error) {
      console.error('AI vulnerability detection error:', error);
      return [];
    }
  }

  // Get code completions (from original backend)
  async getCodeCompletions(content, position, filePath) {
    try {
      const lines = content.split('\n');
      const currentLine = lines[position.line] || '';
      const beforeCursor = currentLine.substring(0, position.column);
      
      const completions = [];
      
      // Basic Solidity completions
      const solidityKeywords = [
        'contract', 'function', 'modifier', 'event', 'struct', 'enum',
        'mapping', 'address', 'uint256', 'bool', 'string', 'bytes',
        'public', 'private', 'internal', 'external', 'view', 'pure',
        'payable', 'nonpayable', 'require', 'assert', 'revert'
      ];
      
      // Context-aware completions
      if (beforeCursor.includes('function ')) {
        completions.push(
          { text: 'public', description: 'Public function visibility' },
          { text: 'private', description: 'Private function visibility' },
          { text: 'internal', description: 'Internal function visibility' },
          { text: 'external', description: 'External function visibility' }
        );
      }
      
      if (beforeCursor.includes('require(')) {
        completions.push(
          { text: 'msg.sender', description: 'Message sender address' },
          { text: 'msg.value', description: 'Message value in wei' },
          { text: 'block.timestamp', description: 'Current block timestamp' }
        );
      }
      
      // Keyword completions
      solidityKeywords.forEach(keyword => {
        if (keyword.startsWith(beforeCursor.split(' ').pop())) {
          completions.push({
            text: keyword,
            description: `Solidity keyword: ${keyword}`,
            type: 'keyword'
          });
        }
      });
      
      return {
        completions: completions.slice(0, 20), // Limit to 20 suggestions
        position,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Code completion error:', error);
      return {
        completions: [],
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Calculate risk score based on vulnerabilities (from original backend)
  calculateRiskScore(vulnerabilities) {
    let score = 0;
    
    vulnerabilities.forEach(vuln => {
      switch (vuln.severity) {
        case 'critical':
          score += 10;
          break;
        case 'high':
          score += 7;
          break;
        case 'medium':
          score += 4;
          break;
        case 'low':
          score += 1;
          break;
      }
    });
    
    return Math.min(100, score); // Cap at 100
  }

  // Start development session (from original backend)
  startDevelopmentSession(userId, config = {}) {
    const sessionId = `dev_session_${userId}_${Date.now()}`;
    
    const sessionInfo = {
      sessionId,
      userId,
      startTime: new Date().toISOString(),
      config: {
        enableInstantFeedback: config.enableInstantFeedback !== false,
        enableLiveVulnerabilityDetection: config.enableLiveVulnerabilityDetection !== false,
        enableAIDetection: config.enableAIDetection || false,
        alertLevel: config.alertLevel || 'medium',
        realTimeAlerts: config.realTimeAlerts !== false
      },
      status: 'active'
    };
    
    this.activeSessions.set(sessionId, sessionInfo);
    
    return sessionInfo;
  }

  // End development session (from original backend)
  endDevelopmentSession(userId) {
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.userId === userId) {
        session.endTime = new Date().toISOString();
        session.status = 'ended';
        this.activeSessions.delete(sessionId);
      }
    }
  }

  // Set user preferences (from original backend)
  setUserPreferences(userId, preferences) {
    this.userPreferences.set(userId, {
      ...preferences,
      updatedAt: new Date().toISOString()
    });
  }

  // Get service status (from original backend)
  getStatus() {
    return {
      activeSessions: this.activeSessions.size,
      capabilities: this.capabilities,
      serviceMetrics: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString()
      },
      version: '2.0.0-serverless'
    };
  }
}

// Serverless function handler
const realtimeControllerHandler = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { userId, email } = req.auth;

  try {
    const controller = new RealTimeDevelopmentController();

    if (req.method === 'GET') {
      const { action } = req.query;

      switch (action) {
        case 'status':
          const status = controller.getStatus();
          res.status(200).json({
            success: true,
            data: status,
            metadata: {
              userId,
              userEmail: email,
              timestamp: new Date().toISOString()
            }
          });
          break;

        case 'capabilities':
          res.status(200).json({
            success: true,
            data: controller.capabilities,
            metadata: {
              userId,
              userEmail: email,
              timestamp: new Date().toISOString()
            }
          });
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid action. Supported actions: status, capabilities'
          });
      }
    } else if (req.method === 'POST') {
      const { action, filePath, content, cursorPosition, changeType, preferences, config } = req.body;

      switch (action) {
        case 'analyze':
          // Validate request
          const validationErrors = controller.validateCodeChangeRequest({
            filePath, content, cursorPosition, changeType
          });

          if (validationErrors.length > 0) {
            return res.status(400).json({
              success: false,
              error: 'Validation failed',
              details: validationErrors
            });
          }

          console.log(`Real-time code analysis from user: ${email} (${userId})`);

          const analysisResult = await controller.processCodeChange({
            filePath, content, cursorPosition, changeType
          }, userId);

          analysisResult.metadata = {
            userId,
            userEmail: email,
            timestamp: new Date().toISOString()
          };

          res.status(200).json({
            success: true,
            data: analysisResult
          });
          break;

        case 'start-session':
          console.log(`Starting development session for user: ${email} (${userId})`);
          
          const sessionInfo = controller.startDevelopmentSession(userId, config || {});
          
          res.status(200).json({
            success: true,
            data: sessionInfo,
            message: 'Development session started successfully'
          });
          break;

        case 'end-session':
          console.log(`Ending development session for user: ${email} (${userId})`);
          
          controller.endDevelopmentSession(userId);
          
          res.status(200).json({
            success: true,
            message: 'Development session ended successfully'
          });
          break;

        case 'set-preferences':
          if (!preferences) {
            return res.status(400).json({
              success: false,
              error: 'Preferences are required'
            });
          }

          console.log(`Setting preferences for user: ${email} (${userId})`);
          
          controller.setUserPreferences(userId, preferences);
          
          res.status(200).json({
            success: true,
            message: 'Preferences updated successfully',
            data: { preferences }
          });
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid action. Supported actions: analyze, start-session, end-session, set-preferences'
          });
      }
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Real-time controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Real-time controller failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Export with Clerk authentication middleware
module.exports = withAuth(realtimeControllerHandler);

// API Documentation endpoint - comprehensive backend features overview
const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
};

module.exports = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiDocumentation = {
    title: "Flash Audit - Comprehensive Smart Contract Security Platform",
    version: "2.0.0-serverless",
    description: "Complete serverless backend with all features migrated from Express backend",
    baseUrl: "https://your-vercel-app.vercel.app",
    authentication: "Clerk JWT Bearer Token",
    
    endpoints: {
      // Core System Endpoints
      system: {
        "/api/health": {
          method: "GET",
          auth: false,
          description: "Health check endpoint",
          response: "System health status and configuration"
        },
        "/api/status": {
          method: "GET",
          auth: false,
          description: "Detailed service status",
          response: "Service status, database connectivity, LLM availability"
        },
        "/api/docs": {
          method: "GET",
          auth: false,
          description: "API documentation (this endpoint)",
          response: "Complete API documentation"
        }
      },

      // Core Audit Endpoints
      audit: {
        "/api/audit": {
          method: "POST",
          auth: true,
          description: "Comprehensive smart contract analysis",
          body: {
            contractCode: "string (required)",
            options: {
              chain: "ethereum|polygon|bsc|arbitrum|optimism|base",
              analysisMode: "quick|comprehensive|defi-focused",
              agents: ["security", "quality", "economics", "defi", "crossChain", "mev"]
            }
          },
          response: "Detailed audit report with vulnerabilities, scores, and recommendations"
        },
        "/api/audit/address": {
          method: "POST",
          auth: true,
          description: "Analyze contract by blockchain address",
          body: {
            contractAddress: "string (required)",
            chain: "string (optional)"
          },
          response: "Contract analysis with source code fetching"
        },
        "/api/audit/results": {
          method: "GET",
          auth: true,
          description: "Get audit results by ID",
          query: { auditId: "string" },
          response: "Audit report details"
        }
      },

      // V1 API (Frontend Compatible)
      v1: {
        "/api/v1/audit/analyze": {
          method: "POST",
          auth: true,
          description: "Contract analysis (frontend compatible)",
          body: {
            contractCode: "string (required)",
            contractAddress: "string (optional)",
            chain: "string (optional)",
            analysisType: "quick|standard|comprehensive"
          },
          response: "Analysis results in frontend-expected format"
        },
        "/api/v1/audit/upload": {
          method: "POST",
          auth: true,
          description: "File upload and validation",
          body: "multipart/form-data or JSON",
          response: "Upload confirmation and validation results"
        },
        "/api/v1/realtime/validation": {
          method: "POST",
          auth: true,
          description: "Real-time code validation and suggestions",
          body: {
            content: "string (required)",
            filePath: "string (required)",
            position: { line: "number", column: "number" },
            action: "validate|vulnerability-check|completion|full-analysis"
          },
          response: "Syntax validation, vulnerabilities, code completions"
        }
      },

      // Advanced Services
      services: {
        "/api/services/llm": {
          method: "GET|POST",
          auth: true,
          description: "LLM service for AI analysis",
          actions: {
            GET: "Get LLM model information",
            POST: "Perform AI analysis or custom prompts"
          },
          body: {
            action: "analyze|custom-prompt",
            contractCode: "string (for analyze)",
            prompt: "string (for custom-prompt)",
            model: "string (optional)"
          },
          response: "AI analysis results or custom prompt response"
        },
        "/api/services/audit-engine": {
          method: "POST",
          auth: true,
          description: "Comprehensive audit engine with static + AI analysis",
          body: {
            contractCode: "string (required)",
            options: "object (optional)"
          },
          response: "Complete audit report with combined analysis"
        },
        "/api/services/web3": {
          method: "GET",
          auth: true,
          description: "Blockchain interaction service",
          query: {
            action: "chains|network-status|contract-info|transactions|bytecode-analysis",
            chain: "string (optional)",
            address: "string (for contract operations)",
            page: "number (for transactions)",
            offset: "number (for transactions)"
          },
          response: "Blockchain data and contract information"
        },
        "/api/services/tee-monitor": {
          method: "GET|POST",
          auth: true,
          description: "TEE monitoring and audit logging",
          actions: {
            GET: "Retrieve audit logs, verify integrity, get statistics",
            POST: "Log audit data"
          },
          response: "Audit logs, verification results, or logging confirmation"
        }
      },

      // Project Management
      projects: {
        "/api/projects/manage": {
          method: "GET|POST",
          auth: true,
          description: "Comprehensive project management",
          actions: {
            GET: "List projects, get analytics",
            POST: "Create, update, add contracts/members"
          },
          body: {
            action: "create|update|add-contract|add-member",
            projectData: "object (for create)",
            updateData: "object (for update)",
            contractData: "object (for add-contract)",
            memberData: "object (for add-member)"
          },
          response: "Project data, analytics, or operation results"
        }
      },

      // Contract Management
      contracts: {
        "/api/contracts/upload": {
          method: "POST",
          auth: true,
          description: "Contract upload with quick analysis",
          body: {
            contract_address: "string (optional)",
            contract_code: "string (required)",
            protocol_type: "string (optional)",
            chain_id: "string (optional)",
            name: "string (optional)",
            description: "string (optional)"
          },
          response: "Contract record and quick analysis results"
        }
      },

      // Real-time Development
      realtime: {
        "/api/terminal/execute": {
          method: "POST",
          auth: true,
          description: "Execute terminal commands",
          body: {
            command: "string (required)",
            workingDirectory: "string (optional)"
          },
          response: "Command execution results"
        },
        "/api/editor/files": {
          method: "GET|POST|PUT|DELETE",
          auth: true,
          description: "File operations for IDE",
          actions: {
            GET: "List files, read file content",
            POST: "Create new file",
            PUT: "Update file content",
            DELETE: "Delete file"
          },
          response: "File data or operation confirmation"
        }
      },

      // Monitoring
      monitoring: {
        "/api/monitoring/start": {
          method: "GET|POST",
          auth: true,
          description: "Contract monitoring service",
          actions: {
            GET: "Get monitoring status",
            POST: "Start monitoring session"
          },
          body: {
            contractAddress: "string (required)",
            chain: "string (optional)",
            config: "object (optional)"
          },
          response: "Monitoring session data and real-time metrics"
        }
      },

      // Collaboration
      collaboration: {
        "/api/collaboration/workspace": {
          method: "GET|POST",
          auth: true,
          description: "Collaborative workspace management",
          actions: {
            GET: "List user workspaces",
            POST: "Create workspace, join workspace, share audits"
          },
          body: {
            action: "create|join|share-audit",
            workspaceData: "object (for create)",
            workspaceId: "string (for join/share)",
            auditId: "string (for share-audit)"
          },
          response: "Workspace data or operation results"
        }
      },

      // Analytics
      analytics: {
        "/api/analytics/dashboard": {
          method: "GET",
          auth: true,
          description: "Comprehensive analytics dashboard",
          query: {
            action: "dashboard|trends|vulnerabilities|system",
            timeRange: "1h|24h|7d|30d|90d|1y",
            granularity: "hour|day (for trends)"
          },
          response: "Analytics data, trends, vulnerability analysis"
        }
      },

      // Deployment
      deployment: {
        "/api/deployment/deploy": {
          method: "POST",
          auth: true,
          description: "Smart contract deployment simulation",
          body: {
            contractCode: "string (required)",
            chain: "string (required)",
            constructorArgs: "array (optional)",
            gasLimit: "number (optional)"
          },
          response: "Deployment simulation results"
        },
        "/api/deployment/networks": {
          method: "GET",
          auth: true,
          description: "Supported blockchain networks",
          response: "List of supported networks with configuration"
        }
      }
    },

    // Authentication
    authentication: {
      type: "Bearer Token (Clerk JWT)",
      header: "Authorization: Bearer <token>",
      description: "All protected endpoints require Clerk authentication",
      publicEndpoints: ["/api/health", "/api/status", "/api/docs"]
    },

    // Error Responses
    errorResponses: {
      400: "Bad Request - Invalid input parameters",
      401: "Unauthorized - Missing or invalid authentication",
      403: "Forbidden - Insufficient permissions",
      404: "Not Found - Resource not found",
      405: "Method Not Allowed - HTTP method not supported",
      429: "Too Many Requests - Rate limit exceeded",
      500: "Internal Server Error - Server error occurred"
    },

    // Features Migrated from Backend
    migratedFeatures: {
      "LLM Service": "AI-powered contract analysis with multiple models",
      "Audit Engine": "Comprehensive static + AI analysis",
      "Web3 Service": "Multi-chain blockchain interactions",
      "TEE Monitor": "Secure audit logging and integrity verification",
      "Project Management": "Full project lifecycle management",
      "Real-time Development": "Live code validation and suggestions",
      "Monitoring Service": "Contract monitoring and alerting",
      "Collaboration Tools": "Team workspaces and audit sharing",
      "Analytics Dashboard": "Comprehensive usage and security analytics",
      "Contract Parser": "Solidity code parsing and analysis",
      "Deployment Tools": "Contract deployment simulation",
      "File Management": "IDE file operations",
      "Terminal Integration": "Command execution capabilities"
    },

    // Database Schema
    databaseTables: {
      "audit_reports": "Complete audit results and metadata",
      "audit_logs": "TEE audit logging for integrity",
      "projects": "Project management and team collaboration",
      "contracts": "Contract storage and metadata",
      "monitoring_sessions": "Real-time monitoring data",
      "collaborative_workspaces": "Team workspace management",
      "shared_audits": "Audit sharing and collaboration",
      "realtime_sessions": "Development session tracking",
      "contract_uploads": "File upload tracking",
      "llm_analysis_logs": "AI analysis logging"
    },

    // Environment Variables Required
    environmentVariables: {
      "CLERK_SECRET_KEY": "Clerk authentication secret",
      "SUPABASE_URL": "Supabase database URL",
      "SUPABASE_SERVICE_ROLE_KEY": "Supabase service role key",
      "SUPABASE_ANON_KEY": "Supabase anonymous key",
      "OPENROUTER_API_KEY": "OpenRouter API for LLM access",
      "KIMI_MODEL": "Kimi model identifier",
      "GEMMA_MODEL": "Gemma model identifier",
      "NODE_ENV": "Environment (production/development)"
    },

    generatedAt: new Date().toISOString(),
    version: "2.0.0-serverless",
    architecture: "Vercel Serverless Functions",
    totalEndpoints: 25,
    authenticationRequired: 22,
    publicEndpoints: 3
  };

  res.status(200).json(apiDocumentation);
};

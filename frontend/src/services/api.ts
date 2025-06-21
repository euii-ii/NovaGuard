import axios from 'axios';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Types
export interface ContractAuditRequest {
  contractCode: string;
  options?: {
    includeGasOptimization?: boolean;
    includeCodeQuality?: boolean;
    severityFilter?: string[];
  };
}

export interface AddressAuditRequest {
  contractAddress: string;
  chain: string;
  options?: {
    includeGasOptimization?: boolean;
    includeCodeQuality?: boolean;
    severityFilter?: string[];
  };
}

export interface Vulnerability {
  name: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  category: string;
  affectedLines: number[];
  codeSnippet?: string;
  source: 'static' | 'llm';
  confidence: string;
  recommendation?: string;
}

export interface AuditResult {
  auditId: string;
  status: 'completed' | 'failed' | 'in-progress';
  type: 'full-analysis' | 'bytecode-only';
  contractInfo: {
    name: string;
    functions: number;
    modifiers: number;
    events: number;
    complexity: number;
    linesOfCode: number;
    address?: string;
    chain?: string;
    chainId?: number;
    balance?: string;
    transactionCount?: number;
  };
  vulnerabilities: Vulnerability[];
  overallScore: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  severityCounts: {
    Critical: number;
    High: number;
    Medium: number;
    Low: number;
  };
  summary: string;
  recommendations: string[];
  gasOptimizations?: any[];
  codeQuality?: any;
  timestamp: string;
  executionTime: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

// API Service Class
class ApiService {
  // Health check
  async healthCheck(): Promise<any> {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Audit contract by source code - Updated to use correct backend endpoint
  async auditContract(request: ContractAuditRequest): Promise<AuditResult> {
    try {
      const payload = {
        contractCode: request.contractCode,
        analysisOptions: {
          depth: 'comprehensive',
          includeGasOptimization: request.options?.includeGasOptimization ?? true,
          includeBestPractices: request.options?.includeCodeQuality ?? true,
          enableAIAnalysis: true
        }
      };

      const response = await api.post<ApiResponse<AuditResult>>('/api/v1/contracts/comprehensive', payload);
      if (response.data.success) {
        return response.data.results || response.data.data;
      } else {
        throw new Error(response.data.error || 'Audit failed');
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Audit contract by address - Updated to use correct backend endpoint
  async auditContractByAddress(request: AddressAuditRequest): Promise<AuditResult> {
    try {
      const payload = {
        contractAddress: request.contractAddress,
        analysisOptions: {
          depth: 'comprehensive',
          includeGasOptimization: request.options?.includeGasOptimization ?? true,
          includeBestPractices: request.options?.includeCodeQuality ?? true,
          enableAIAnalysis: true
        }
      };

      const response = await api.post<ApiResponse<AuditResult>>('/api/v1/contracts/comprehensive', payload);
      if (response.data.success) {
        return response.data.results || response.data.data;
      } else {
        throw new Error(response.data.error || 'Audit failed');
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Multi-agent AI analysis - New method for advanced AI analysis
  async multiAgentAnalysis(contractCode: string, agents: string[] = ['security', 'quality']): Promise<any> {
    try {
      const payload = {
        contractCode,
        analysisType: 'comprehensive',
        agents,
        options: {}
      };

      const response = await api.post('/api/v1/contracts/analyze', payload);
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Multi-agent analysis failed');
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // DeFi economic analysis - New method for DeFi protocols
  async defiEconomicAnalysis(contractCode: string, protocolType?: string): Promise<any> {
    try {
      const payload = {
        contractCode,
        protocolType,
        agents: ['defi', 'economics'],
        autoDetectProtocol: !protocolType
      };

      const response = await api.post('/api/v1/defi/analyze', payload);
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'DeFi analysis failed');
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Contract monitoring - New method for real-time monitoring
  async startContractMonitoring(contractAddress: string, chain: string = 'ethereum'): Promise<any> {
    try {
      const response = await api.get(`/api/v1/contracts/${contractAddress}/monitor`, {
        params: { chain }
      });
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to start monitoring');
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get audit history - Updated endpoint
  async getAuditHistory(filters?: any): Promise<any[]> {
    try {
      const response = await api.get('/api/v1/contracts/history', { params: filters });
      if (response.data.success) {
        return response.data.history || response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch audit history');
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get audit results by ID - New method
  async getAuditResults(auditId: string): Promise<AuditResult> {
    try {
      const response = await api.get(`/api/v1/contracts/results/${auditId}`);
      if (response.data.success) {
        return response.data.results || response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch audit results');
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Generate audit report - New method
  async generateAuditReport(auditId: string, format: string = 'json'): Promise<any> {
    try {
      const response = await api.get(`/api/v1/contracts/report/${auditId}`, {
        params: { format, includeRecommendations: true }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get supported chains - Updated endpoint
  async getSupportedChains(): Promise<any> {
    try {
      const response = await api.get('/api/v1/chains/supported');
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch supported chains');
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get available AI agents - New method
  async getAvailableAgents(): Promise<any> {
    try {
      const response = await api.get('/api/v1/agents/available');
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch available agents');
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Verify contract on blockchain - New method
  async verifyContract(contractAddress: string, chain: string): Promise<any> {
    try {
      const payload = { contractAddress, chain };
      const response = await api.post('/api/v1/contracts/verify', payload);
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Contract verification failed');
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get audit statistics - Updated with real backend call
  async getAuditStatistics(): Promise<any> {
    try {
      // Try to get real statistics from backend
      const response = await api.get('/api/v1/analytics/dashboard');
      if (response.data.success) {
        return response.data.data;
      } else {
        // Fallback to mock data if endpoint not available
        return this.getMockStatistics();
      }
    } catch (error) {
      // Fallback to mock data if backend is not available
      console.warn('Backend statistics not available, using mock data');
      return this.getMockStatistics();
    }
  }

  // Get statistics (alias for compatibility)
  async getStatistics(): Promise<any> {
    return this.getAuditStatistics();
  }

  // Mock statistics for fallback
  private getMockStatistics(): any {
    return {
      totalAudits: Math.floor(Math.random() * 1000) + 100,
      averageScore: Math.floor(Math.random() * 40) + 60,
      criticalVulns: Math.floor(Math.random() * 50),
      highVulns: Math.floor(Math.random() * 100),
      recentAudits: Array.from({ length: 5 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        score: Math.floor(Math.random() * 100)
      }))
    };
  }

  // Team collaboration methods
  async startTeamReview(auditId: string, teamId: string, reviewConfig: any = {}): Promise<any> {
    try {
      const payload = { auditId, teamId, reviewConfig };
      const response = await api.post('/api/v1/contracts/team-review', payload);
      if (response.data.success) {
        return response.data;
      } else {
        throw new Error(response.data.error || 'Failed to start team review');
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Error handler
  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Server responded with error status
        const message = error.response.data?.message || error.response.data?.error || error.message;
        return new Error(`API Error: ${message}`);
      } else if (error.request) {
        // Request was made but no response received
        return new Error('Network Error: Unable to connect to the server');
      }
    }
    return new Error(error.message || 'Unknown error occurred');
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;

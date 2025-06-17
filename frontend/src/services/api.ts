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

  // Audit contract by source code
  async auditContract(request: ContractAuditRequest): Promise<AuditResult> {
    try {
      const response = await api.post<ApiResponse<AuditResult>>('/api/audit/contract', request);
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Audit failed');
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Audit contract by address
  async auditContractByAddress(request: AddressAuditRequest): Promise<AuditResult> {
    try {
      const response = await api.post<ApiResponse<AuditResult>>('/api/audit/address', request);
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Audit failed');
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get audit history
  async getAuditHistory(filters?: any): Promise<any[]> {
    try {
      const response = await api.get('/api/audit/history', { params: filters });
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch audit history');
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get audit statistics
  async getAuditStatistics(): Promise<any> {
    try {
      const response = await api.get('/api/audit/statistics');
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch statistics');
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get supported chains
  async getSupportedChains(): Promise<any> {
    try {
      const response = await api.get('/api/audit/chains');
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch supported chains');
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Verify audit integrity
  async verifyAuditIntegrity(): Promise<any> {
    try {
      const response = await api.post('/api/audit/verify-integrity');
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to verify integrity');
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get audit service health
  async getAuditHealth(): Promise<any> {
    try {
      const response = await api.get('/api/audit/health');
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to get audit health');
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

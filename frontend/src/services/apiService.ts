// API Service for connecting frontend to backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface AuditRequest {
  contractCode: string;
  contractAddress?: string;
  chain?: string;
  analysisType?: 'quick' | 'standard' | 'comprehensive';
  options?: {
    includeGasOptimization?: boolean;
    includeCrossChainAnalysis?: boolean;
    includeDefiRisks?: boolean;
    includeMevAnalysis?: boolean;
  };
}

export interface AuditResponse {
  success: boolean;
  auditId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results?: {
    vulnerabilities: Array<{
      name: string;
      severity: 'Low' | 'Medium' | 'High' | 'Critical';
      description: string;
      affectedLines: number[];
      fixSuggestion: string;
    }>;
    securityScore: number;
    riskCategory: {
      label: 'Low Risk' | 'Medium Risk' | 'High Risk';
      justification: string;
    };
    codeInsights?: {
      gasOptimizationTips?: string[];
      antiPatternNotices?: string[];
      dangerousUsage?: string[];
    };
  };
  error?: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
  environment: string;
  database?: {
    connected: boolean;
    status: string;
  };
  ai?: {
    models: string[];
    status: string;
  };
}

class ApiService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Health check
  async checkHealth(): Promise<HealthResponse> {
    return this.makeRequest<HealthResponse>('/health');
  }

  // Test connection
  async testConnection(): Promise<{ connected: boolean; message: string }> {
    try {
      const health = await this.checkHealth();
      return {
        connected: true,
        message: `Connected to ${health.environment} environment`
      };
    } catch (error) {
      return {
        connected: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Audit endpoints
  async submitAudit(auditRequest: AuditRequest): Promise<AuditResponse> {
    return this.makeRequest<AuditResponse>('/api/v1/audit/analyze', {
      method: 'POST',
      body: JSON.stringify(auditRequest),
    });
  }

  async getAuditStatus(auditId: string): Promise<AuditResponse> {
    return this.makeRequest<AuditResponse>(`/api/v1/audit/status/${auditId}`);
  }

  async getAuditResult(auditId: string): Promise<AuditResponse> {
    return this.makeRequest<AuditResponse>(`/api/v1/audit/result/${auditId}`);
  }

  // Upload contract file
  async uploadContract(file: File): Promise<{ success: boolean; contractCode: string; error?: string }> {
    const formData = new FormData();
    formData.append('contract', file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/audit/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  }

  // Multi-agent analysis
  async performMultiAgentAnalysis(
    contractCode: string,
    analysisType: 'standard' | 'comprehensive' = 'standard'
  ): Promise<AuditResponse> {
    return this.makeRequest<AuditResponse>('/api/v1/audit/multi-agent', {
      method: 'POST',
      body: JSON.stringify({
        contractCode,
        analysisType,
      }),
    });
  }

  // Get user audit history
  async getUserAudits(userId: string, limit = 10, offset = 0): Promise<{
    success: boolean;
    audits: AuditResponse[];
    total: number;
  }> {
    return this.makeRequest(`/api/v1/audit/user/${userId}?limit=${limit}&offset=${offset}`);
  }

  // AI model status
  async getAIModelStatus(): Promise<{
    success: boolean;
    models: Record<string, {
      status: string;
      lastUsed?: string;
      responseTime?: number;
    }>;
  }> {
    return this.makeRequest('/api/v1/ai/models/status');
  }

  // Real-time monitoring endpoints
  async startMonitoring(contractAddress: string, chain: string): Promise<{
    success: boolean;
    sessionId: string;
    message: string;
  }> {
    return this.makeRequest('/api/v1/monitor/start', {
      method: 'POST',
      body: JSON.stringify({ contractAddress, chain }),
    });
  }

  async stopMonitoring(sessionId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.makeRequest(`/api/v1/monitor/stop/${sessionId}`, {
      method: 'POST',
    });
  }

  // Chain IDE endpoints
  async getChainIDEStatus(): Promise<{
    success: boolean;
    status: string;
    supportedChains: string[];
  }> {
    return this.makeRequest('/api/v1/chain-ide/status');
  }

  // Collaborative tools
  async createWorkspace(name: string, description?: string): Promise<{
    success: boolean;
    workspaceId: string;
    message: string;
  }> {
    return this.makeRequest('/api/v1/collaborative/workspace', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  async getWorkspaces(userId: string): Promise<{
    success: boolean;
    workspaces: Array<{
      id: string;
      name: string;
      description?: string;
      memberCount: number;
      createdAt: string;
    }>;
  }> {
    return this.makeRequest(`/api/v1/collaborative/workspaces/${userId}`);
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;

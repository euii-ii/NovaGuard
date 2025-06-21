import axios, { AxiosResponse } from 'axios';

export interface BackendHealthStatus {
  status: string;
  timestamp: string;
  version: string;
  environment: string;
  services: {
    monitoring: {
      status: string;
      monitoredContracts?: number;
      activeConnections?: number;
    };
    analytics: {
      status: string;
      cacheSize?: number;
    };
  };
}

export interface ConnectionTestResult {
  isConnected: boolean;
  responseTime: number;
  error?: string;
  healthData?: BackendHealthStatus;
  endpoints: {
    [key: string]: {
      status: 'success' | 'error' | 'timeout';
      responseTime: number;
      error?: string;
    };
  };
}

class BackendConnectionService {
  private readonly baseURL: string;
  private readonly timeout: number = 10000; // 10 seconds

  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
  }

  /**
   * Test connection to backend server
   */
  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    const result: ConnectionTestResult = {
      isConnected: false,
      responseTime: 0,
      endpoints: {}
    };

    try {
      // Test health endpoint
      const healthResponse = await this.testEndpoint('/health');
      result.endpoints['/health'] = healthResponse;
      
      if (healthResponse.status === 'success') {
        result.isConnected = true;
        result.healthData = healthResponse.data;
      }

      // Test other critical endpoints
      const endpointsToTest = [
        '/api/v1/chains/supported',
        '/api/v1/agents/available',
        '/api/v1/analytics/dashboard'
      ];

      for (const endpoint of endpointsToTest) {
        result.endpoints[endpoint] = await this.testEndpoint(endpoint);
      }

      result.responseTime = Date.now() - startTime;
      return result;

    } catch (error) {
      result.responseTime = Date.now() - startTime;
      result.error = error instanceof Error ? error.message : 'Unknown error';
      return result;
    }
  }

  /**
   * Test a specific endpoint
   */
  private async testEndpoint(endpoint: string): Promise<{
    status: 'success' | 'error' | 'timeout';
    responseTime: number;
    error?: string;
    data?: any;
  }> {
    const startTime = Date.now();
    
    try {
      const response: AxiosResponse = await axios.get(`${this.baseURL}${endpoint}`, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return {
        status: 'success',
        responseTime: Date.now() - startTime,
        data: response.data
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          return {
            status: 'timeout',
            responseTime,
            error: 'Request timeout'
          };
        }
        
        return {
          status: 'error',
          responseTime,
          error: error.response?.data?.message || error.message
        };
      }

      return {
        status: 'error',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get backend health status
   */
  async getHealthStatus(): Promise<BackendHealthStatus | null> {
    try {
      const response = await axios.get(`${this.baseURL}/health`, {
        timeout: this.timeout
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get backend health status:', error);
      return null;
    }
  }

  /**
   * Check if backend is available
   */
  async isBackendAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseURL}/health`, {
        timeout: 5000 // Shorter timeout for quick check
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get backend configuration info
   */
  async getBackendInfo(): Promise<any> {
    try {
      const healthStatus = await this.getHealthStatus();
      if (!healthStatus) return null;

      return {
        version: healthStatus.version,
        environment: healthStatus.environment,
        timestamp: healthStatus.timestamp,
        services: healthStatus.services
      };
    } catch (error) {
      console.error('Failed to get backend info:', error);
      return null;
    }
  }

  /**
   * Test WebSocket connection (for real-time features)
   */
  async testWebSocketConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const wsUrl = this.baseURL.replace('http', 'ws') + '/ws';
        const ws = new WebSocket(wsUrl);
        
        const timeout = setTimeout(() => {
          ws.close();
          resolve(false);
        }, 5000);

        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };

      } catch (error) {
        resolve(false);
      }
    });
  }

  /**
   * Monitor backend connection status
   */
  startConnectionMonitoring(
    onStatusChange: (isConnected: boolean) => void,
    interval: number = 30000 // 30 seconds
  ): () => void {
    let isMonitoring = true;
    
    const checkConnection = async () => {
      if (!isMonitoring) return;
      
      const isConnected = await this.isBackendAvailable();
      onStatusChange(isConnected);
      
      if (isMonitoring) {
        setTimeout(checkConnection, interval);
      }
    };

    // Start monitoring
    checkConnection();

    // Return stop function
    return () => {
      isMonitoring = false;
    };
  }

  /**
   * Get connection statistics
   */
  async getConnectionStats(): Promise<{
    latency: number;
    uptime: boolean;
    lastChecked: string;
  }> {
    const startTime = Date.now();
    const isUp = await this.isBackendAvailable();
    const latency = Date.now() - startTime;

    return {
      latency,
      uptime: isUp,
      lastChecked: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const backendConnectionService = new BackendConnectionService();
export default backendConnectionService;

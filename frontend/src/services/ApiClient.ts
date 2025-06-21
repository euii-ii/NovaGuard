import {
  ApiResponse,
  RateLimitInfo,
  AuthToken,
  NetworkError,
  RateLimitError,
  ValidationError
} from '../types/vulnerability';

export interface ApiClientConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export class ApiClient {
  private config: ApiClientConfig;
  private authToken: AuthToken | null = null;

  constructor(config?: Partial<ApiClientConfig>) {
    this.config = {
      baseUrl: process.env.REACT_APP_API_BASE_URL || 'https://api.chainide-security.com/v1',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };
  }

  async get<T>(
    endpoint: string,
    params?: Record<string, any>,
    abortSignal?: AbortSignal
  ): Promise<ApiResponse<T>> {
    const url = new URL(endpoint, this.config.baseUrl);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return this.makeRequest<T>('GET', url.toString(), undefined, abortSignal);
  }

  async post<T>(
    endpoint: string,
    data?: any,
    abortSignal?: AbortSignal
  ): Promise<ApiResponse<T>> {
    const url = new URL(endpoint, this.config.baseUrl).toString();
    return this.makeRequest<T>('POST', url, data, abortSignal);
  }

  async put<T>(
    endpoint: string,
    data?: any,
    abortSignal?: AbortSignal
  ): Promise<ApiResponse<T>> {
    const url = new URL(endpoint, this.config.baseUrl).toString();
    return this.makeRequest<T>('PUT', url, data, abortSignal);
  }

  async delete<T>(
    endpoint: string,
    abortSignal?: AbortSignal
  ): Promise<ApiResponse<T>> {
    const url = new URL(endpoint, this.config.baseUrl).toString();
    return this.makeRequest<T>('DELETE', url, undefined, abortSignal);
  }

  private async makeRequest<T>(
    method: string,
    url: string,
    data?: any,
    abortSignal?: AbortSignal,
    attempt: number = 1
  ): Promise<ApiResponse<T>> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'ChainIDE-Security-Scanner/1.0.0'
      };

      // Add authentication if available
      if (this.authToken?.token) {
        headers['Authorization'] = `Bearer ${this.authToken.token}`;
      }

      // Add API key if available
      if (this.config.apiKey) {
        headers['X-API-Key'] = this.config.apiKey;
      }

      const requestOptions: RequestInit = {
        method,
        headers,
        signal: abortSignal
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        requestOptions.body = JSON.stringify(data);
      }

      // Create timeout controller
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), this.config.timeout);

      // Combine abort signals
      const combinedSignal = this.combineAbortSignals([
        abortSignal,
        timeoutController.signal
      ].filter(Boolean) as AbortSignal[]);

      requestOptions.signal = combinedSignal;

      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);

      // Handle rate limiting
      if (response.status === 429) {
        const rateLimitInfo = this.parseRateLimitHeaders(response.headers);
        throw new RateLimitError('Rate limit exceeded', rateLimitInfo);
      }

      // Handle authentication errors
      if (response.status === 401) {
        await this.handleAuthError();
        // Retry once after refreshing token
        if (attempt === 1) {
          return this.makeRequest<T>(method, url, data, abortSignal, attempt + 1);
        }
      }

      const responseData = await response.json();

      if (!response.ok) {
        throw new NetworkError(
          responseData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
          {
            status: response.status,
            statusText: response.statusText,
            data: responseData
          }
        );
      }

      return {
        success: true,
        data: responseData.data || responseData,
        metadata: {
          requestId: response.headers.get('X-Request-ID') || '',
          timestamp: new Date().toISOString(),
          version: response.headers.get('X-API-Version') || '1.0.0'
        }
      };

    } catch (error: any) {
      // Handle abort errors
      if (error.name === 'AbortError') {
        throw error;
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NetworkError('Network connection failed', error);
      }

      // Retry logic for transient errors
      if (this.shouldRetry(error, attempt)) {
        await this.delay(this.config.retryDelay * attempt);
        return this.makeRequest<T>(method, url, data, abortSignal, attempt + 1);
      }

      // Re-throw known errors
      if (error instanceof NetworkError || error instanceof RateLimitError) {
        throw error;
      }

      // Wrap unknown errors
      throw new NetworkError(`Request failed: ${error.message}`, error);
    }
  }

  private combineAbortSignals(signals: AbortSignal[]): AbortSignal {
    if (signals.length === 0) {
      return new AbortController().signal;
    }
    
    if (signals.length === 1) {
      return signals[0];
    }

    const controller = new AbortController();
    
    signals.forEach(signal => {
      if (signal.aborted) {
        controller.abort();
        return;
      }
      
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    });

    return controller.signal;
  }

  private parseRateLimitHeaders(headers: Headers): RateLimitInfo {
    return {
      limit: parseInt(headers.get('X-RateLimit-Limit') || '100'),
      remaining: parseInt(headers.get('X-RateLimit-Remaining') || '0'),
      resetTime: parseInt(headers.get('X-RateLimit-Reset') || String(Date.now() + 3600000)),
      retryAfter: parseInt(headers.get('Retry-After') || '60')
    };
  }

  private async handleAuthError(): Promise<void> {
    if (this.authToken?.refreshToken) {
      try {
        const response = await this.post<AuthToken>('/auth/refresh', {
          refreshToken: this.authToken.refreshToken
        });
        
        if (response.success && response.data) {
          this.authToken = response.data;
        }
      } catch (error) {
        // Clear invalid token
        this.authToken = null;
        throw new ValidationError('Authentication failed');
      }
    }
  }

  private shouldRetry(error: any, attempt: number): boolean {
    if (attempt >= this.config.retryAttempts) {
      return false;
    }

    // Retry on network errors and 5xx server errors
    if (error instanceof NetworkError) {
      const statusCode = error.details?.status;
      return !statusCode || statusCode >= 500;
    }

    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getRateLimit(): Promise<RateLimitInfo> {
    try {
      const response = await this.get<RateLimitInfo>('/rate-limit');
      return response.data || {
        limit: 100,
        remaining: 100,
        resetTime: Date.now() + 3600000
      };
    } catch (error) {
      // Return default if rate limit check fails
      return {
        limit: 100,
        remaining: 100,
        resetTime: Date.now() + 3600000
      };
    }
  }

  setAuthToken(token: AuthToken): void {
    this.authToken = token;
  }

  clearAuthToken(): void {
    this.authToken = null;
  }

  getConfig(): ApiClientConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<ApiClientConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

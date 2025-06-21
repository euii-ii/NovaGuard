import { AuthToken, ValidationError } from '../types/vulnerability';

export interface AuthConfig {
  apiKey?: string;
  tokenEndpoint: string;
  refreshEndpoint: string;
  clientId?: string;
  clientSecret?: string;
}

export class AuthMiddleware {
  private config: AuthConfig;
  private currentToken: AuthToken | null = null;
  private refreshPromise: Promise<AuthToken> | null = null;

  constructor(config: AuthConfig) {
    this.config = config;
    this.loadTokenFromStorage();
  }

  async authenticate(): Promise<AuthToken> {
    if (this.currentToken && this.isTokenValid(this.currentToken)) {
      return this.currentToken;
    }

    if (this.currentToken?.refreshToken && this.isRefreshTokenValid(this.currentToken)) {
      return this.refreshToken();
    }

    return this.getNewToken();
  }

  async refreshToken(): Promise<AuthToken> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const token = await this.refreshPromise;
      this.currentToken = token;
      this.saveTokenToStorage(token);
      return token;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<AuthToken> {
    if (!this.currentToken?.refreshToken) {
      throw new ValidationError('No refresh token available');
    }

    const response = await fetch(this.config.refreshEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken: this.currentToken.refreshToken,
        clientId: this.config.clientId
      })
    });

    if (!response.ok) {
      throw new ValidationError('Token refresh failed');
    }

    const data = await response.json();
    return this.parseTokenResponse(data);
  }

  private async getNewToken(): Promise<AuthToken> {
    if (this.config.apiKey) {
      // API Key authentication
      return {
        token: this.config.apiKey,
        expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year
        scope: ['scan', 'export']
      };
    }

    if (this.config.clientId && this.config.clientSecret) {
      // OAuth2 Client Credentials flow
      return this.performClientCredentialsFlow();
    }

    throw new ValidationError('No authentication method configured');
  }

  private async performClientCredentialsFlow(): Promise<AuthToken> {
    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${this.config.clientId}:${this.config.clientSecret}`)}`
      },
      body: 'grant_type=client_credentials&scope=scan export'
    });

    if (!response.ok) {
      throw new ValidationError('Authentication failed');
    }

    const data = await response.json();
    return this.parseTokenResponse(data);
  }

  private parseTokenResponse(data: any): AuthToken {
    return {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
      refreshToken: data.refresh_token,
      scope: data.scope ? data.scope.split(' ') : ['scan']
    };
  }

  private isTokenValid(token: AuthToken): boolean {
    return token.expiresAt > Date.now() + (5 * 60 * 1000); // 5 minutes buffer
  }

  private isRefreshTokenValid(token: AuthToken): boolean {
    // Refresh tokens typically have longer expiry, assume valid if exists
    return !!token.refreshToken;
  }

  private loadTokenFromStorage(): void {
    try {
      const stored = localStorage.getItem('chainide_auth_token');
      if (stored) {
        this.currentToken = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load auth token from storage:', error);
    }
  }

  private saveTokenToStorage(token: AuthToken): void {
    try {
      localStorage.setItem('chainide_auth_token', JSON.stringify(token));
    } catch (error) {
      console.warn('Failed to save auth token to storage:', error);
    }
  }

  clearToken(): void {
    this.currentToken = null;
    localStorage.removeItem('chainide_auth_token');
  }

  getCurrentToken(): AuthToken | null {
    return this.currentToken;
  }

  hasValidToken(): boolean {
    return this.currentToken ? this.isTokenValid(this.currentToken) : false;
  }

  getAuthHeaders(): Record<string, string> {
    if (!this.currentToken) {
      return {};
    }

    if (this.config.apiKey) {
      return {
        'X-API-Key': this.currentToken.token
      };
    }

    return {
      'Authorization': `Bearer ${this.currentToken.token}`
    };
  }
}

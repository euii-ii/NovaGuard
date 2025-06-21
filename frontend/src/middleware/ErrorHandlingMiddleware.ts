import {
  VulnerabilityError,
  NetworkError,
  ValidationError,
  RateLimitError
} from '../types/vulnerability';

export interface ErrorContext {
  requestId?: string;
  userId?: string;
  timestamp: string;
  userAgent?: string;
  url?: string;
  method?: string;
  additionalData?: any;
}

export interface ErrorReport {
  error: VulnerabilityError;
  context: ErrorContext;
  stackTrace?: string;
  handled: boolean;
}

export type ErrorHandler = (error: VulnerabilityError, context: ErrorContext) => void | Promise<void>;

export class ErrorHandlingMiddleware {
  private errorHandlers: Map<string, ErrorHandler[]> = new Map();
  private globalHandlers: ErrorHandler[] = [];
  private errorReports: ErrorReport[] = [];
  private maxReports: number = 100;

  constructor() {
    // Set up global error handlers
    this.setupGlobalErrorHandlers();
  }

  // Register error handler for specific error types
  onError(errorType: string, handler: ErrorHandler): void {
    if (!this.errorHandlers.has(errorType)) {
      this.errorHandlers.set(errorType, []);
    }
    this.errorHandlers.get(errorType)!.push(handler);
  }

  // Register global error handler
  onAnyError(handler: ErrorHandler): void {
    this.globalHandlers.push(handler);
  }

  // Handle error with context
  async handleError(error: any, context: Partial<ErrorContext> = {}): Promise<VulnerabilityError> {
    const vulnError = this.normalizeError(error);
    const fullContext: ErrorContext = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...context
    };

    // Create error report
    const report: ErrorReport = {
      error: vulnError,
      context: fullContext,
      stackTrace: error.stack,
      handled: true
    };

    // Store report
    this.storeErrorReport(report);

    // Execute specific handlers
    const specificHandlers = this.errorHandlers.get(vulnError.constructor.name) || [];
    for (const handler of specificHandlers) {
      try {
        await handler(vulnError, fullContext);
      } catch (handlerError) {
        console.error('Error handler failed:', handlerError);
      }
    }

    // Execute global handlers
    for (const handler of this.globalHandlers) {
      try {
        await handler(vulnError, fullContext);
      } catch (handlerError) {
        console.error('Global error handler failed:', handlerError);
      }
    }

    return vulnError;
  }

  // Normalize any error to VulnerabilityError
  private normalizeError(error: any): VulnerabilityError {
    if (error instanceof VulnerabilityError) {
      return error;
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return new NetworkError('Network connection failed', error);
    }

    if (error.name === 'AbortError') {
      return new VulnerabilityError('Operation was cancelled', 'OPERATION_CANCELLED', 499, error);
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new NetworkError('Network connection failed', error);
    }

    // Default to generic VulnerabilityError
    return new VulnerabilityError(
      error.message || 'Unknown error occurred',
      error.code || 'UNKNOWN_ERROR',
      error.statusCode || 500,
      error
    );
  }

  // Store error report with rotation
  private storeErrorReport(report: ErrorReport): void {
    this.errorReports.push(report);
    
    // Rotate reports if we exceed max
    if (this.errorReports.length > this.maxReports) {
      this.errorReports = this.errorReports.slice(-this.maxReports);
    }

    // Also store in localStorage for persistence
    try {
      const recentReports = this.errorReports.slice(-10); // Keep last 10
      localStorage.setItem('chainide_error_reports', JSON.stringify(recentReports));
    } catch (storageError) {
      console.warn('Failed to store error reports:', storageError);
    }
  }

  // Set up global error handlers
  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, {
        additionalData: { type: 'unhandledrejection' }
      });
    });

    // Handle global errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error || new Error(event.message), {
        additionalData: { 
          type: 'global_error',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });
  }

  // Get error statistics
  getErrorStats(): {
    totalErrors: number;
    errorsByType: { [type: string]: number };
    recentErrors: ErrorReport[];
  } {
    const errorsByType: { [type: string]: number } = {};
    
    this.errorReports.forEach(report => {
      const type = report.error.constructor.name;
      errorsByType[type] = (errorsByType[type] || 0) + 1;
    });

    return {
      totalErrors: this.errorReports.length,
      errorsByType,
      recentErrors: this.errorReports.slice(-5)
    };
  }

  // Clear error reports
  clearErrorReports(): void {
    this.errorReports = [];
    localStorage.removeItem('chainide_error_reports');
  }

  // Export error reports
  exportErrorReports(): string {
    return JSON.stringify(this.errorReports, null, 2);
  }

  // Create user-friendly error messages
  getUserFriendlyMessage(error: VulnerabilityError): string {
    switch (error.constructor.name) {
      case 'NetworkError':
        return 'Network connection failed. Please check your internet connection and try again.';
      
      case 'RateLimitError':
        const rateLimitError = error as RateLimitError;
        const retryAfter = rateLimitError.rateLimitInfo.retryAfter || 60;
        return `Too many requests. Please wait ${retryAfter} seconds before trying again.`;
      
      case 'ValidationError':
        return `Invalid input: ${error.message}`;
      
      default:
        if (error.code === 'OPERATION_CANCELLED') {
          return 'Operation was cancelled.';
        }
        return 'An unexpected error occurred. Please try again.';
    }
  }

  // Create retry strategy based on error type
  getRetryStrategy(error: VulnerabilityError): {
    shouldRetry: boolean;
    retryAfter: number;
    maxRetries: number;
  } {
    switch (error.constructor.name) {
      case 'NetworkError':
        return {
          shouldRetry: true,
          retryAfter: 2000, // 2 seconds
          maxRetries: 3
        };
      
      case 'RateLimitError':
        const rateLimitError = error as RateLimitError;
        return {
          shouldRetry: true,
          retryAfter: (rateLimitError.rateLimitInfo.retryAfter || 60) * 1000,
          maxRetries: 1
        };
      
      case 'ValidationError':
        return {
          shouldRetry: false,
          retryAfter: 0,
          maxRetries: 0
        };
      
      default:
        if (error.statusCode && error.statusCode >= 500) {
          return {
            shouldRetry: true,
            retryAfter: 5000, // 5 seconds
            maxRetries: 2
          };
        }
        return {
          shouldRetry: false,
          retryAfter: 0,
          maxRetries: 0
        };
    }
  }
}

// Predefined error handlers
export const DefaultErrorHandlers = {
  // Log all errors to console
  consoleLogger: (error: VulnerabilityError, context: ErrorContext) => {
    console.error(`[${context.timestamp}] ${error.constructor.name}:`, error.message, {
      error,
      context
    });
  },

  // Show user notifications for certain errors
  userNotification: (error: VulnerabilityError, context: ErrorContext) => {
    const errorHandler = new ErrorHandlingMiddleware();
    const message = errorHandler.getUserFriendlyMessage(error);
    
    // You could integrate with a toast notification library here
    if (error.constructor.name !== 'ValidationError') {
      console.warn('User notification:', message);
    }
  },

  // Send critical errors to monitoring service
  monitoring: async (error: VulnerabilityError, context: ErrorContext) => {
    if (error.statusCode && error.statusCode >= 500) {
      // In a real app, you'd send this to a monitoring service like Sentry
      console.log('Sending to monitoring service:', {
        error: error.message,
        code: error.code,
        context
      });
    }
  }
};

// Singleton instance
export const errorHandler = new ErrorHandlingMiddleware();

// Set up default handlers
errorHandler.onAnyError(DefaultErrorHandlers.consoleLogger);
errorHandler.onAnyError(DefaultErrorHandlers.userNotification);
errorHandler.onError('NetworkError', DefaultErrorHandlers.monitoring);
errorHandler.onError('VulnerabilityError', DefaultErrorHandlers.monitoring);

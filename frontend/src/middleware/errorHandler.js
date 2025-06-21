const logger = require('../utils/logger');

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
  });

  // Default error response
  let statusCode = 500;
  let errorResponse = {
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorResponse = {
      error: 'Validation Error',
      message: err.message,
      details: err.details || [],
      timestamp: new Date().toISOString(),
    };
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    errorResponse = {
      error: 'Unauthorized',
      message: 'Authentication required',
      timestamp: new Date().toISOString(),
    };
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    errorResponse = {
      error: 'Forbidden',
      message: 'Access denied',
      timestamp: new Date().toISOString(),
    };
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    errorResponse = {
      error: 'Not Found',
      message: err.message || 'Resource not found',
      timestamp: new Date().toISOString(),
    };
  } else if (err.name === 'TimeoutError') {
    statusCode = 408;
    errorResponse = {
      error: 'Request Timeout',
      message: 'The request took too long to process',
      timestamp: new Date().toISOString(),
    };
  } else if (err.name === 'PayloadTooLargeError') {
    statusCode = 413;
    errorResponse = {
      error: 'Payload Too Large',
      message: 'Request payload exceeds size limit',
      timestamp: new Date().toISOString(),
    };
  } else if (err.name === 'TooManyRequestsError') {
    statusCode = 429;
    errorResponse = {
      error: 'Too Many Requests',
      message: 'Rate limit exceeded',
      retryAfter: err.retryAfter || 60,
      timestamp: new Date().toISOString(),
    };
  } else if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    errorResponse = {
      error: 'Service Unavailable',
      message: 'External service connection failed',
      timestamp: new Date().toISOString(),
    };
  } else if (err.code === 'ETIMEDOUT') {
    statusCode = 504;
    errorResponse = {
      error: 'Gateway Timeout',
      message: 'External service timeout',
      timestamp: new Date().toISOString(),
    };
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    errorResponse = {
      error: 'Invalid JSON',
      message: 'Request body contains invalid JSON',
      timestamp: new Date().toISOString(),
    };
  }

  // Handle specific application errors
  if (err.message.includes('Contract parsing failed')) {
    statusCode = 400;
    errorResponse = {
      error: 'Contract Parsing Error',
      message: err.message,
      timestamp: new Date().toISOString(),
    };
  } else if (err.message.includes('LLM analysis failed')) {
    statusCode = 503;
    errorResponse = {
      error: 'Analysis Service Unavailable',
      message: 'AI analysis service is currently unavailable',
      timestamp: new Date().toISOString(),
    };
  } else if (err.message.includes('Invalid contract address')) {
    statusCode = 400;
    errorResponse = {
      error: 'Invalid Address',
      message: 'The provided contract address is invalid',
      timestamp: new Date().toISOString(),
    };
  } else if (err.message.includes('No contract found')) {
    statusCode = 404;
    errorResponse = {
      error: 'Contract Not Found',
      message: 'No contract exists at the specified address',
      timestamp: new Date().toISOString(),
    };
  } else if (err.message.includes('Unsupported chain')) {
    statusCode = 400;
    errorResponse = {
      error: 'Unsupported Chain',
      message: err.message,
      timestamp: new Date().toISOString(),
    };
  }

  // In development, include stack trace
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.details = {
      name: err.name,
      code: err.code,
      statusCode: err.statusCode,
    };
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * 404 handler for undefined routes
 */
const notFoundHandler = (req, res) => {
  logger.warn('Route not found', {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    availableEndpoints: [
      'GET /health',
      'POST /api/audit/contract',
      'POST /api/audit/address',
      'GET /api/audit/history',
      'GET /api/audit/statistics',
      'GET /api/audit/chains',
      'POST /api/audit/verify-integrity',
      'GET /api/audit/health',
    ],
    timestamp: new Date().toISOString(),
  });
};

/**
 * Async error wrapper for route handlers
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create custom error
 */
const createError = (message, statusCode = 500, name = 'Error') => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.name = name;
  return error;
};

/**
 * Validation error creator
 */
const createValidationError = (message, details = []) => {
  const error = new Error(message);
  error.name = 'ValidationError';
  error.details = details;
  return error;
};

/**
 * Timeout error creator
 */
const createTimeoutError = (message = 'Operation timed out') => {
  const error = new Error(message);
  error.name = 'TimeoutError';
  return error;
};

/**
 * Service unavailable error creator
 */
const createServiceUnavailableError = (service, message) => {
  const error = new Error(message || `${service} service is currently unavailable`);
  error.name = 'ServiceUnavailableError';
  error.service = service;
  return error;
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  createError,
  createValidationError,
  createTimeoutError,
  createServiceUnavailableError,
};

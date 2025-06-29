// Centralized Error Handler for Flash Audit API

class ErrorHandler extends Error {
  constructor(statusCode, message, details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
    this.timestamp = new Date().toISOString();
    this.details = details;

    // Capture stack trace, excluding constructor call
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

const handleError = (err, res) => {
  // Default to 500 if status code is not defined
  const statusCode = err.statusCode || 500;
  
  // Log detailed error for debugging
  console.error(
    `[API Error] ${new Date().toISOString()} | Status: ${statusCode} | Message: ${err.message} | Path: ${res.req?.originalUrl || res.req?.url}`
  );
  if (err.stack) {
    console.error(err.stack);
  }

  // Prepare response body
  const responseBody = {
    success: false,
    error: {
      message: err.message || 'An unexpected error occurred.',
      statusCode: statusCode,
      timestamp: new Date().toISOString(),
      ...(Object.keys(err.details || {}).length > 0 && { details: err.details }),
    },
  };

  // In development, include stack trace in response
  if (process.env.NODE_ENV === 'development' && err.stack) {
    responseBody.error.stack = err.stack;
  }

  res.status(statusCode).json(responseBody);
};

// Middleware for handling errors passed with next()
const errorMiddleware = (err, req, res, next) => {
  handleError(err, res);
};

// Helper to create a new error
const createError = (statusCode, message, details) => {
  return new ErrorHandler(statusCode, message, details);
};

module.exports = {
  ErrorHandler,
  handleError,
  errorMiddleware,
  createError,
};
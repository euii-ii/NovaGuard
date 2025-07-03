const { ClerkExpressWithAuth } = require('@clerk/clerk-sdk-node');
const { createError } = require('./services/ErrorHandler');

// Enhanced Clerk authentication middleware with detailed error handling
const withAuth = (handler) => async (req, res) => {
  try {
    // Use Clerk middleware to authenticate the request
    await new Promise((resolve, reject) => {
      ClerkExpressWithAuth({})(req, res, (err) => {
        if (err) {
          // Forward Clerk-specific errors to the error handler
          return reject(createError(401, err.message || 'Authentication failed', { 
            clerkError: true,
            status: err.status,
            type: 'clerk-auth-error'
          }));
        }
        resolve();
      });
    });

    // Check if authentication was successful
    if (!req.auth || !req.auth.userId) {
      throw createError(401, 'User not authenticated. No user ID found in request.', {
        type: 'authentication-error'
      });
    }

    // Attach user information to the request for downstream handlers
    req.user = {
      id: req.auth.userId,
      email: req.auth.sessionClaims?.email, // Safely access email
      // Add other relevant user properties from req.auth as needed
    };

    // Proceed to the actual API handler
    return handler(req, res);

  } catch (error) {
    // Centralize error handling
    const statusCode = error.statusCode || 500;
    const message = error.message || 'An internal server error occurred during authentication.';
    
    console.error(`[Auth Middleware Error] - Status: ${statusCode}, Message: ${message}`);
    
    res.status(statusCode).json({
      success: false,
      error: {
        message,
        statusCode,
        type: error.details?.type || 'internal-auth-error',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      },
      timestamp: new Date().toISOString(),
    });
  }
};

// General middleware for logging requests
const logger = (req, res, next) => {
  console.log(`[API Request] ${new Date().toISOString()} | ${req.method} ${req.originalUrl}`);
  next();
};

// Middleware for handling 404 Not Found errors
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      message: `The requested endpoint '${req.originalUrl}' does not exist.`,
      statusCode: 404,
      type: 'not-found-error'
    },
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  withAuth,
  logger,
  notFound,
};
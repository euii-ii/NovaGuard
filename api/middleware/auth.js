const { createClerkClient } = require('@clerk/clerk-sdk-node');

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.DEVELOPMENT_MODE === 'true';

// Initialize Clerk with secret key (only if not in development mode)
let clerk = null;
if (!isDevelopment && process.env.CLERK_SECRET_KEY) {
  try {
    clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY
    });
  } catch (error) {
    console.warn('Clerk initialization failed:', error.message);
  }
}

// Middleware to verify Clerk JWT token
const verifyClerkAuth = async (req) => {
  try {
    // In development mode, return consistent mock user data
    if (isDevelopment) {
      return {
        userId: 'dev_user_consistent',
        email: 'dev@example.com',
        user: { id: 'dev_user_consistent', emailAddresses: [{ emailAddress: 'dev@example.com' }] }
      };
    }

    // Production Clerk authentication
    if (!clerk) {
      throw new Error('Clerk not initialized');
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('No authorization token provided');
    }

    const token = authHeader.split(' ')[1];

    // Verify the session token with Clerk
    const sessionToken = await clerk.verifyToken(token);

    if (!sessionToken || !sessionToken.sub) {
      throw new Error('Invalid token');
    }

    // Get user information from Clerk
    const user = await clerk.users.getUser(sessionToken.sub);

    return {
      userId: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      user: user
    };
  } catch (error) {
    console.error('Auth verification error:', error);
    throw new Error('Authentication failed');
  }
};

// Helper function to handle authentication in API routes
const withAuth = (handler) => {
  return async (req, res) => {
    try {
      // Skip auth for OPTIONS requests
      if (req.method === 'OPTIONS') {
        return handler(req, res);
      }

      // Verify authentication
      const authData = await verifyClerkAuth(req);
      
      // Add auth data to request
      req.auth = authData;
      
      // Call the original handler
      return handler(req, res);
    } catch (error) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: error.message
      });
    }
  };
};

// Helper function for optional authentication (doesn't fail if no auth)
const withOptionalAuth = (handler) => {
  return async (req, res) => {
    try {
      // Skip auth for OPTIONS requests
      if (req.method === 'OPTIONS') {
        return handler(req, res);
      }

      // Try to verify authentication, but don't fail if it's missing
      try {
        const authData = await verifyClerkAuth(req);
        req.auth = authData;
      } catch (error) {
        // Auth is optional, so we continue without it
        req.auth = null;
      }
      
      // Call the original handler
      return handler(req, res);
    } catch (error) {
      return res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  };
};

module.exports = {
  verifyClerkAuth,
  withAuth,
  withOptionalAuth
};

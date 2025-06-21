/**
 * Mock for jwtAuth middleware
 * Used in tests to simulate JWT authentication
 */

const mockJwtAuth = {
  // Mock authenticate middleware
  authenticate: jest.fn((req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Authorization header missing'
      });
    }
    
    if (token === 'invalid-token') {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid token'
      });
    }

    // Set mock user for valid tokens
    req.user = {
      id: 'test-user-123',
      email: 'test@example.com',
      role: 'user',
      permissions: ['read', 'write', 'analyze'],
      teamId: 'team-456'
    };
    
    next();
  }),

  // Mock optionalAuth middleware
  optionalAuth: jest.fn((req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token && token !== 'invalid-token') {
      req.user = {
        id: 'test-user-123',
        email: 'test@example.com',
        role: 'user',
        permissions: ['read', 'write', 'analyze'],
        teamId: 'team-456'
      };
    } else {
      req.user = {
        id: 'anonymous',
        role: 'anonymous',
        permissions: ['read']
      };
    }
    
    next();
  }),

  // Mock authorize method
  authorize: jest.fn((allowedRoles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      next();
    };
  }),

  // Mock requirePermissions method
  requirePermissions: jest.fn((requiredPermissions) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
      const userPermissions = req.user.permissions || [];
      const hasPermission = permissions.every(permission => 
        userPermissions.includes(permission) || userPermissions.includes('admin')
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      next();
    };
  }),

  // Mock generateToken method
  generateToken: jest.fn().mockReturnValue('mock-jwt-token'),

  // Mock verifyToken method
  verifyToken: jest.fn().mockReturnValue({
    sub: 'test-user-123',
    email: 'test@example.com',
    role: 'user'
  }),

  // Mock createApiKey method
  createApiKey: jest.fn().mockReturnValue('mock-api-key'),

  // Mock validateApiKey method
  validateApiKey: jest.fn().mockReturnValue({
    type: 'api-key',
    service: 'test-service',
    permissions: ['read']
  })
};

module.exports = mockJwtAuth;

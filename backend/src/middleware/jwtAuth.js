const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * JWT Authentication Middleware
 * Provides secure authentication for API endpoints
 */
class JWTAuthMiddleware {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
    this.refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
    
    if (!process.env.JWT_SECRET) {
      logger.warn('JWT_SECRET not set in environment variables. Using default secret.');
    }
  }

  /**
   * Generate JWT token
   * @param {Object} payload - Token payload
   * @param {Object} options - Token options
   * @returns {string} JWT token
   */
  generateToken(payload, options = {}) {
    const tokenOptions = {
      expiresIn: options.expiresIn || this.jwtExpiresIn,
      issuer: 'smart-contract-auditor',
      audience: 'api-users',
      ...options
    };

    return jwt.sign(payload, this.jwtSecret, tokenOptions);
  }

  /**
   * Generate refresh token
   * @param {Object} payload - Token payload
   * @returns {string} Refresh token
   */
  generateRefreshToken(payload) {
    return this.generateToken(payload, {
      expiresIn: this.refreshTokenExpiresIn,
      type: 'refresh'
    });
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token to verify
   * @returns {Object} Decoded token payload
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'smart-contract-auditor',
        audience: 'api-users'
      });
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * Authentication middleware
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  authenticate = (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'Authorization header missing'
        });
      }

      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : authHeader;

      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'Token missing from authorization header'
        });
      }

      const decoded = this.verifyToken(token);
      
      // Add user info to request
      req.user = {
        id: decoded.sub || decoded.userId,
        email: decoded.email,
        role: decoded.role || 'user',
        permissions: decoded.permissions || [],
        tokenType: decoded.type || 'access'
      };

      // Log authentication
      logger.info('User authenticated', {
        userId: req.user.id,
        role: req.user.role,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      next();

    } catch (error) {
      logger.error('Authentication failed', {
        error: error.message,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: error.message
      });
    }
  }

  /**
   * Optional authentication middleware (allows both authenticated and anonymous access)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  optionalAuth = (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader) {
        const token = authHeader.startsWith('Bearer ') 
          ? authHeader.substring(7) 
          : authHeader;

        if (token) {
          try {
            const decoded = this.verifyToken(token);
            req.user = {
              id: decoded.sub || decoded.userId,
              email: decoded.email,
              role: decoded.role || 'user',
              permissions: decoded.permissions || [],
              tokenType: decoded.type || 'access'
            };
          } catch (error) {
            // Invalid token, but continue as anonymous
            logger.warn('Invalid token in optional auth', { error: error.message });
          }
        }
      }

      // Set anonymous user if no valid token
      if (!req.user) {
        req.user = {
          id: 'anonymous',
          role: 'anonymous',
          permissions: ['read']
        };
      }

      next();

    } catch (error) {
      logger.error('Optional authentication error', { error: error.message });
      
      // Continue as anonymous user
      req.user = {
        id: 'anonymous',
        role: 'anonymous',
        permissions: ['read']
      };
      
      next();
    }
  }

  /**
   * Role-based authorization middleware
   * @param {Array|string} allowedRoles - Allowed roles
   * @returns {Function} Authorization middleware
   */
  authorize(allowedRoles) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'User not authenticated'
        });
      }

      if (!roles.includes(req.user.role)) {
        logger.warn('Authorization failed', {
          userId: req.user.id,
          userRole: req.user.role,
          requiredRoles: roles,
          ip: req.ip
        });

        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: `Role '${req.user.role}' not authorized. Required: ${roles.join(', ')}`
        });
      }

      next();
    };
  }

  /**
   * Permission-based authorization middleware
   * @param {Array|string} requiredPermissions - Required permissions
   * @returns {Function} Authorization middleware
   */
  requirePermissions(requiredPermissions) {
    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const userPermissions = req.user.permissions || [];
      const hasPermission = permissions.every(permission => 
        userPermissions.includes(permission) || userPermissions.includes('admin')
      );

      if (!hasPermission) {
        logger.warn('Permission denied', {
          userId: req.user.id,
          userPermissions,
          requiredPermissions: permissions,
          ip: req.ip
        });

        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          message: `Required permissions: ${permissions.join(', ')}`
        });
      }

      next();
    };
  }

  /**
   * Create API key for service-to-service authentication
   * @param {Object} serviceInfo - Service information
   * @returns {string} API key
   */
  createApiKey(serviceInfo) {
    const payload = {
      type: 'api-key',
      service: serviceInfo.name,
      permissions: serviceInfo.permissions || ['read'],
      iat: Math.floor(Date.now() / 1000)
    };

    return this.generateToken(payload, { expiresIn: '1y' });
  }

  /**
   * Validate API key
   * @param {string} apiKey - API key to validate
   * @returns {Object} Decoded API key payload
   */
  validateApiKey(apiKey) {
    try {
      const decoded = this.verifyToken(apiKey);
      
      if (decoded.type !== 'api-key') {
        throw new Error('Invalid API key type');
      }

      return decoded;
    } catch (error) {
      throw new Error(`API key validation failed: ${error.message}`);
    }
  }
}

// Create instance
const jwtAuthInstance = new JWTAuthMiddleware();

module.exports = jwtAuthInstance;

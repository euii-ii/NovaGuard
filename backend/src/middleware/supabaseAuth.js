const { supabaseAdmin, supabaseClient } = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Supabase Authentication Middleware
 * Provides secure authentication using Supabase Auth
 */
class SupabaseAuthMiddleware {
  constructor() {
    this.admin = supabaseAdmin;
    this.client = supabaseClient;
  }

  /**
   * Extract user from Supabase JWT token
   * @param {string} token - Supabase JWT token
   * @returns {Object} User information
   */
  async extractUserFromToken(token) {
    try {
      const { data: { user }, error } = await this.admin.auth.getUser(token);
      
      if (error) {
        throw new Error(`Token verification failed: ${error.message}`);
      }

      if (!user) {
        throw new Error('User not found');
      }

      // Get additional user data from our users table
      const { data: userData, error: userError } = await this.admin
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userError && userError.code !== 'PGRST116') { // PGRST116 = no rows returned
        logger.warn('Failed to fetch user data from users table', { 
          userId: user.id, 
          error: userError.message 
        });
      }

      return {
        id: user.id,
        email: user.email,
        role: userData?.user_role || 'free',
        permissions: this.getRolePermissions(userData?.user_role || 'free'),
        full_name: userData?.full_name || user.user_metadata?.full_name,
        avatar_url: userData?.avatar_url || user.user_metadata?.avatar_url,
        api_key: userData?.api_key,
        created_at: userData?.created_at || user.created_at,
        supabaseUser: user
      };
    } catch (error) {
      throw new Error(`User extraction failed: ${error.message}`);
    }
  }

  /**
   * Get permissions based on user role
   * @param {string} role - User role
   * @returns {Array} Array of permissions
   */
  getRolePermissions(role) {
    const rolePermissions = {
      'free': ['read', 'audit:basic'],
      'premium': ['read', 'audit:basic', 'audit:advanced', 'monitoring:basic'],
      'enterprise': ['read', 'audit:basic', 'audit:advanced', 'monitoring:basic', 'monitoring:advanced', 'workspace:create'],
      'admin': ['read', 'write', 'delete', 'audit:basic', 'audit:advanced', 'monitoring:basic', 'monitoring:advanced', 'workspace:create', 'admin']
    };

    return rolePermissions[role] || rolePermissions['free'];
  }

  /**
   * Authentication middleware
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  authenticate = async (req, res, next) => {
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

      const user = await this.extractUserFromToken(token);
      
      // Add user info to request
      req.user = user;

      // Log authentication
      logger.info('User authenticated via Supabase', {
        userId: req.user.id,
        role: req.user.role,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      next();

    } catch (error) {
      logger.error('Supabase authentication failed', {
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
  optionalAuth = async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader) {
        const token = authHeader.startsWith('Bearer ') 
          ? authHeader.substring(7) 
          : authHeader;

        if (token) {
          try {
            const user = await this.extractUserFromToken(token);
            req.user = user;
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
      logger.error('Optional Supabase authentication error', { error: error.message });
      
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
   * Validate API key from users table
   * @param {string} apiKey - API key to validate
   * @returns {Object} User information
   */
  async validateApiKey(apiKey) {
    try {
      const { data: userData, error } = await this.admin
        .from('users')
        .select('*')
        .eq('api_key', apiKey)
        .single();

      if (error || !userData) {
        throw new Error('Invalid API key');
      }

      return {
        id: userData.id,
        email: userData.email,
        role: userData.user_role,
        permissions: this.getRolePermissions(userData.user_role),
        full_name: userData.full_name,
        api_key: userData.api_key,
        type: 'api-key'
      };
    } catch (error) {
      throw new Error(`API key validation failed: ${error.message}`);
    }
  }

  /**
   * API key authentication middleware
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  authenticateApiKey = async (req, res, next) => {
    try {
      const apiKey = req.headers['x-api-key'] || req.query.api_key;
      
      if (!apiKey) {
        return res.status(401).json({
          success: false,
          error: 'API key required',
          message: 'API key missing from headers or query parameters'
        });
      }

      const user = await this.validateApiKey(apiKey);
      req.user = user;

      logger.info('API key authenticated', {
        userId: req.user.id,
        role: req.user.role,
        ip: req.ip
      });

      next();

    } catch (error) {
      logger.error('API key authentication failed', {
        error: error.message,
        ip: req.ip
      });

      return res.status(401).json({
        success: false,
        error: 'API key authentication failed',
        message: error.message
      });
    }
  }
}

// Create instance
const supabaseAuthInstance = new SupabaseAuthMiddleware();

module.exports = supabaseAuthInstance;

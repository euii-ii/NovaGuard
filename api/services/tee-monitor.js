// Enhanced TEE Monitor Service for audit logging - migrated from backend
const { withAuth } = require('../middleware/auth');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin;
if (supabaseUrl && supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// CORS headers helper
const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
};

// TEE Monitor Class (migrated from backend)
class TEEMonitor {
  constructor() {
    this.enabled = process.env.TEE_LOG_ENABLED === 'true';
    this.encryptionKey = process.env.TEE_ENCRYPTION_KEY || 'default-encryption-key-change-in-production';
    this.logPath = process.env.TEE_LOG_PATH || './logs/auditLogs.json';
  }

  // Encrypt sensitive data (from backend)
  encryptData(data) {
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipher(algorithm, key);
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return {
        encrypted: encrypted,
        iv: iv.toString('hex'),
        algorithm: algorithm
      };
    } catch (error) {
      console.error('Encryption error:', error);
      return { error: 'Encryption failed' };
    }
  }

  // Decrypt sensitive data (from backend)
  decryptData(encryptedData) {
    try {
      const algorithm = encryptedData.algorithm || 'aes-256-cbc';
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      const iv = Buffer.from(encryptedData.iv, 'hex');
      
      const decipher = crypto.createDecipher(algorithm, key);
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Decryption error:', error);
      return { error: 'Decryption failed' };
    }
  }

  // Generate audit hash for integrity verification (from backend)
  generateAuditHash(auditData) {
    const dataString = JSON.stringify(auditData, Object.keys(auditData).sort());
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  // Log audit to TEE (from backend)
  async logAudit(auditData, userId = null) {
    if (!this.enabled) {
      console.log('TEE logging is disabled');
      return { success: false, reason: 'TEE logging disabled' };
    }

    try {
      const logEntry = {
        id: auditData.auditId || `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        userId: userId,
        auditData: auditData,
        hash: this.generateAuditHash(auditData),
        version: '2.0.0-serverless',
        environment: process.env.NODE_ENV || 'production'
      };

      // Encrypt sensitive data
      const encryptedAuditData = this.encryptData(auditData);
      logEntry.encryptedData = encryptedAuditData;

      // Store in Supabase
      if (supabaseAdmin) {
        await supabaseAdmin
          .from('tee_audit_logs')
          .insert({
            log_id: logEntry.id,
            user_id: userId,
            audit_data: auditData,
            encrypted_data: encryptedAuditData,
            audit_hash: logEntry.hash,
            log_level: this.determineLogLevel(auditData),
            created_at: logEntry.timestamp
          });
      }

      console.log('Audit logged to TEE:', logEntry.id);
      return { 
        success: true, 
        logId: logEntry.id, 
        hash: logEntry.hash,
        timestamp: logEntry.timestamp 
      };

    } catch (error) {
      console.error('TEE logging error:', error);
      return { 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Determine log level based on audit data (from backend)
  determineLogLevel(auditData) {
    if (auditData.status === 'failed' || auditData.error) {
      return 'error';
    }
    
    if (auditData.security?.riskLevel === 'Critical' || auditData.security?.criticalCount > 0) {
      return 'critical';
    }
    
    if (auditData.security?.riskLevel === 'High' || auditData.security?.highCount > 0) {
      return 'warning';
    }
    
    return 'info';
  }

  // Retrieve audit logs (from backend)
  async getAuditLogs(filters = {}, userId = null) {
    try {
      if (!supabaseAdmin) {
        return { success: false, error: 'Database not configured' };
      }

      let query = supabaseAdmin
        .from('tee_audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (filters.logLevel) {
        query = query.eq('log_level', filters.logLevel);
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Decrypt sensitive data if requested
      const logs = data.map(log => {
        const logEntry = {
          id: log.log_id,
          userId: log.user_id,
          timestamp: log.created_at,
          logLevel: log.log_level,
          hash: log.audit_hash,
          auditData: log.audit_data
        };

        // Include decrypted data if encryption key is available
        if (filters.includeDecrypted && log.encrypted_data && this.encryptionKey) {
          try {
            logEntry.decryptedData = this.decryptData(log.encrypted_data);
          } catch (error) {
            logEntry.decryptionError = 'Failed to decrypt data';
          }
        }

        return logEntry;
      });

      return {
        success: true,
        logs: logs,
        total: logs.length,
        filters: filters
      };

    } catch (error) {
      console.error('Error retrieving audit logs:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Verify audit log integrity (from backend)
  async verifyAuditIntegrity(logId, userId = null) {
    try {
      if (!supabaseAdmin) {
        return { success: false, error: 'Database not configured' };
      }

      let query = supabaseAdmin
        .from('tee_audit_logs')
        .select('*')
        .eq('log_id', logId);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.single();

      if (error || !data) {
        return { success: false, error: 'Audit log not found' };
      }

      // Verify hash integrity
      const calculatedHash = this.generateAuditHash(data.audit_data);
      const storedHash = data.audit_hash;
      
      const isValid = calculatedHash === storedHash;

      return {
        success: true,
        logId: logId,
        isValid: isValid,
        storedHash: storedHash,
        calculatedHash: calculatedHash,
        timestamp: data.created_at,
        verifiedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error verifying audit integrity:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Get audit statistics (from backend)
  async getAuditStatistics(userId = null, timeRange = '7d') {
    try {
      if (!supabaseAdmin) {
        return { success: false, error: 'Database not configured' };
      }

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '1d':
          startDate.setDate(endDate.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        default:
          startDate.setDate(endDate.getDate() - 7);
      }

      let query = supabaseAdmin
        .from('tee_audit_logs')
        .select('log_level, created_at, audit_data')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Calculate statistics
      const stats = {
        totalAudits: data.length,
        logLevels: {
          info: data.filter(log => log.log_level === 'info').length,
          warning: data.filter(log => log.log_level === 'warning').length,
          error: data.filter(log => log.log_level === 'error').length,
          critical: data.filter(log => log.log_level === 'critical').length
        },
        timeRange: timeRange,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        averagePerDay: Math.round(data.length / Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)))),
        generatedAt: new Date().toISOString()
      };

      // Calculate risk distribution
      const riskLevels = { Low: 0, Medium: 0, High: 0, Critical: 0 };
      data.forEach(log => {
        if (log.audit_data?.security?.riskLevel) {
          riskLevels[log.audit_data.security.riskLevel] = (riskLevels[log.audit_data.security.riskLevel] || 0) + 1;
        }
      });
      stats.riskDistribution = riskLevels;

      return {
        success: true,
        statistics: stats
      };

    } catch (error) {
      console.error('Error getting audit statistics:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Serverless function handler
const teeMonitorHandler = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { userId, email } = req.auth;

  try {
    const teeMonitor = new TEEMonitor();

    if (req.method === 'GET') {
      const { action, logId, timeRange, includeDecrypted, logLevel, startDate, endDate, limit } = req.query;

      switch (action) {
        case 'logs':
          const filters = {
            logLevel,
            startDate,
            endDate,
            limit: limit ? parseInt(limit) : 50,
            includeDecrypted: includeDecrypted === 'true'
          };
          
          const logs = await teeMonitor.getAuditLogs(filters, userId);
          res.status(200).json({
            ...logs,
            metadata: {
              userId,
              userEmail: email,
              timestamp: new Date().toISOString()
            }
          });
          break;

        case 'verify':
          if (!logId) {
            return res.status(400).json({
              success: false,
              error: 'Log ID is required for verification'
            });
          }

          const verification = await teeMonitor.verifyAuditIntegrity(logId, userId);
          res.status(200).json({
            ...verification,
            metadata: {
              userId,
              userEmail: email,
              timestamp: new Date().toISOString()
            }
          });
          break;

        case 'statistics':
          const statistics = await teeMonitor.getAuditStatistics(userId, timeRange || '7d');
          res.status(200).json({
            ...statistics,
            metadata: {
              userId,
              userEmail: email,
              timestamp: new Date().toISOString()
            }
          });
          break;

        case 'status':
          res.status(200).json({
            success: true,
            status: {
              enabled: teeMonitor.enabled,
              encryptionEnabled: !!teeMonitor.encryptionKey,
              version: '2.0.0-serverless'
            },
            metadata: {
              userId,
              userEmail: email,
              timestamp: new Date().toISOString()
            }
          });
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid action. Supported actions: logs, verify, statistics, status'
          });
      }
    } else if (req.method === 'POST') {
      const { action, auditData, logData } = req.body;

      switch (action) {
        case 'log':
          if (!auditData) {
            return res.status(400).json({
              success: false,
              error: 'Audit data is required'
            });
          }

          const logResult = await teeMonitor.logAudit(auditData, userId);
          res.status(200).json({
            ...logResult,
            metadata: {
              userId,
              userEmail: email,
              timestamp: new Date().toISOString()
            }
          });
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid action. Supported actions: log'
          });
      }
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('TEE monitor error:', error);
    res.status(500).json({
      success: false,
      error: 'TEE monitor service failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Export with Clerk authentication middleware
module.exports = withAuth(teeMonitorHandler);

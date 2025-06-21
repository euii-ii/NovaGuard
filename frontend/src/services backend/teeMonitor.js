const fs = require('fs-extra');
const crypto = require('crypto');
const path = require('path');
const logger = require('../../../backend/src/utils/logger');

class TEEMonitor {
  constructor() {
    this.enabled = process.env.TEE_LOG_ENABLED === 'true';
    this.logPath = process.env.TEE_LOG_PATH || './logs/auditLogs.json';
    this.encryptionKey = process.env.TEE_ENCRYPTION_KEY || 'default-tee-key';
    this.algorithm = 'aes-256-gcm';
    
    this.initializeLogFile();
  }

  /**
   * Initialize the audit log file
   */
  async initializeLogFile() {
    if (!this.enabled) {
      logger.info('TEE Monitor disabled');
      return;
    }

    try {
      // Ensure logs directory exists
      const logDir = path.dirname(this.logPath);
      await fs.ensureDir(logDir);

      // Initialize log file if it doesn't exist
      if (!await fs.pathExists(this.logPath)) {
        const initialData = {
          version: '1.0.0',
          created: new Date().toISOString(),
          audits: [],
          metadata: {
            totalAudits: 0,
            lastAudit: null,
            encryptionEnabled: true,
          }
        };

        await this.writeLogFile(initialData);
        logger.info('TEE Monitor initialized', { logPath: this.logPath });
      }

    } catch (error) {
      logger.error('Failed to initialize TEE Monitor', { error: error.message });
    }
  }

  /**
   * Log audit interaction to TEE monitor
   * @param {Object} auditData - Audit data to log
   */
  async logAudit(auditData) {
    if (!this.enabled) {
      return;
    }

    try {
      // Sanitize audit data for logging
      const sanitizedData = this.sanitizeAuditData(auditData);

      // Add TEE metadata
      const teeEntry = {
        id: this.generateEntryId(),
        timestamp: new Date().toISOString(),
        hash: this.calculateDataHash(sanitizedData),
        data: sanitizedData,
        integrity: {
          checksum: this.calculateChecksum(sanitizedData),
          version: '1.0.0',
        }
      };

      // Read current log file
      const logData = await this.readLogFile();

      // Add new entry
      logData.audits.push(teeEntry);
      logData.metadata.totalAudits++;
      logData.metadata.lastAudit = teeEntry.timestamp;

      // Write updated log file
      await this.writeLogFile(logData);

      logger.info('Audit logged to TEE Monitor', { 
        auditId: auditData.auditId,
        entryId: teeEntry.id 
      });

    } catch (error) {
      logger.error('Failed to log audit to TEE Monitor', { 
        auditId: auditData.auditId,
        error: error.message 
      });
    }
  }

  /**
   * Retrieve audit history
   * @param {Object} filters - Filter options
   * @returns {Array} Audit history
   */
  async getAuditHistory(filters = {}) {
    if (!this.enabled) {
      return [];
    }

    try {
      const logData = await this.readLogFile();
      let audits = logData.audits;

      // Apply filters
      if (filters.startDate) {
        audits = audits.filter(audit => 
          new Date(audit.timestamp) >= new Date(filters.startDate)
        );
      }

      if (filters.endDate) {
        audits = audits.filter(audit => 
          new Date(audit.timestamp) <= new Date(filters.endDate)
        );
      }

      if (filters.status) {
        audits = audits.filter(audit => 
          audit.data.status === filters.status
        );
      }

      if (filters.riskLevel) {
        audits = audits.filter(audit => 
          audit.data.riskLevel === filters.riskLevel
        );
      }

      if (filters.contractAddress) {
        audits = audits.filter(audit => 
          audit.data.contractInfo?.address === filters.contractAddress
        );
      }

      // Sort by timestamp (newest first)
      audits.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Apply pagination
      if (filters.limit) {
        const offset = filters.offset || 0;
        audits = audits.slice(offset, offset + filters.limit);
      }

      return audits;

    } catch (error) {
      logger.error('Failed to retrieve audit history', { error: error.message });
      return [];
    }
  }

  /**
   * Get audit statistics
   * @returns {Object} Audit statistics
   */
  async getAuditStatistics() {
    if (!this.enabled) {
      return null;
    }

    try {
      const logData = await this.readLogFile();
      const audits = logData.audits;

      const stats = {
        totalAudits: audits.length,
        successfulAudits: audits.filter(a => a.data.status === 'completed').length,
        failedAudits: audits.filter(a => a.data.status === 'failed').length,
        riskLevelDistribution: {},
        averageScore: 0,
        totalVulnerabilities: 0,
        recentActivity: this.getRecentActivity(audits),
        topVulnerabilities: this.getTopVulnerabilities(audits),
      };

      // Calculate risk level distribution
      const riskLevels = ['Low', 'Medium', 'High', 'Critical'];
      riskLevels.forEach(level => {
        stats.riskLevelDistribution[level] = audits.filter(
          a => a.data.riskLevel === level
        ).length;
      });

      // Calculate average score
      const completedAudits = audits.filter(a => a.data.status === 'completed');
      if (completedAudits.length > 0) {
        const totalScore = completedAudits.reduce(
          (sum, audit) => sum + (audit.data.overallScore || 0), 0
        );
        stats.averageScore = Math.round(totalScore / completedAudits.length);
      }

      // Calculate total vulnerabilities
      stats.totalVulnerabilities = completedAudits.reduce(
        (sum, audit) => sum + (audit.data.vulnerabilities?.length || 0), 0
      );

      return stats;

    } catch (error) {
      logger.error('Failed to get audit statistics', { error: error.message });
      return null;
    }
  }

  /**
   * Verify audit log integrity
   * @returns {Object} Integrity verification result
   */
  async verifyIntegrity() {
    if (!this.enabled) {
      return { verified: false, reason: 'TEE Monitor disabled' };
    }

    try {
      const logData = await this.readLogFile();
      const issues = [];

      // Verify each audit entry
      for (const audit of logData.audits) {
        // Verify hash
        const expectedHash = this.calculateDataHash(audit.data);
        if (audit.hash !== expectedHash) {
          issues.push({
            entryId: audit.id,
            issue: 'Hash mismatch',
            expected: expectedHash,
            actual: audit.hash,
          });
        }

        // Verify checksum
        const expectedChecksum = this.calculateChecksum(audit.data);
        if (audit.integrity.checksum !== expectedChecksum) {
          issues.push({
            entryId: audit.id,
            issue: 'Checksum mismatch',
            expected: expectedChecksum,
            actual: audit.integrity.checksum,
          });
        }
      }

      return {
        verified: issues.length === 0,
        totalEntries: logData.audits.length,
        issues,
        verifiedAt: new Date().toISOString(),
      };

    } catch (error) {
      logger.error('Failed to verify audit log integrity', { error: error.message });
      return { verified: false, reason: error.message };
    }
  }

  /**
   * Sanitize audit data for logging
   * @param {Object} auditData - Raw audit data
   * @returns {Object} Sanitized audit data
   */
  sanitizeAuditData(auditData) {
    // Remove sensitive information and large data
    const sanitized = {
      auditId: auditData.auditId,
      status: auditData.status,
      type: auditData.type,
      timestamp: auditData.timestamp,
      executionTime: auditData.executionTime,
    };

    // Include contract info (without full source code)
    if (auditData.contractInfo) {
      sanitized.contractInfo = {
        name: auditData.contractInfo.name,
        address: auditData.contractInfo.address,
        chain: auditData.contractInfo.chain,
        functions: auditData.contractInfo.functions,
        complexity: auditData.contractInfo.complexity,
        linesOfCode: auditData.contractInfo.linesOfCode,
      };
    }

    // Include vulnerability summary
    if (auditData.vulnerabilities) {
      sanitized.vulnerabilities = auditData.vulnerabilities.map(vuln => ({
        name: vuln.name,
        severity: vuln.severity,
        category: vuln.category,
        confidence: vuln.confidence,
      }));
    }

    // Include scores and risk assessment
    if (auditData.overallScore !== undefined) {
      sanitized.overallScore = auditData.overallScore;
      sanitized.riskLevel = auditData.riskLevel;
      sanitized.severityCounts = auditData.severityCounts;
    }

    // Include error information for failed audits
    if (auditData.error) {
      sanitized.error = auditData.error;
    }

    return sanitized;
  }

  /**
   * Read and decrypt log file
   * @returns {Object} Log data
   */
  async readLogFile() {
    try {
      const encryptedData = await fs.readFile(this.logPath, 'utf8');
      return this.decryptData(encryptedData);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, return empty structure
        return {
          version: '1.0.0',
          created: new Date().toISOString(),
          audits: [],
          metadata: { totalAudits: 0, lastAudit: null }
        };
      }
      throw error;
    }
  }

  /**
   * Encrypt and write log file
   * @param {Object} data - Data to write
   */
  async writeLogFile(data) {
    const encryptedData = this.encryptData(data);
    await fs.writeFile(this.logPath, encryptedData, 'utf8');
  }

  /**
   * Encrypt data
   * @param {Object} data - Data to encrypt
   * @returns {string} Encrypted data
   */
  encryptData(data) {
    // For now, just return JSON string with base64 encoding for basic obfuscation
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  /**
   * Decrypt data
   * @param {string} encryptedData - Encrypted data string
   * @returns {Object} Decrypted data
   */
  decryptData(encryptedData) {
    try {
      // Try to decode from base64
      const decoded = Buffer.from(encryptedData, 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch (error) {
      // If decryption fails, try to read as plain JSON (backward compatibility)
      try {
        return JSON.parse(encryptedData);
      } catch (parseError) {
        throw new Error('Failed to decrypt audit log data');
      }
    }
  }

  /**
   * Calculate data hash
   * @param {Object} data - Data to hash
   * @returns {string} SHA-256 hash
   */
  calculateDataHash(data) {
    return crypto.createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  /**
   * Calculate checksum
   * @param {Object} data - Data to checksum
   * @returns {string} MD5 checksum
   */
  calculateChecksum(data) {
    return crypto.createHash('md5')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  /**
   * Generate unique entry ID
   * @returns {string} Unique entry ID
   */
  generateEntryId() {
    return `tee_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Get recent activity summary
   * @param {Array} audits - Audit entries
   * @returns {Object} Recent activity
   */
  getRecentActivity(audits) {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    return {
      last24Hours: audits.filter(a => new Date(a.timestamp) > last24h).length,
      last7Days: audits.filter(a => new Date(a.timestamp) > last7d).length,
    };
  }

  /**
   * Get top vulnerabilities
   * @param {Array} audits - Audit entries
   * @returns {Array} Top vulnerabilities
   */
  getTopVulnerabilities(audits) {
    const vulnCounts = {};
    
    audits.forEach(audit => {
      if (audit.data.vulnerabilities) {
        audit.data.vulnerabilities.forEach(vuln => {
          const key = `${vuln.category}-${vuln.severity}`;
          vulnCounts[key] = (vulnCounts[key] || 0) + 1;
        });
      }
    });

    return Object.entries(vulnCounts)
      .map(([key, count]) => {
        const [category, severity] = key.split('-');
        return { category, severity, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
}

module.exports = new TEEMonitor();

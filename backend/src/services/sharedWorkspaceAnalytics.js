const EventEmitter = require('events');
const logger = require('../utils/logger');

/**
 * Shared Workspace Analytics Service
 * Provides comprehensive analytics for collaborative development workspaces
 */
class SharedWorkspaceAnalytics extends EventEmitter {
  constructor() {
    super();
    this.workspaceMetrics = new Map();
    this.userActivityMetrics = new Map();
    this.collaborationMetrics = new Map();
    this.codeQualityMetrics = new Map();
    this.realTimeMetrics = new Map();
    this.analyticsCache = new Map();
    this.metricCollectors = new Map();
  }

  /**
   * Initialize analytics service
   * @param {Object} config - Service configuration
   */
  async initialize(config = {}) {
    try {
      this.config = {
        metricsRetentionDays: config.metricsRetentionDays || 90,
        realTimeUpdateInterval: config.realTimeUpdateInterval || 30000, // 30 seconds
        enableDetailedTracking: config.enableDetailedTracking !== false,
        enableUserPrivacy: config.enableUserPrivacy !== false,
        aggregationIntervals: config.aggregationIntervals || ['hourly', 'daily', 'weekly'],
        ...config
      };

      // Start metric collectors
      this.startMetricCollectors();

      // Start real-time analytics
      this.startRealTimeAnalytics();

      logger.info('Shared Workspace Analytics Service initialized', this.config);

    } catch (error) {
      logger.error('Failed to initialize Shared Workspace Analytics Service', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Track workspace activity
   * @param {string} workspaceId - Workspace identifier
   * @param {string} userId - User identifier
   * @param {Object} activityData - Activity data
   */
  trackWorkspaceActivity(workspaceId, userId, activityData) {
    try {
      const {
        action,
        filePath,
        changeType,
        linesChanged = 0,
        timestamp = new Date().toISOString(),
        metadata = {}
      } = activityData;

      // Initialize workspace metrics if not exists
      if (!this.workspaceMetrics.has(workspaceId)) {
        this.initializeWorkspaceMetrics(workspaceId);
      }

      // Initialize user metrics if not exists
      const userKey = `${workspaceId}:${userId}`;
      if (!this.userActivityMetrics.has(userKey)) {
        this.initializeUserMetrics(userKey, workspaceId, userId);
      }

      const workspaceMetrics = this.workspaceMetrics.get(workspaceId);
      const userMetrics = this.userActivityMetrics.get(userKey);

      // Update workspace metrics
      workspaceMetrics.totalActivities++;
      workspaceMetrics.lastActivity = timestamp;
      workspaceMetrics.activeUsers.add(userId);

      // Update activity by type
      if (!workspaceMetrics.activitiesByType.has(action)) {
        workspaceMetrics.activitiesByType.set(action, 0);
      }
      workspaceMetrics.activitiesByType.set(action, 
        workspaceMetrics.activitiesByType.get(action) + 1);

      // Update file activity
      if (filePath) {
        if (!workspaceMetrics.fileActivity.has(filePath)) {
          workspaceMetrics.fileActivity.set(filePath, {
            editCount: 0,
            linesChanged: 0,
            lastModified: timestamp,
            contributors: new Set()
          });
        }
        const fileMetrics = workspaceMetrics.fileActivity.get(filePath);
        fileMetrics.editCount++;
        fileMetrics.linesChanged += linesChanged;
        fileMetrics.lastModified = timestamp;
        fileMetrics.contributors.add(userId);
      }

      // Update user metrics
      userMetrics.totalActivities++;
      userMetrics.lastActivity = timestamp;
      userMetrics.linesChanged += linesChanged;

      if (!userMetrics.activitiesByType.has(action)) {
        userMetrics.activitiesByType.set(action, 0);
      }
      userMetrics.activitiesByType.set(action, 
        userMetrics.activitiesByType.get(action) + 1);

      // Track hourly activity
      const hour = new Date(timestamp).getHours();
      userMetrics.hourlyActivity[hour] = (userMetrics.hourlyActivity[hour] || 0) + 1;

      // Update real-time metrics
      this.updateRealTimeMetrics(workspaceId, userId, activityData);

      this.emit('activity:tracked', {
        workspaceId,
        userId,
        action,
        timestamp
      });

    } catch (error) {
      logger.error('Failed to track workspace activity', { 
        workspaceId,
        userId,
        error: error.message 
      });
    }
  }

  /**
   * Track collaboration event
   * @param {string} workspaceId - Workspace identifier
   * @param {Object} collaborationData - Collaboration event data
   */
  trackCollaboration(workspaceId, collaborationData) {
    try {
      const {
        type, // 'comment', 'review', 'merge', 'conflict_resolution'
        participants,
        duration = 0,
        outcome,
        timestamp = new Date().toISOString(),
        metadata = {}
      } = collaborationData;

      if (!this.collaborationMetrics.has(workspaceId)) {
        this.initializeCollaborationMetrics(workspaceId);
      }

      const collabMetrics = this.collaborationMetrics.get(workspaceId);

      // Update collaboration metrics
      collabMetrics.totalEvents++;
      collabMetrics.lastCollaboration = timestamp;

      if (!collabMetrics.eventsByType.has(type)) {
        collabMetrics.eventsByType.set(type, 0);
      }
      collabMetrics.eventsByType.set(type, 
        collabMetrics.eventsByType.get(type) + 1);

      // Track participant interactions
      participants.forEach(userId => {
        collabMetrics.activeCollaborators.add(userId);
        
        participants.forEach(otherUserId => {
          if (userId !== otherUserId) {
            const pairKey = [userId, otherUserId].sort().join(':');
            collabMetrics.collaborationPairs.set(pairKey, 
              (collabMetrics.collaborationPairs.get(pairKey) || 0) + 1);
          }
        });
      });

      // Update average collaboration duration
      if (duration > 0) {
        const currentAvg = collabMetrics.averageDuration;
        const totalEvents = collabMetrics.totalEvents;
        collabMetrics.averageDuration = 
          (currentAvg * (totalEvents - 1) + duration) / totalEvents;
      }

      this.emit('collaboration:tracked', {
        workspaceId,
        type,
        participants,
        timestamp
      });

    } catch (error) {
      logger.error('Failed to track collaboration', { 
        workspaceId,
        error: error.message 
      });
    }
  }

  /**
   * Track code quality metrics
   * @param {string} workspaceId - Workspace identifier
   * @param {string} filePath - File path
   * @param {Object} qualityData - Code quality data
   */
  trackCodeQuality(workspaceId, filePath, qualityData) {
    try {
      const {
        overallScore,
        vulnerabilities = [],
        complexity,
        testCoverage,
        documentation,
        timestamp = new Date().toISOString()
      } = qualityData;

      if (!this.codeQualityMetrics.has(workspaceId)) {
        this.initializeCodeQualityMetrics(workspaceId);
      }

      const qualityMetrics = this.codeQualityMetrics.get(workspaceId);

      // Update file quality metrics
      qualityMetrics.fileQuality.set(filePath, {
        overallScore,
        vulnerabilities: vulnerabilities.length,
        complexity,
        testCoverage,
        documentation,
        lastAnalyzed: timestamp
      });

      // Update workspace averages
      const allFiles = Array.from(qualityMetrics.fileQuality.values());
      qualityMetrics.averageScore = allFiles.reduce((sum, file) => 
        sum + file.overallScore, 0) / allFiles.length;

      qualityMetrics.averageComplexity = allFiles.reduce((sum, file) => 
        sum + (file.complexity || 0), 0) / allFiles.length;

      qualityMetrics.totalVulnerabilities = allFiles.reduce((sum, file) => 
        sum + file.vulnerabilities, 0);

      // Track quality trends
      const dayKey = new Date(timestamp).toISOString().split('T')[0];
      if (!qualityMetrics.qualityTrends.has(dayKey)) {
        qualityMetrics.qualityTrends.set(dayKey, {
          averageScore: 0,
          vulnerabilityCount: 0,
          fileCount: 0
        });
      }

      const dayMetrics = qualityMetrics.qualityTrends.get(dayKey);
      dayMetrics.averageScore = qualityMetrics.averageScore;
      dayMetrics.vulnerabilityCount = qualityMetrics.totalVulnerabilities;
      dayMetrics.fileCount = allFiles.length;

      this.emit('quality:tracked', {
        workspaceId,
        filePath,
        overallScore,
        timestamp
      });

    } catch (error) {
      logger.error('Failed to track code quality', { 
        workspaceId,
        filePath,
        error: error.message 
      });
    }
  }

  /**
   * Generate workspace analytics report
   * @param {string} workspaceId - Workspace identifier
   * @param {Object} options - Report options
   * @returns {Object} Analytics report
   */
  async generateWorkspaceReport(workspaceId, options = {}) {
    try {
      const {
        timeRange = '7d', // 1d, 7d, 30d, 90d
        includeUserBreakdown = true,
        includeFileAnalysis = true,
        includeCollaboration = true,
        includeQualityMetrics = true
      } = options;

      const report = {
        workspaceId,
        generatedAt: new Date().toISOString(),
        timeRange,
        summary: {},
        activity: {},
        collaboration: {},
        codeQuality: {},
        users: {},
        files: {},
        trends: {}
      };

      // Get workspace metrics
      const workspaceMetrics = this.workspaceMetrics.get(workspaceId);
      if (!workspaceMetrics) {
        throw new Error('No metrics found for workspace');
      }

      // Generate summary
      report.summary = {
        totalActivities: workspaceMetrics.totalActivities,
        activeUsers: workspaceMetrics.activeUsers.size,
        totalFiles: workspaceMetrics.fileActivity.size,
        lastActivity: workspaceMetrics.lastActivity,
        workspaceAge: this.calculateWorkspaceAge(workspaceMetrics.createdAt)
      };

      // Generate activity metrics
      report.activity = {
        activitiesByType: Object.fromEntries(workspaceMetrics.activitiesByType),
        dailyActivity: this.calculateDailyActivity(workspaceId, timeRange),
        peakHours: this.calculatePeakHours(workspaceId),
        activityTrends: this.calculateActivityTrends(workspaceId, timeRange)
      };

      // Generate collaboration metrics
      if (includeCollaboration) {
        const collabMetrics = this.collaborationMetrics.get(workspaceId);
        if (collabMetrics) {
          report.collaboration = {
            totalEvents: collabMetrics.totalEvents,
            eventsByType: Object.fromEntries(collabMetrics.eventsByType),
            activeCollaborators: collabMetrics.activeCollaborators.size,
            averageDuration: collabMetrics.averageDuration,
            collaborationNetwork: this.generateCollaborationNetwork(collabMetrics),
            collaborationScore: this.calculateCollaborationScore(collabMetrics)
          };
        }
      }

      // Generate code quality metrics
      if (includeQualityMetrics) {
        const qualityMetrics = this.codeQualityMetrics.get(workspaceId);
        if (qualityMetrics) {
          report.codeQuality = {
            averageScore: qualityMetrics.averageScore,
            averageComplexity: qualityMetrics.averageComplexity,
            totalVulnerabilities: qualityMetrics.totalVulnerabilities,
            qualityTrends: Object.fromEntries(qualityMetrics.qualityTrends),
            qualityDistribution: this.calculateQualityDistribution(qualityMetrics)
          };
        }
      }

      // Generate user breakdown
      if (includeUserBreakdown) {
        report.users = this.generateUserBreakdown(workspaceId, timeRange);
      }

      // Generate file analysis
      if (includeFileAnalysis) {
        report.files = this.generateFileAnalysis(workspaceId, timeRange);
      }

      // Generate trends
      report.trends = this.generateTrendAnalysis(workspaceId, timeRange);

      // Cache report
      const cacheKey = `${workspaceId}:${timeRange}:${Date.now()}`;
      this.analyticsCache.set(cacheKey, {
        report,
        generatedAt: new Date().toISOString()
      });

      logger.info('Workspace analytics report generated', {
        workspaceId,
        timeRange,
        reportSize: JSON.stringify(report).length
      });

      this.emit('report:generated', { workspaceId, timeRange, report });

      return report;

    } catch (error) {
      logger.error('Failed to generate workspace report', { 
        workspaceId,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get real-time workspace metrics
   * @param {string} workspaceId - Workspace identifier
   * @returns {Object} Real-time metrics
   */
  getRealTimeMetrics(workspaceId) {
    try {
      const realTimeMetrics = this.realTimeMetrics.get(workspaceId);
      if (!realTimeMetrics) {
        return this.initializeRealTimeMetrics(workspaceId);
      }

      return {
        currentActiveUsers: realTimeMetrics.currentActiveUsers.size,
        activitiesLastHour: realTimeMetrics.activitiesLastHour,
        activitiesLastMinute: realTimeMetrics.activitiesLastMinute,
        currentCollaborations: realTimeMetrics.currentCollaborations,
        liveEditingSessions: realTimeMetrics.liveEditingSessions.size,
        lastUpdate: realTimeMetrics.lastUpdate
      };

    } catch (error) {
      logger.error('Failed to get real-time metrics', { 
        workspaceId,
        error: error.message 
      });
      return {};
    }
  }

  // Initialization methods
  initializeWorkspaceMetrics(workspaceId) {
    const metrics = {
      workspaceId,
      createdAt: new Date().toISOString(),
      totalActivities: 0,
      lastActivity: null,
      activeUsers: new Set(),
      activitiesByType: new Map(),
      fileActivity: new Map(),
      dailyStats: new Map()
    };

    this.workspaceMetrics.set(workspaceId, metrics);
    return metrics;
  }

  initializeUserMetrics(userKey, workspaceId, userId) {
    const metrics = {
      workspaceId,
      userId,
      joinedAt: new Date().toISOString(),
      totalActivities: 0,
      lastActivity: null,
      linesChanged: 0,
      activitiesByType: new Map(),
      hourlyActivity: new Array(24).fill(0),
      contributionScore: 0
    };

    this.userActivityMetrics.set(userKey, metrics);
    return metrics;
  }

  initializeCollaborationMetrics(workspaceId) {
    const metrics = {
      workspaceId,
      totalEvents: 0,
      lastCollaboration: null,
      eventsByType: new Map(),
      activeCollaborators: new Set(),
      collaborationPairs: new Map(),
      averageDuration: 0
    };

    this.collaborationMetrics.set(workspaceId, metrics);
    return metrics;
  }

  initializeCodeQualityMetrics(workspaceId) {
    const metrics = {
      workspaceId,
      averageScore: 0,
      averageComplexity: 0,
      totalVulnerabilities: 0,
      fileQuality: new Map(),
      qualityTrends: new Map()
    };

    this.codeQualityMetrics.set(workspaceId, metrics);
    return metrics;
  }

  initializeRealTimeMetrics(workspaceId) {
    const metrics = {
      workspaceId,
      currentActiveUsers: new Set(),
      activitiesLastHour: 0,
      activitiesLastMinute: 0,
      currentCollaborations: 0,
      liveEditingSessions: new Set(),
      lastUpdate: new Date().toISOString()
    };

    this.realTimeMetrics.set(workspaceId, metrics);
    return metrics;
  }

  // Helper methods
  updateRealTimeMetrics(workspaceId, userId, activityData) {
    if (!this.realTimeMetrics.has(workspaceId)) {
      this.initializeRealTimeMetrics(workspaceId);
    }

    const metrics = this.realTimeMetrics.get(workspaceId);
    metrics.currentActiveUsers.add(userId);
    metrics.activitiesLastMinute++;
    metrics.activitiesLastHour++;
    metrics.lastUpdate = new Date().toISOString();

    if (activityData.action === 'edit') {
      metrics.liveEditingSessions.add(userId);
    }
  }

  calculateWorkspaceAge(createdAt) {
    const now = new Date();
    const created = new Date(createdAt);
    const diffTime = Math.abs(now - created);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Days
  }

  calculateDailyActivity(workspaceId, timeRange) {
    // Implementation for calculating daily activity
    return {};
  }

  calculatePeakHours(workspaceId) {
    // Implementation for calculating peak activity hours
    return [];
  }

  calculateActivityTrends(workspaceId, timeRange) {
    // Implementation for calculating activity trends
    return {};
  }

  generateCollaborationNetwork(collabMetrics) {
    // Implementation for generating collaboration network
    return {};
  }

  calculateCollaborationScore(collabMetrics) {
    // Implementation for calculating collaboration score
    return 0;
  }

  calculateQualityDistribution(qualityMetrics) {
    // Implementation for calculating quality distribution
    return {};
  }

  generateUserBreakdown(workspaceId, timeRange) {
    // Implementation for generating user breakdown
    return {};
  }

  generateFileAnalysis(workspaceId, timeRange) {
    // Implementation for generating file analysis
    return {};
  }

  generateTrendAnalysis(workspaceId, timeRange) {
    // Implementation for generating trend analysis
    return {};
  }

  startMetricCollectors() {
    // Start periodic metric collection
    setInterval(() => {
      this.collectPeriodicMetrics();
    }, this.config.realTimeUpdateInterval);
  }

  startRealTimeAnalytics() {
    // Start real-time analytics processing
    setInterval(() => {
      this.processRealTimeAnalytics();
    }, 60000); // Every minute
  }

  collectPeriodicMetrics() {
    // Implementation for periodic metric collection
  }

  processRealTimeAnalytics() {
    // Reset minute counters and update hourly counters
    this.realTimeMetrics.forEach(metrics => {
      metrics.activitiesLastMinute = 0;
      // Clean up inactive users
      metrics.currentActiveUsers.clear();
      metrics.liveEditingSessions.clear();
    });
  }

  /**
   * Get service status
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      trackedWorkspaces: this.workspaceMetrics.size,
      trackedUsers: this.userActivityMetrics.size,
      collaborationMetrics: this.collaborationMetrics.size,
      qualityMetrics: this.codeQualityMetrics.size,
      realTimeMetrics: this.realTimeMetrics.size,
      cachedReports: this.analyticsCache.size
    };
  }
}

module.exports = new SharedWorkspaceAnalytics();

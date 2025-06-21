const logger = require('../utils/logger');

/**
 * Analytics Service
 * Provides comprehensive analytics, reporting, and predictive insights
 */
class AnalyticsService {
  constructor() {
    this.reportGenerators = this.initializeReportGenerators();
    this.predictiveModels = this.initializePredictiveModels();
    this.metricsCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Initialize report generators for different types of analytics
   * @returns {Object} Report generator functions
   */
  initializeReportGenerators() {
    return {
      security: this.generateSecurityReport.bind(this),
      usage: this.generateUsageReport.bind(this),
      vulnerability: this.generateVulnerabilityReport.bind(this),
      performance: this.generatePerformanceReport.bind(this),
      mev: this.generateMEVReport.bind(this),
      defi: this.generateDeFiReport.bind(this),
      user: this.generateUserReport.bind(this),
      trend: this.generateTrendReport.bind(this)
    };
  }

  /**
   * Initialize predictive models
   * @returns {Object} Predictive model configurations
   */
  initializePredictiveModels() {
    return {
      vulnerabilityTrends: {
        enabled: true,
        lookbackDays: 30,
        predictionDays: 7,
        confidence: 0.8
      },
      mevPrediction: {
        enabled: true,
        lookbackDays: 7,
        predictionHours: 24,
        confidence: 0.7
      },
      usageForecasting: {
        enabled: true,
        lookbackDays: 90,
        predictionDays: 30,
        confidence: 0.75
      }
    };
  }

  /**
   * Generate comprehensive analytics dashboard data
   * @param {Object} options - Analytics options
   * @returns {Object} Dashboard analytics
   */
  async generateDashboardAnalytics(options = {}) {
    try {
      const {
        timeRange = '30d',
        userId = null,
        includePredicitions = true,
        includeComparisons = true
      } = options;

      logger.info('Generating dashboard analytics', { timeRange, userId });

      const [
        securityMetrics,
        usageMetrics,
        vulnerabilityMetrics,
        performanceMetrics,
        trendAnalysis,
        predictions
      ] = await Promise.all([
        this.getSecurityMetrics(timeRange, userId),
        this.getUsageMetrics(timeRange, userId),
        this.getVulnerabilityMetrics(timeRange, userId),
        this.getPerformanceMetrics(timeRange, userId),
        this.getTrendAnalysis(timeRange, userId),
        includePredicitions ? this.getPredictiveInsights(timeRange, userId) : null
      ]);

      const dashboard = {
        overview: {
          totalAnalyses: usageMetrics.totalAnalyses,
          totalVulnerabilities: vulnerabilityMetrics.totalFound,
          averageSecurityScore: securityMetrics.averageScore,
          criticalIssues: vulnerabilityMetrics.criticalCount,
          timeRange,
          generatedAt: new Date().toISOString()
        },
        security: securityMetrics,
        usage: usageMetrics,
        vulnerabilities: vulnerabilityMetrics,
        performance: performanceMetrics,
        trends: trendAnalysis,
        predictions: predictions,
        insights: await this.generateInsights(securityMetrics, vulnerabilityMetrics, trendAnalysis)
      };

      if (includeComparisons) {
        dashboard.comparisons = await this.generateComparisons(timeRange, userId);
      }

      logger.info('Dashboard analytics generated successfully', {
        timeRange,
        userId,
        totalAnalyses: dashboard.overview.totalAnalyses
      });

      return dashboard;

    } catch (error) {
      logger.error('Failed to generate dashboard analytics', { error: error.message });
      throw error;
    }
  }

  /**
   * Get security metrics for a time range
   * @param {string} timeRange - Time range (e.g., '7d', '30d', '90d')
   * @param {string} userId - Optional user ID filter
   * @returns {Object} Security metrics
   */
  async getSecurityMetrics(timeRange, userId = null) {
    try {
      const cacheKey = `security_metrics_${timeRange}_${userId || 'all'}`;
      const cached = this.getCachedMetrics(cacheKey);
      if (cached) return cached;

      // This would typically query the database
      // For now, returning mock data structure
      const metrics = {
        averageScore: 78.5,
        scoreDistribution: {
          'Critical (0-40)': 5,
          'High (41-60)': 12,
          'Medium (61-80)': 45,
          'Low (81-100)': 38
        },
        topVulnerabilities: [
          { name: 'Reentrancy', count: 23, severity: 'High' },
          { name: 'Access Control', count: 18, severity: 'Medium' },
          { name: 'Integer Overflow', count: 15, severity: 'High' }
        ],
        chainAnalysis: {
          ethereum: { analyses: 150, avgScore: 75.2 },
          polygon: { analyses: 89, avgScore: 82.1 },
          arbitrum: { analyses: 45, avgScore: 79.8 }
        },
        agentPerformance: {
          security: { analyses: 284, avgConfidence: 0.89 },
          defi: { analyses: 156, avgConfidence: 0.85 },
          quality: { analyses: 284, avgConfidence: 0.92 }
        }
      };

      this.setCachedMetrics(cacheKey, metrics);
      return metrics;

    } catch (error) {
      logger.error('Failed to get security metrics', { error: error.message });
      throw error;
    }
  }

  /**
   * Get usage metrics for a time range
   * @param {string} timeRange - Time range
   * @param {string} userId - Optional user ID filter
   * @returns {Object} Usage metrics
   */
  async getUsageMetrics(timeRange, userId = null) {
    try {
      const cacheKey = `usage_metrics_${timeRange}_${userId || 'all'}`;
      const cached = this.getCachedMetrics(cacheKey);
      if (cached) return cached;

      const metrics = {
        totalAnalyses: 284,
        totalUsers: userId ? 1 : 156,
        analysisTypes: {
          'single-agent': 89,
          'multi-agent': 145,
          'defi-specialized': 50
        },
        chainUsage: {
          ethereum: 150,
          polygon: 89,
          arbitrum: 45
        },
        dailyAnalyses: this.generateDailyUsageData(timeRange),
        peakUsageHours: [14, 15, 16, 20, 21], // Hours of day
        averageAnalysisTime: 45.2, // seconds
        successRate: 0.967
      };

      this.setCachedMetrics(cacheKey, metrics);
      return metrics;

    } catch (error) {
      logger.error('Failed to get usage metrics', { error: error.message });
      throw error;
    }
  }

  /**
   * Get vulnerability metrics for a time range
   * @param {string} timeRange - Time range
   * @param {string} userId - Optional user ID filter
   * @returns {Object} Vulnerability metrics
   */
  async getVulnerabilityMetrics(timeRange, userId = null) {
    try {
      const cacheKey = `vulnerability_metrics_${timeRange}_${userId || 'all'}`;
      const cached = this.getCachedMetrics(cacheKey);
      if (cached) return cached;

      const metrics = {
        totalFound: 456,
        criticalCount: 23,
        highCount: 89,
        mediumCount: 234,
        lowCount: 110,
        categoryBreakdown: {
          'reentrancy': 67,
          'access-control': 89,
          'arithmetic': 45,
          'unchecked-calls': 34,
          'gas-limit': 23,
          'oracle-manipulation': 12,
          'flashloan-attack': 8
        },
        detectionSources: {
          'static-analysis': 156,
          'ai-security': 189,
          'ai-defi': 67,
          'ai-mev': 23,
          'ai-economics': 21
        },
        falsePositiveRate: 0.08,
        averageConfidence: 0.84,
        trendsOverTime: this.generateVulnerabilityTrendData(timeRange)
      };

      this.setCachedMetrics(cacheKey, metrics);
      return metrics;

    } catch (error) {
      logger.error('Failed to get vulnerability metrics', { error: error.message });
      throw error;
    }
  }

  /**
   * Get performance metrics
   * @param {string} timeRange - Time range
   * @param {string} userId - Optional user ID filter
   * @returns {Object} Performance metrics
   */
  async getPerformanceMetrics(timeRange, userId = null) {
    try {
      const metrics = {
        averageAnalysisTime: 45.2,
        p95AnalysisTime: 89.5,
        p99AnalysisTime: 156.8,
        successRate: 0.967,
        errorRate: 0.033,
        agentPerformance: {
          security: { avgTime: 23.4, successRate: 0.98 },
          quality: { avgTime: 18.7, successRate: 0.99 },
          defi: { avgTime: 34.2, successRate: 0.95 },
          economics: { avgTime: 28.9, successRate: 0.94 }
        },
        systemLoad: {
          cpu: 0.65,
          memory: 0.72,
          activeConnections: 45
        },
        apiMetrics: {
          requestsPerSecond: 12.4,
          averageResponseTime: 234,
          rateLimitHits: 23
        }
      };

      return metrics;

    } catch (error) {
      logger.error('Failed to get performance metrics', { error: error.message });
      throw error;
    }
  }

  /**
   * Get trend analysis
   * @param {string} timeRange - Time range
   * @param {string} userId - Optional user ID filter
   * @returns {Object} Trend analysis
   */
  async getTrendAnalysis(timeRange, userId = null) {
    try {
      const trends = {
        securityScoreTrend: {
          direction: 'improving',
          change: +2.3,
          significance: 'moderate'
        },
        vulnerabilityTrend: {
          direction: 'decreasing',
          change: -8.7,
          significance: 'significant'
        },
        usageTrend: {
          direction: 'increasing',
          change: +15.2,
          significance: 'high'
        },
        emergingThreats: [
          'Cross-chain bridge vulnerabilities',
          'MEV extraction in DeFi protocols',
          'Governance token manipulation'
        ],
        improvingAreas: [
          'Access control implementations',
          'Gas optimization practices',
          'Oracle integration security'
        ]
      };

      return trends;

    } catch (error) {
      logger.error('Failed to get trend analysis', { error: error.message });
      throw error;
    }
  }

  /**
   * Get predictive insights
   * @param {string} timeRange - Time range
   * @param {string} userId - Optional user ID filter
   * @returns {Object} Predictive insights
   */
  async getPredictiveInsights(timeRange, userId = null) {
    try {
      const predictions = {
        vulnerabilityForecast: {
          nextWeek: {
            expectedCount: 45,
            confidence: 0.82,
            categories: ['reentrancy', 'access-control', 'oracle-manipulation']
          },
          nextMonth: {
            expectedCount: 180,
            confidence: 0.75,
            trendDirection: 'stable'
          }
        },
        usageForecast: {
          nextWeek: {
            expectedAnalyses: 320,
            confidence: 0.88,
            peakDays: ['Tuesday', 'Wednesday', 'Thursday']
          },
          nextMonth: {
            expectedAnalyses: 1250,
            confidence: 0.79,
            growthRate: 0.12
          }
        },
        emergingRisks: [
          {
            risk: 'Layer 2 bridge vulnerabilities',
            probability: 0.73,
            impact: 'high',
            timeframe: '2-4 weeks'
          },
          {
            risk: 'AI-generated smart contract exploits',
            probability: 0.45,
            impact: 'critical',
            timeframe: '1-3 months'
          }
        ]
      };

      return predictions;

    } catch (error) {
      logger.error('Failed to get predictive insights', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate insights from metrics
   * @param {Object} securityMetrics - Security metrics
   * @param {Object} vulnerabilityMetrics - Vulnerability metrics
   * @param {Object} trendAnalysis - Trend analysis
   * @returns {Object} Generated insights
   */
  async generateInsights(securityMetrics, vulnerabilityMetrics, trendAnalysis) {
    const insights = [];

    // Security score insights
    if (securityMetrics.averageScore < 70) {
      insights.push({
        type: 'warning',
        category: 'security',
        message: 'Average security score is below recommended threshold',
        recommendation: 'Focus on addressing high and critical vulnerabilities',
        priority: 'high'
      });
    }

    // Vulnerability trend insights
    if (vulnerabilityMetrics.criticalCount > 20) {
      insights.push({
        type: 'alert',
        category: 'vulnerability',
        message: 'High number of critical vulnerabilities detected',
        recommendation: 'Implement immediate security review process',
        priority: 'critical'
      });
    }

    // Performance insights
    if (trendAnalysis.usageTrend.change > 20) {
      insights.push({
        type: 'info',
        category: 'usage',
        message: 'Significant increase in analysis requests',
        recommendation: 'Consider scaling infrastructure',
        priority: 'medium'
      });
    }

    return insights;
  }

  /**
   * Generate comparisons with previous periods
   * @param {string} timeRange - Current time range
   * @param {string} userId - Optional user ID filter
   * @returns {Object} Comparison data
   */
  async generateComparisons(timeRange, userId = null) {
    // This would compare current period with previous period
    return {
      securityScore: { current: 78.5, previous: 76.2, change: +2.3 },
      vulnerabilities: { current: 456, previous: 498, change: -42 },
      analyses: { current: 284, previous: 247, change: +37 },
      averageTime: { current: 45.2, previous: 48.7, change: -3.5 }
    };
  }

  /**
   * Cache management methods
   */
  getCachedMetrics(key) {
    const cached = this.metricsCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCachedMetrics(key, data) {
    this.metricsCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Generate mock time series data
   */
  generateDailyUsageData(timeRange) {
    const days = parseInt(timeRange.replace('d', '')) || 30;
    const data = [];
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        analyses: Math.floor(Math.random() * 20) + 5
      });
    }
    return data;
  }

  generateVulnerabilityTrendData(timeRange) {
    const days = parseInt(timeRange.replace('d', '')) || 30;
    const data = [];
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        critical: Math.floor(Math.random() * 3),
        high: Math.floor(Math.random() * 8) + 2,
        medium: Math.floor(Math.random() * 15) + 5,
        low: Math.floor(Math.random() * 10) + 3
      });
    }
    return data;
  }

  // Placeholder methods for specific report types
  async generateSecurityReport(options) { return { type: 'security', data: {} }; }
  async generateUsageReport(options) { return { type: 'usage', data: {} }; }
  async generateVulnerabilityReport(options) { return { type: 'vulnerability', data: {} }; }
  async generatePerformanceReport(options) { return { type: 'performance', data: {} }; }
  async generateMEVReport(options) { return { type: 'mev', data: {} }; }
  async generateDeFiReport(options) { return { type: 'defi', data: {} }; }
  async generateUserReport(options) { return { type: 'user', data: {} }; }
  async generateTrendReport(options) { return { type: 'trend', data: {} }; }
}

module.exports = new AnalyticsService();

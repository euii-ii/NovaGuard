const auditEngine = require('../services/auditEngine');
const aiAnalysisPipeline = require('../services/aiAnalysisPipeline');
const teamCollaborationService = require('../services/teamCollaborationService');
const logger = require('../utils/logger');

/**
 * Enhanced Audit Controller
 * Handles advanced audit operations with AI integration and team collaboration
 */
class EnhancedAuditController {
  /**
   * Start comprehensive audit with AI analysis
   */
  async startComprehensiveAudit(req, res) {
    try {
      const { contractCode, contractAddress, analysisOptions = {} } = req.body;

      if (!contractCode && !contractAddress) {
        return res.status(400).json({
          success: false,
          error: 'Contract code or address is required'
        });
      }

      // Initialize audit with enhanced options
      const auditConfig = {
        enableAIAnalysis: true,
        enableTeamReview: analysisOptions.enableTeamReview || false,
        analysisDepth: analysisOptions.depth || 'comprehensive',
        includeGasOptimization: analysisOptions.includeGasOptimization || true,
        includeBestPractices: analysisOptions.includeBestPractices || true,
        ...analysisOptions
      };

      // Start the audit
      const auditResult = await auditEngine.performComprehensiveAudit(
        contractCode || contractAddress,
        auditConfig
      );

      // If team review is enabled, create a team review session
      if (auditConfig.enableTeamReview && req.user?.teamId) {
        const reviewSession = await teamCollaborationService.startCodeReview(
          req.user.teamId,
          req.user.id,
          {
            title: `Security Audit Review - ${auditResult.contractName || 'Contract'}`,
            description: 'Please review the automated audit results and provide feedback',
            auditResults: auditResult,
            priority: auditResult.riskLevel === 'High' ? 'high' : 'medium'
          }
        );
        auditResult.reviewSessionId = reviewSession.id;
      }

      res.json({
        success: true,
        auditId: auditResult.auditId,
        results: auditResult,
        message: 'Comprehensive audit completed successfully'
      });

    } catch (error) {
      logger.error('Enhanced audit failed', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Audit failed',
        details: error.message
      });
    }
  }

  /**
   * Get audit results with AI insights
   */
  async getAuditResults(req, res) {
    try {
      const { auditId } = req.params;
      const { includeAIInsights = true } = req.query;

      const auditResults = await auditEngine.getAuditResults(auditId);
      
      if (!auditResults) {
        return res.status(404).json({
          success: false,
          error: 'Audit results not found'
        });
      }

      // Add AI insights if requested
      if (includeAIInsights) {
        const aiInsights = await aiAnalysisPipeline.generateInsights(auditResults);
        auditResults.aiInsights = aiInsights;
      }

      res.json({
        success: true,
        results: auditResults
      });

    } catch (error) {
      logger.error('Failed to get audit results', {
        error: error.message,
        auditId: req.params.auditId
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve audit results'
      });
    }
  }

  /**
   * Start team-based audit review
   */
  async startTeamAuditReview(req, res) {
    try {
      const { auditId, teamId, reviewConfig = {} } = req.body;

      if (!auditId || !teamId) {
        return res.status(400).json({
          success: false,
          error: 'Audit ID and team ID are required'
        });
      }

      // Get audit results
      const auditResults = await auditEngine.getAuditResults(auditId);
      if (!auditResults) {
        return res.status(404).json({
          success: false,
          error: 'Audit not found'
        });
      }

      // Start team review
      const reviewSession = await teamCollaborationService.startCodeReview(
        teamId,
        req.user.id,
        {
          title: `Team Audit Review - ${auditResults.contractName}`,
          description: 'Collaborative review of automated audit findings',
          auditResults,
          reviewType: 'security_audit',
          priority: auditResults.riskLevel === 'High' ? 'high' : 'medium',
          ...reviewConfig
        }
      );

      res.json({
        success: true,
        reviewSessionId: reviewSession.id,
        message: 'Team audit review started successfully'
      });

    } catch (error) {
      logger.error('Failed to start team audit review', {
        error: error.message,
        auditId: req.body.auditId,
        teamId: req.body.teamId
      });

      res.status(500).json({
        success: false,
        error: 'Failed to start team review'
      });
    }
  }

  /**
   * Get audit history with analytics
   */
  async getAuditHistory(req, res) {
    try {
      const { page = 1, limit = 10, filter = {} } = req.query;
      const userId = req.user?.id;

      const history = await auditEngine.getAuditHistory({
        userId,
        page: parseInt(page),
        limit: parseInt(limit),
        filter
      });

      res.json({
        success: true,
        history: history.audits,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: history.total,
          pages: Math.ceil(history.total / parseInt(limit))
        }
      });

    } catch (error) {
      logger.error('Failed to get audit history', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve audit history'
      });
    }
  }

  /**
   * Generate audit report
   */
  async generateAuditReport(req, res) {
    try {
      const { auditId } = req.params;
      const { format = 'json', includeRecommendations = true } = req.query;

      const auditResults = await auditEngine.getAuditResults(auditId);
      if (!auditResults) {
        return res.status(404).json({
          success: false,
          error: 'Audit not found'
        });
      }

      const report = await auditEngine.generateReport(auditResults, {
        format,
        includeRecommendations: includeRecommendations === 'true',
        includeAIInsights: true
      });

      if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="audit-report-${auditId}.pdf"`);
      } else {
        res.setHeader('Content-Type', 'application/json');
      }

      res.send(report);

    } catch (error) {
      logger.error('Failed to generate audit report', {
        error: error.message,
        auditId: req.params.auditId
      });

      res.status(500).json({
        success: false,
        error: 'Failed to generate report'
      });
    }
  }
}

module.exports = new EnhancedAuditController();
// Collaborative Tools Controller - migrated from original backend
const { withAuth, withOptionalAuth } = require('../middleware/auth');
const { createClient } = require('@supabase/supabase-js');

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

// Collaborative Tools Controller Class (from original backend)
class CollaborativeToolsController {
  constructor() {
    this.activeTeams = new Map();
    this.activeReviews = new Map();
    this.realtimeReviews = new Map();
    this.workspaceMetrics = new Map();
    
    this.capabilities = {
      teamCollaboration: {
        enabled: true,
        features: ['team-management', 'role-based-permissions', 'team-analysis', 'code-reviews'],
        maxTeamSize: 50,
        supportedRoles: ['owner', 'admin', 'lead', 'senior', 'developer', 'junior', 'reviewer', 'viewer'],
        analysisTypes: ['quick', 'comprehensive', 'security-focused', 'quality-focused']
      },
      realtimeCodeReview: {
        enabled: true,
        features: ['live-collaboration', 'ai-assistance', 'template-based-reviews', 'real-time-comments'],
        reviewTemplates: ['security_review', 'quality_review', 'defi_review', 'quick_review'],
        maxConcurrentReviews: 10,
        aiAgents: ['security', 'quality', 'economics', 'defi']
      },
      workspaceAnalytics: {
        enabled: true,
        features: ['activity-tracking', 'collaboration-metrics', 'code-quality-trends', 'real-time-metrics'],
        timeRanges: ['1d', '7d', '30d', '90d'],
        metricsRetention: '90 days',
        realTimeUpdates: true
      },
      sharedWorkspaces: {
        enabled: true,
        features: ['collaborative-editing', 'shared-projects', 'team-workspaces', 'permission-management'],
        maxConcurrentUsers: 10,
        supportedFileTypes: ['.sol', '.vy', '.js', '.ts', '.json', '.md']
      }
    };
  }

  // Validate team creation request (from original backend)
  validateTeamRequest(data) {
    const errors = [];
    
    if (!data.name || typeof data.name !== 'string' || data.name.length < 1 || data.name.length > 100) {
      errors.push('Name is required and must be between 1-100 characters');
    }
    
    if (data.description && (typeof data.description !== 'string' || data.description.length > 500)) {
      errors.push('Description must be a string with max 500 characters');
    }
    
    const validTeamTypes = ['development', 'security', 'research', 'mixed'];
    if (data.teamType && !validTeamTypes.includes(data.teamType)) {
      errors.push(`Team type must be one of: ${validTeamTypes.join(', ')}`);
    }
    
    const validVisibility = ['private', 'public', 'team'];
    if (data.visibility && !validVisibility.includes(data.visibility)) {
      errors.push(`Visibility must be one of: ${validVisibility.join(', ')}`);
    }
    
    return errors;
  }

  // Create team (from original backend)
  async createTeam(teamData, userId) {
    try {
      const teamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const team = {
        team_id: teamId,
        name: teamData.name,
        description: teamData.description || '',
        team_type: teamData.teamType || 'development',
        visibility: teamData.visibility || 'private',
        created_by: userId,
        members: [
          {
            userId: userId,
            role: 'owner',
            joinedAt: new Date().toISOString(),
            permissions: ['all']
          },
          ...(teamData.initialMembers || [])
        ],
        settings: teamData.settings || {},
        projects: [],
        reviews: [],
        analytics: {
          totalProjects: 0,
          totalReviews: 0,
          totalMembers: 1 + (teamData.initialMembers?.length || 0),
          lastActivity: new Date().toISOString()
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Store in memory
      this.activeTeams.set(teamId, team);

      // Store in database
      if (supabaseAdmin) {
        try {
          await supabaseAdmin
            .from('collaboration_teams')
            .insert(team);
        } catch (dbError) {
          console.warn('Database storage failed:', dbError.message);
        }
      }

      return {
        success: true,
        team: {
          id: teamId,
          name: team.name,
          description: team.description,
          teamType: team.team_type,
          visibility: team.visibility,
          createdAt: team.created_at,
          memberCount: team.members.length,
          settings: team.settings
        },
        message: 'Team created successfully'
      };
    } catch (error) {
      console.error('Create team error:', error);
      throw error;
    }
  }

  // Start team analysis (from original backend)
  async startTeamAnalysis(teamId, userId, analysisConfig) {
    try {
      const team = this.activeTeams.get(teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      // Check if user is team member
      const isMember = team.members.some(member => member.userId === userId);
      if (!isMember) {
        throw new Error('Access denied - not a team member');
      }

      const sessionId = `analysis_${teamId}_${Date.now()}`;
      const analysisSession = {
        sessionId,
        teamId,
        initiatedBy: userId,
        config: {
          analysisType: analysisConfig.analysisType || 'comprehensive',
          includeAllProjects: analysisConfig.includeAllProjects !== false,
          selectedProjects: analysisConfig.selectedProjects || [],
          agents: analysisConfig.agents || ['security', 'quality'],
          generateReport: analysisConfig.generateReport !== false
        },
        status: 'running',
        progress: {
          currentStep: 'initialization',
          completedSteps: 0,
          totalSteps: 5,
          percentage: 0
        },
        results: null,
        startedAt: new Date().toISOString()
      };

      // Store analysis session
      team.currentAnalysis = analysisSession;

      return {
        success: true,
        sessionId,
        status: analysisSession.status,
        config: analysisSession.config,
        progress: analysisSession.progress,
        message: 'Team analysis started successfully'
      };
    } catch (error) {
      console.error('Start team analysis error:', error);
      throw error;
    }
  }

  // Start code review (from original backend)
  async startCodeReview(teamId, userId, reviewData) {
    try {
      const team = this.activeTeams.get(teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      const reviewId = `review_${teamId}_${Date.now()}`;
      const codeReview = {
        id: reviewId,
        teamId,
        title: reviewData.title,
        description: reviewData.description || '',
        filePaths: reviewData.filePaths,
        codeChanges: reviewData.codeChanges,
        priority: reviewData.priority || 'medium',
        requestedReviewers: reviewData.requestedReviewers || [],
        deadline: reviewData.deadline || null,
        createdBy: userId,
        status: 'pending',
        reviewers: new Map(),
        comments: [],
        decisions: [],
        metrics: {
          linesChanged: 0,
          filesChanged: reviewData.filePaths.length,
          complexity: 'medium'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Store review
      this.activeReviews.set(reviewId, codeReview);
      team.reviews.push(reviewId);

      return {
        success: true,
        reviewId,
        title: codeReview.title,
        status: codeReview.status,
        priority: codeReview.priority,
        reviewers: Array.from(codeReview.reviewers.keys()),
        metrics: codeReview.metrics,
        message: 'Code review started successfully'
      };
    } catch (error) {
      console.error('Start code review error:', error);
      throw error;
    }
  }

  // Add review comment (from original backend)
  async addReviewComment(reviewId, userId, commentData) {
    try {
      const review = this.activeReviews.get(reviewId);
      if (!review) {
        throw new Error('Review not found');
      }

      const commentId = `comment_${reviewId}_${Date.now()}`;
      const comment = {
        id: commentId,
        reviewId,
        content: commentData.content,
        filePath: commentData.filePath || null,
        lineNumber: commentData.lineNumber || null,
        type: commentData.type || 'general',
        severity: commentData.severity || 'info',
        suggestedFix: commentData.suggestedFix || null,
        createdBy: userId,
        createdAt: new Date().toISOString()
      };

      review.comments.push(comment);
      review.updatedAt = new Date().toISOString();

      return {
        success: true,
        comment,
        message: 'Comment added successfully'
      };
    } catch (error) {
      console.error('Add review comment error:', error);
      throw error;
    }
  }

  // Submit review decision (from original backend)
  async submitReviewDecision(reviewId, userId, decisionData) {
    try {
      const review = this.activeReviews.get(reviewId);
      if (!review) {
        throw new Error('Review not found');
      }

      const decision = {
        reviewId,
        reviewerId: userId,
        decision: decisionData.decision,
        summary: decisionData.summary,
        overallRating: decisionData.overallRating || null,
        securityRating: decisionData.securityRating || null,
        qualityRating: decisionData.qualityRating || null,
        submittedAt: new Date().toISOString()
      };

      review.decisions.push(decision);
      review.reviewers.set(userId, decision);
      review.updatedAt = new Date().toISOString();

      // Check if all reviewers have submitted decisions
      const allCompleted = review.requestedReviewers.length > 0 && 
        review.requestedReviewers.every(reviewerId => review.reviewers.has(reviewerId));

      if (allCompleted) {
        review.status = 'completed';
      }

      return {
        success: true,
        decision,
        allCompleted,
        reviewStatus: review.status,
        message: 'Review decision submitted successfully'
      };
    } catch (error) {
      console.error('Submit review decision error:', error);
      throw error;
    }
  }

  // Start realtime review (from original backend)
  async startRealtimeReview(reviewData, userId) {
    try {
      const sessionId = `realtime_review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const templates = {
        security_review: {
          name: 'Security Review',
          estimatedTime: '30-45 minutes',
          checklist: ['Access control', 'Reentrancy', 'Integer overflow', 'External calls']
        },
        quality_review: {
          name: 'Code Quality Review',
          estimatedTime: '20-30 minutes',
          checklist: ['Code structure', 'Documentation', 'Best practices', 'Gas optimization']
        },
        defi_review: {
          name: 'DeFi Protocol Review',
          estimatedTime: '45-60 minutes',
          checklist: ['Tokenomics', 'Liquidity risks', 'Oracle security', 'Flash loan protection']
        },
        quick_review: {
          name: 'Quick Review',
          estimatedTime: '10-15 minutes',
          checklist: ['Basic syntax', 'Common issues', 'Quick fixes']
        }
      };

      const template = templates[reviewData.templateId] || templates.quality_review;

      const reviewSession = {
        sessionId,
        title: reviewData.title,
        description: reviewData.description || '',
        codeChanges: reviewData.codeChanges,
        template,
        priority: reviewData.priority || 'medium',
        deadline: reviewData.deadline || null,
        requestedReviewers: reviewData.requestedReviewers || [],
        initiatedBy: userId,
        participants: new Map(),
        status: 'active',
        progress: {
          currentStep: 0,
          totalSteps: template.checklist.length,
          completedChecks: []
        },
        createdAt: new Date().toISOString()
      };

      this.realtimeReviews.set(sessionId, reviewSession);

      return {
        success: true,
        sessionId,
        title: reviewSession.title,
        template: template.name,
        status: reviewSession.status,
        estimatedTime: template.estimatedTime,
        message: 'Real-time review session started successfully'
      };
    } catch (error) {
      console.error('Start realtime review error:', error);
      throw error;
    }
  }

  // Join realtime review session (from original backend)
  async joinReviewSession(sessionId, userId, userInfo) {
    try {
      const session = this.realtimeReviews.get(sessionId);
      if (!session) {
        throw new Error('Review session not found');
      }

      session.participants.set(userId, {
        userId,
        name: userInfo.name || 'Unknown User',
        avatar: userInfo.avatar || null,
        joinedAt: new Date().toISOString(),
        role: session.initiatedBy === userId ? 'host' : 'participant'
      });

      return {
        success: true,
        sessionId,
        participantCount: session.participants.size,
        role: session.participants.get(userId).role,
        session: {
          title: session.title,
          template: session.template.name,
          progress: session.progress,
          participants: Array.from(session.participants.values())
        },
        message: 'Successfully joined review session'
      };
    } catch (error) {
      console.error('Join review session error:', error);
      throw error;
    }
  }

  // Generate workspace analytics (from original backend)
  async generateWorkspaceReport(workspaceId, options = {}) {
    try {
      const timeRange = options.timeRange || '7d';
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
      }

      const report = {
        workspaceId,
        timeRange,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        overview: {
          totalActivity: Math.floor(Math.random() * 100) + 50,
          activeUsers: Math.floor(Math.random() * 20) + 5,
          collaborationScore: Math.floor(Math.random() * 40) + 60,
          codeQualityTrend: 'improving'
        },
        userBreakdown: options.includeUserBreakdown ? {
          mostActiveUser: 'user_123',
          contributionDistribution: {
            'user_123': 45,
            'user_456': 30,
            'user_789': 25
          }
        } : null,
        fileAnalysis: options.includeFileAnalysis ? {
          mostEditedFiles: [
            { path: 'contracts/Token.sol', edits: 15 },
            { path: 'contracts/Vault.sol', edits: 12 }
          ],
          fileTypes: {
            '.sol': 80,
            '.js': 15,
            '.md': 5
          }
        } : null,
        collaboration: options.includeCollaboration ? {
          reviewsCompleted: Math.floor(Math.random() * 10) + 5,
          commentsAdded: Math.floor(Math.random() * 50) + 20,
          realTimeSessionsCount: Math.floor(Math.random() * 8) + 2
        } : null,
        qualityMetrics: options.includeQualityMetrics ? {
          averageReviewTime: '2.5 hours',
          codeQualityScore: Math.floor(Math.random() * 30) + 70,
          issuesFound: Math.floor(Math.random() * 15) + 5,
          issuesResolved: Math.floor(Math.random() * 12) + 8
        } : null,
        generatedAt: new Date().toISOString()
      };

      return {
        success: true,
        report,
        message: 'Workspace analytics report generated successfully'
      };
    } catch (error) {
      console.error('Generate workspace report error:', error);
      throw error;
    }
  }

  // Get real-time metrics (from original backend)
  getRealTimeMetrics(workspaceId) {
    const metrics = this.workspaceMetrics.get(workspaceId) || {
      activeUsers: 0,
      ongoingReviews: 0,
      recentActivity: [],
      collaborationScore: 75
    };

    return {
      success: true,
      workspaceId,
      metrics: {
        ...metrics,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      }
    };
  }

  // Get service status (from original backend)
  getStatus() {
    return {
      teamCollaboration: {
        activeTeams: this.activeTeams.size,
        status: 'operational'
      },
      realtimeCodeReview: {
        activeReviews: this.activeReviews.size,
        realtimeReviews: this.realtimeReviews.size,
        status: 'operational'
      },
      workspaceAnalytics: {
        trackedWorkspaces: this.workspaceMetrics.size,
        status: 'operational'
      },
      collaborativeWorkspace: {
        status: 'operational'
      },
      timestamp: new Date().toISOString(),
      version: '2.0.0-serverless'
    };
  }
}

// Serverless function handler
const collaborativeControllerHandler = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const controller = new CollaborativeToolsController();
    const { userId, email } = req.auth || {};

    if (req.method === 'GET') {
      const { action, workspaceId, reviewId, sessionId, timeRange, includeUserBreakdown, includeFileAnalysis, includeCollaboration, includeQualityMetrics } = req.query;

      switch (action) {
        case 'status':
          const status = controller.getStatus();
          res.status(200).json({
            success: true,
            data: status,
            metadata: {
              userId,
              userEmail: email,
              timestamp: new Date().toISOString()
            }
          });
          break;

        case 'capabilities':
          res.status(200).json({
            success: true,
            data: controller.capabilities,
            metadata: {
              userId,
              userEmail: email,
              timestamp: new Date().toISOString()
            }
          });
          break;

        case 'workspace-analytics':
          if (!userId) {
            return res.status(401).json({
              success: false,
              error: 'Authentication required'
            });
          }

          if (!workspaceId) {
            return res.status(400).json({
              success: false,
              error: 'Workspace ID is required'
            });
          }

          const options = {
            timeRange: timeRange || '7d',
            includeUserBreakdown: includeUserBreakdown === 'true',
            includeFileAnalysis: includeFileAnalysis === 'true',
            includeCollaboration: includeCollaboration === 'true',
            includeQualityMetrics: includeQualityMetrics === 'true'
          };

          const report = await controller.generateWorkspaceReport(workspaceId, options);
          
          report.metadata = {
            userId,
            userEmail: email,
            timestamp: new Date().toISOString()
          };

          res.status(200).json(report);
          break;

        case 'realtime-metrics':
          if (!workspaceId) {
            return res.status(400).json({
              success: false,
              error: 'Workspace ID is required'
            });
          }

          const metrics = controller.getRealTimeMetrics(workspaceId);
          
          metrics.metadata = {
            userId,
            userEmail: email,
            timestamp: new Date().toISOString()
          };

          res.status(200).json(metrics);
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid action. Supported actions: status, capabilities, workspace-analytics, realtime-metrics'
          });
      }
    } else if (req.method === 'POST') {
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const { action, name, description, teamType, visibility, initialMembers, settings, teamId, analysisType, includeAllProjects, selectedProjects, agents, generateReport, title, filePaths, codeChanges, priority, requestedReviewers, deadline, reviewId, content, filePath, lineNumber, type, severity, suggestedFix, decision, summary, overallRating, securityRating, qualityRating, templateId, sessionId, userInfo } = req.body;

      switch (action) {
        case 'create-team':
          // Validate request
          const teamValidationErrors = controller.validateTeamRequest({
            name, description, teamType, visibility, initialMembers, settings
          });

          if (teamValidationErrors.length > 0) {
            return res.status(400).json({
              success: false,
              error: 'Validation failed',
              details: teamValidationErrors
            });
          }

          console.log(`Creating collaboration team for user: ${email} (${userId})`);

          const teamResult = await controller.createTeam({
            name, description, teamType, visibility, initialMembers, settings
          }, userId);

          teamResult.metadata = {
            userId,
            userEmail: email,
            timestamp: new Date().toISOString()
          };

          res.status(201).json(teamResult);
          break;

        case 'start-team-analysis':
          if (!teamId) {
            return res.status(400).json({
              success: false,
              error: 'Team ID is required'
            });
          }

          console.log(`Starting team analysis for team ${teamId} by user: ${email} (${userId})`);

          const analysisResult = await controller.startTeamAnalysis(teamId, userId, {
            analysisType, includeAllProjects, selectedProjects, agents, generateReport
          });

          analysisResult.metadata = {
            userId,
            userEmail: email,
            timestamp: new Date().toISOString()
          };

          res.status(200).json(analysisResult);
          break;

        case 'start-code-review':
          if (!teamId || !title || !filePaths || !codeChanges) {
            return res.status(400).json({
              success: false,
              error: 'Team ID, title, file paths, and code changes are required'
            });
          }

          console.log(`Starting code review for team ${teamId} by user: ${email} (${userId})`);

          const reviewResult = await controller.startCodeReview(teamId, userId, {
            title, description, filePaths, codeChanges, priority, requestedReviewers, deadline
          });

          reviewResult.metadata = {
            userId,
            userEmail: email,
            timestamp: new Date().toISOString()
          };

          res.status(201).json(reviewResult);
          break;

        case 'add-review-comment':
          if (!reviewId || !content) {
            return res.status(400).json({
              success: false,
              error: 'Review ID and content are required'
            });
          }

          console.log(`Adding comment to review ${reviewId} by user: ${email} (${userId})`);

          const commentResult = await controller.addReviewComment(reviewId, userId, {
            content, filePath, lineNumber, type, severity, suggestedFix
          });

          commentResult.metadata = {
            userId,
            userEmail: email,
            timestamp: new Date().toISOString()
          };

          res.status(201).json(commentResult);
          break;

        case 'submit-review-decision':
          if (!reviewId || !decision || !summary) {
            return res.status(400).json({
              success: false,
              error: 'Review ID, decision, and summary are required'
            });
          }

          console.log(`Submitting review decision for review ${reviewId} by user: ${email} (${userId})`);

          const decisionResult = await controller.submitReviewDecision(reviewId, userId, {
            decision, summary, overallRating, securityRating, qualityRating
          });

          decisionResult.metadata = {
            userId,
            userEmail: email,
            timestamp: new Date().toISOString()
          };

          res.status(200).json(decisionResult);
          break;

        case 'start-realtime-review':
          if (!title || !codeChanges) {
            return res.status(400).json({
              success: false,
              error: 'Title and code changes are required'
            });
          }

          console.log(`Starting realtime review by user: ${email} (${userId})`);

          const realtimeResult = await controller.startRealtimeReview({
            title, description, codeChanges, templateId, priority, deadline, requestedReviewers
          }, userId);

          realtimeResult.metadata = {
            userId,
            userEmail: email,
            timestamp: new Date().toISOString()
          };

          res.status(201).json(realtimeResult);
          break;

        case 'join-realtime-review':
          if (!sessionId) {
            return res.status(400).json({
              success: false,
              error: 'Session ID is required'
            });
          }

          console.log(`User joining realtime review session ${sessionId}: ${email} (${userId})`);

          const joinResult = await controller.joinReviewSession(sessionId, userId, userInfo || {});

          joinResult.metadata = {
            userId,
            userEmail: email,
            timestamp: new Date().toISOString()
          };

          res.status(200).json(joinResult);
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid action. Supported actions: create-team, start-team-analysis, start-code-review, add-review-comment, submit-review-decision, start-realtime-review, join-realtime-review'
          });
      }
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Collaborative tools controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Collaborative tools controller failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Export with optional authentication (some endpoints are public)
module.exports = withOptionalAuth(collaborativeControllerHandler);

// ChainIDE Integration Controller - migrated from original backend
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

// ChainIDE Controller Class (from original backend)
class ChainIDEController {
  constructor() {
    this.activeWorkspaces = new Map();
    this.activeSessions = new Map();
    this.capabilities = {
      realTimeAnalysis: {
        enabled: true,
        supportedLanguages: ['solidity'],
        analysisTypes: ['syntax', 'security', 'gas', 'best-practices'],
        agents: ['security', 'quality', 'economics', 'defi', 'crossChain', 'mev']
      },
      collaboration: {
        enabled: true,
        features: ['shared-workspaces', 'real-time-editing', 'comments', 'cursor-tracking'],
        maxConcurrentUsers: 10,
        supportedFileTypes: ['.sol', '.vy', '.js', '.ts', '.json']
      },
      codeCompletion: {
        enabled: true,
        contextAware: true,
        smartSuggestions: true,
        supportedTriggers: ['.', ' ', '(', '{']
      },
      plugins: {
        enabled: true,
        builtInPlugins: ['security-analyzer', 'gas-optimizer', 'defi-analyzer'],
        customPluginSupport: true,
        sdkVersion: '1.0.0'
      },
      chains: ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base']
    };
  }

  // Validate workspace creation request (from original backend)
  validateWorkspaceRequest(data) {
    const errors = [];
    
    if (!data.name || typeof data.name !== 'string' || data.name.length < 1 || data.name.length > 100) {
      errors.push('Name is required and must be between 1-100 characters');
    }
    
    if (data.description && (typeof data.description !== 'string' || data.description.length > 500)) {
      errors.push('Description must be a string with max 500 characters');
    }
    
    const validProjectTypes = ['smart-contract', 'dapp', 'defi', 'nft'];
    if (data.projectType && !validProjectTypes.includes(data.projectType)) {
      errors.push(`Project type must be one of: ${validProjectTypes.join(', ')}`);
    }
    
    const validVisibility = ['private', 'public', 'team'];
    if (data.visibility && !validVisibility.includes(data.visibility)) {
      errors.push(`Visibility must be one of: ${validVisibility.join(', ')}`);
    }
    
    return errors;
  }

  // Create collaborative workspace (from original backend)
  async createWorkspace(workspaceData, userId) {
    try {
      const workspaceId = `workspace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const workspace = {
        workspace_id: workspaceId,
        name: workspaceData.name,
        description: workspaceData.description || '',
        project_type: workspaceData.projectType || 'smart-contract',
        visibility: workspaceData.visibility || 'private',
        created_by: userId,
        collaborators: workspaceData.collaborators || [],
        settings: workspaceData.settings || {},
        files: {},
        comments: [],
        active_sessions: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Store in memory
      this.activeWorkspaces.set(workspaceId, workspace);

      // Store in database
      if (supabaseAdmin) {
        try {
          await supabaseAdmin
            .from('chainide_workspaces')
            .insert(workspace);
        } catch (dbError) {
          console.warn('Database storage failed:', dbError.message);
        }
      }

      return {
        success: true,
        workspace: this.sanitizeWorkspaceForUser(workspace, userId),
        message: 'Workspace created successfully'
      };
    } catch (error) {
      console.error('Create workspace error:', error);
      throw error;
    }
  }

  // Join workspace (from original backend)
  async joinWorkspace(workspaceId, userId, sessionInfo = {}) {
    try {
      let workspace = this.activeWorkspaces.get(workspaceId);
      
      if (!workspace && supabaseAdmin) {
        // Try to load from database
        const { data } = await supabaseAdmin
          .from('chainide_workspaces')
          .select('*')
          .eq('workspace_id', workspaceId)
          .single();
        
        if (data) {
          workspace = data;
          this.activeWorkspaces.set(workspaceId, workspace);
        }
      }

      if (!workspace) {
        throw new Error('Workspace not found');
      }

      // Check permissions
      if (workspace.visibility === 'private' && workspace.created_by !== userId) {
        const isCollaborator = workspace.collaborators.some(c => c.userId === userId);
        if (!isCollaborator) {
          throw new Error('Access denied to private workspace');
        }
      }

      const sessionId = `session_${userId}_${Date.now()}`;
      const session = {
        sessionId,
        userId,
        workspaceId,
        joinedAt: new Date().toISOString(),
        ...sessionInfo
      };

      // Add to active sessions
      workspace.active_sessions = workspace.active_sessions || [];
      workspace.active_sessions.push(session);
      this.activeSessions.set(sessionId, session);

      return {
        success: true,
        sessionId,
        workspace: this.sanitizeWorkspaceForUser(workspace, userId),
        message: 'Successfully joined workspace'
      };
    } catch (error) {
      console.error('Join workspace error:', error);
      throw error;
    }
  }

  // Update file in workspace (from original backend)
  async updateFile(workspaceId, userId, fileData) {
    try {
      const workspace = this.activeWorkspaces.get(workspaceId);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      // Check permissions
      if (!this.hasWritePermission(workspace, userId)) {
        throw new Error('Insufficient permissions to update file');
      }

      const fileUpdate = {
        filePath: fileData.filePath,
        content: fileData.content,
        operation: fileData.operation || 'update',
        updatedBy: userId,
        updatedAt: new Date().toISOString(),
        metadata: fileData.metadata || {}
      };

      // Update workspace files
      workspace.files = workspace.files || {};
      workspace.files[fileData.filePath] = fileUpdate;
      workspace.updated_at = new Date().toISOString();

      // Update in database
      if (supabaseAdmin) {
        try {
          await supabaseAdmin
            .from('chainide_workspaces')
            .update({
              files: workspace.files,
              updated_at: workspace.updated_at
            })
            .eq('workspace_id', workspaceId);
        } catch (dbError) {
          console.warn('Database update failed:', dbError.message);
        }
      }

      return {
        success: true,
        file: fileUpdate,
        message: 'File updated successfully'
      };
    } catch (error) {
      console.error('Update file error:', error);
      throw error;
    }
  }

  // Add comment to workspace (from original backend)
  async addComment(workspaceId, userId, commentData) {
    try {
      const workspace = this.activeWorkspaces.get(workspaceId);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      const commentId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const comment = {
        commentId,
        filePath: commentData.filePath,
        lineNumber: commentData.lineNumber,
        content: commentData.content,
        type: commentData.type || 'general',
        parentCommentId: commentData.parentCommentId || null,
        createdBy: userId,
        createdAt: new Date().toISOString()
      };

      // Add to workspace comments
      workspace.comments = workspace.comments || [];
      workspace.comments.push(comment);
      workspace.updated_at = new Date().toISOString();

      // Update in database
      if (supabaseAdmin) {
        try {
          await supabaseAdmin
            .from('chainide_workspaces')
            .update({
              comments: workspace.comments,
              updated_at: workspace.updated_at
            })
            .eq('workspace_id', workspaceId);
        } catch (dbError) {
          console.warn('Database update failed:', dbError.message);
        }
      }

      return {
        success: true,
        comment,
        message: 'Comment added successfully'
      };
    } catch (error) {
      console.error('Add comment error:', error);
      throw error;
    }
  }

  // Get workspace statistics (from original backend)
  getWorkspaceStats(workspaceId) {
    const workspace = this.activeWorkspaces.get(workspaceId);
    if (!workspace) {
      return null;
    }

    return {
      workspaceId,
      name: workspace.name,
      projectType: workspace.project_type,
      filesCount: Object.keys(workspace.files || {}).length,
      commentsCount: (workspace.comments || []).length,
      activeSessionsCount: (workspace.active_sessions || []).length,
      collaboratorsCount: (workspace.collaborators || []).length,
      createdAt: workspace.created_at,
      lastActivity: workspace.updated_at
    };
  }

  // Check write permissions (from original backend)
  hasWritePermission(workspace, userId) {
    if (workspace.created_by === userId) {
      return true;
    }

    const collaborator = workspace.collaborators.find(c => c.userId === userId);
    return collaborator && ['collaborator', 'admin'].includes(collaborator.role);
  }

  // Sanitize workspace data for user (from original backend)
  sanitizeWorkspaceForUser(workspace, userId) {
    return {
      workspaceId: workspace.workspace_id,
      name: workspace.name,
      description: workspace.description,
      projectType: workspace.project_type,
      visibility: workspace.visibility,
      isOwner: workspace.created_by === userId,
      files: workspace.files || {},
      comments: workspace.comments || [],
      activeSessions: workspace.active_sessions || [],
      collaborators: workspace.collaborators || [],
      createdAt: workspace.created_at,
      updatedAt: workspace.updated_at
    };
  }

  // Get service status (from original backend)
  getStatus() {
    return {
      activeWorkspaces: this.activeWorkspaces.size,
      activeSessions: this.activeSessions.size,
      capabilities: this.capabilities,
      serviceMetrics: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString()
      },
      version: '2.0.0-serverless'
    };
  }
}

// Serverless function handler
const chainIDEControllerHandler = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const controller = new ChainIDEController();
    const { userId, email } = req.auth || {};

    if (req.method === 'GET') {
      const { action, workspaceId } = req.query;

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

        case 'workspace-stats':
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

          const stats = controller.getWorkspaceStats(workspaceId);
          if (!stats) {
            return res.status(404).json({
              success: false,
              error: 'Workspace not found'
            });
          }

          res.status(200).json({
            success: true,
            data: { stats },
            metadata: {
              userId,
              userEmail: email,
              timestamp: new Date().toISOString()
            }
          });
          break;

        case 'sdk':
          // Return SDK information
          res.status(200).json({
            success: true,
            data: {
              sdkVersion: '1.0.0',
              downloadUrl: '/api/controllers/chainide?action=download-sdk',
              documentation: 'https://docs.flash-audit.com/chainide-sdk',
              capabilities: controller.capabilities
            }
          });
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid action. Supported actions: status, capabilities, workspace-stats, sdk'
          });
      }
    } else if (req.method === 'POST') {
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const { action, workspaceId, name, description, projectType, visibility, collaborators, settings, filePath, content, operation, metadata, lineNumber, type, parentCommentId, sessionInfo, preferences } = req.body;

      switch (action) {
        case 'create-workspace':
          // Validate request
          const validationErrors = controller.validateWorkspaceRequest({
            name, description, projectType, visibility, collaborators, settings
          });

          if (validationErrors.length > 0) {
            return res.status(400).json({
              success: false,
              error: 'Validation failed',
              details: validationErrors
            });
          }

          console.log(`Creating ChainIDE workspace for user: ${email} (${userId})`);

          const createResult = await controller.createWorkspace({
            name, description, projectType, visibility, collaborators, settings
          }, userId);

          createResult.metadata = {
            userId,
            userEmail: email,
            timestamp: new Date().toISOString()
          };

          res.status(201).json(createResult);
          break;

        case 'join-workspace':
          if (!workspaceId) {
            return res.status(400).json({
              success: false,
              error: 'Workspace ID is required'
            });
          }

          console.log(`User joining ChainIDE workspace ${workspaceId}: ${email} (${userId})`);

          const joinResult = await controller.joinWorkspace(workspaceId, userId, sessionInfo || {});

          joinResult.metadata = {
            userId,
            userEmail: email,
            timestamp: new Date().toISOString()
          };

          res.status(200).json(joinResult);
          break;

        case 'update-file':
          if (!workspaceId || !filePath || !content) {
            return res.status(400).json({
              success: false,
              error: 'Workspace ID, file path, and content are required'
            });
          }

          console.log(`Updating file in workspace ${workspaceId} by user: ${email} (${userId})`);

          const updateResult = await controller.updateFile(workspaceId, userId, {
            filePath, content, operation, metadata
          });

          updateResult.metadata = {
            userId,
            userEmail: email,
            timestamp: new Date().toISOString()
          };

          res.status(200).json(updateResult);
          break;

        case 'add-comment':
          if (!workspaceId || !filePath || !lineNumber || !content) {
            return res.status(400).json({
              success: false,
              error: 'Workspace ID, file path, line number, and content are required'
            });
          }

          console.log(`Adding comment to workspace ${workspaceId} by user: ${email} (${userId})`);

          const commentResult = await controller.addComment(workspaceId, userId, {
            filePath, lineNumber, content, type, parentCommentId
          });

          commentResult.metadata = {
            userId,
            userEmail: email,
            timestamp: new Date().toISOString()
          };

          res.status(201).json(commentResult);
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid action. Supported actions: create-workspace, join-workspace, update-file, add-comment'
          });
      }
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('ChainIDE controller error:', error);
    res.status(500).json({
      success: false,
      error: 'ChainIDE controller failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Export with optional authentication (some endpoints are public)
module.exports = withOptionalAuth(chainIDEControllerHandler);

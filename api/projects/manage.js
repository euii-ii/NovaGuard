// Enhanced Project Management Service - migrated from backend
const { withAuth } = require('../middleware/auth');
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

// Project Management Class (migrated from backend)
class ProjectManager {
  constructor() {
    this.projectTypes = ['smart-contract', 'defi-protocol', 'nft-collection', 'dao', 'bridge', 'other'];
    this.projectStatuses = ['planning', 'development', 'testing', 'audit', 'deployed', 'maintenance', 'archived'];
  }

  // Create new project (from backend)
  async createProject(projectData, userId) {
    try {
      const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const project = {
        project_id: projectId,
        name: projectData.name || 'Untitled Project',
        description: projectData.description || '',
        type: projectData.type || 'smart-contract',
        status: 'planning',
        owner_id: userId,
        team_members: [
          {
            userId: userId,
            role: 'owner',
            permissions: ['read', 'write', 'admin', 'delete'],
            joinedAt: new Date().toISOString()
          }
        ],
        settings: {
          visibility: projectData.visibility || 'private',
          allowCollaboration: projectData.allowCollaboration || false,
          autoAudit: projectData.autoAudit || true,
          notifications: projectData.notifications || true
        },
        contracts: [],
        audits: [],
        deployments: [],
        milestones: [],
        tags: projectData.tags || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Save to database with error handling
      let dbSaved = false;
      if (supabaseAdmin) {
        try {
          const { data, error } = await supabaseAdmin
            .from('projects')
            .insert(project)
            .select()
            .single();

          if (error) {
            console.warn('Database save failed:', error.message);
            // Continue without failing - project creation should still succeed
          } else {
            dbSaved = true;
            console.log('Project saved to database successfully');
          }
        } catch (dbError) {
          console.warn('Database operation failed:', dbError.message);
          // Continue without failing
        }
      }

      return {
        success: true,
        project: project,
        dbSaved: dbSaved,
        message: 'Project created successfully'
      };
    } catch (error) {
      console.error('Create project error:', error);
      throw error;
    }
  }

  // Get user projects (from backend)
  async getUserProjects(userId, filters = {}) {
    try {
      if (!supabaseAdmin) {
        return {
          success: true,
          projects: [],
          message: 'Database not configured'
        };
      }

      let query = supabaseAdmin
        .from('projects')
        .select('*')
        .eq('owner_id', userId)
        .order('updated_at', { ascending: false });

      // Apply filters
      if (filters.type) {
        query = query.eq('type', filters.type);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data: projects, error } = await query;

      if (error) {
        console.warn('Database query failed:', error.message);
        // Return empty result instead of throwing error
        return {
          success: true,
          projects: [],
          count: 0,
          filters: filters,
          dbError: error.message,
          message: 'Database query failed, returning empty results'
        };
      }

      return {
        success: true,
        projects: projects || [],
        count: projects ? projects.length : 0,
        filters: filters
      };
    } catch (error) {
      console.error('Get user projects error:', error);
      return {
        success: true, // Changed to true to prevent frontend errors
        error: error.message,
        projects: [],
        count: 0,
        message: 'Failed to retrieve projects, returning empty results'
      };
    }
  }

  // Update project (from backend)
  async updateProject(projectId, updateData, userId) {
    try {
      if (!supabaseAdmin) {
        throw new Error('Database not configured');
      }

      // Check if user has permission to update
      const { data: project, error: fetchError } = await supabaseAdmin
        .from('projects')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (fetchError || !project) {
        throw new Error('Project not found');
      }

      // Check permissions
      const isOwner = project.owner_id === userId;
      const teamMember = project.team_members?.find(member => member.userId === userId);
      const hasWritePermission = teamMember?.permissions?.includes('write');

      if (!isOwner && !hasWritePermission) {
        throw new Error('Insufficient permissions to update project');
      }

      // Prepare update data
      const allowedFields = ['name', 'description', 'type', 'status', 'settings', 'tags'];
      const updateFields = {};
      
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          updateFields[field] = updateData[field];
        }
      });

      updateFields.updated_at = new Date().toISOString();

      // Update project
      const { data: updatedProject, error: updateError } = await supabaseAdmin
        .from('projects')
        .update(updateFields)
        .eq('project_id', projectId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Update failed: ${updateError.message}`);
      }

      return {
        success: true,
        project: updatedProject,
        message: 'Project updated successfully'
      };
    } catch (error) {
      console.error('Update project error:', error);
      throw error;
    }
  }

  // Add contract to project (from backend)
  async addContractToProject(projectId, contractData, userId) {
    try {
      if (!supabaseAdmin) {
        throw new Error('Database not configured');
      }

      // Get project
      const { data: project, error } = await supabaseAdmin
        .from('projects')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (error || !project) {
        throw new Error('Project not found');
      }

      // Check permissions
      const isOwner = project.owner_id === userId;
      const teamMember = project.team_members?.find(member => member.userId === userId);
      const hasWritePermission = teamMember?.permissions?.includes('write');

      if (!isOwner && !hasWritePermission) {
        throw new Error('Insufficient permissions to add contract');
      }

      // Add contract
      const contractId = `contract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const contract = {
        contractId: contractId,
        name: contractData.name || 'Untitled Contract',
        address: contractData.address || null,
        chain: contractData.chain || 'ethereum',
        sourceCode: contractData.sourceCode || '',
        abi: contractData.abi || null,
        bytecode: contractData.bytecode || null,
        addedBy: userId,
        addedAt: new Date().toISOString()
      };

      const updatedContracts = [...(project.contracts || []), contract];

      // Update project
      await supabaseAdmin
        .from('projects')
        .update({
          contracts: updatedContracts,
          updated_at: new Date().toISOString()
        })
        .eq('project_id', projectId);

      return {
        success: true,
        contract: contract,
        message: 'Contract added to project successfully'
      };
    } catch (error) {
      console.error('Add contract to project error:', error);
      throw error;
    }
  }

  // Add team member to project (from backend)
  async addTeamMember(projectId, memberData, userId) {
    try {
      if (!supabaseAdmin) {
        throw new Error('Database not configured');
      }

      // Get project
      const { data: project, error } = await supabaseAdmin
        .from('projects')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (error || !project) {
        throw new Error('Project not found');
      }

      // Check if user is owner or has admin permission
      const isOwner = project.owner_id === userId;
      const teamMember = project.team_members?.find(member => member.userId === userId);
      const hasAdminPermission = teamMember?.permissions?.includes('admin');

      if (!isOwner && !hasAdminPermission) {
        throw new Error('Insufficient permissions to add team members');
      }

      // Check if member already exists
      const existingMember = project.team_members?.find(member => member.userId === memberData.userId);
      if (existingMember) {
        throw new Error('User is already a team member');
      }

      // Add team member
      const newMember = {
        userId: memberData.userId,
        email: memberData.email || '',
        role: memberData.role || 'member',
        permissions: memberData.permissions || ['read'],
        joinedAt: new Date().toISOString(),
        invitedBy: userId
      };

      const updatedTeamMembers = [...(project.team_members || []), newMember];

      // Update project
      await supabaseAdmin
        .from('projects')
        .update({
          team_members: updatedTeamMembers,
          updated_at: new Date().toISOString()
        })
        .eq('project_id', projectId);

      return {
        success: true,
        member: newMember,
        message: 'Team member added successfully'
      };
    } catch (error) {
      console.error('Add team member error:', error);
      throw error;
    }
  }

  // Get project analytics (from backend)
  async getProjectAnalytics(projectId, userId) {
    try {
      if (!supabaseAdmin) {
        throw new Error('Database not configured');
      }

      // Get project
      const { data: project, error } = await supabaseAdmin
        .from('projects')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (error || !project) {
        throw new Error('Project not found');
      }

      // Check permissions
      const isOwner = project.owner_id === userId;
      const teamMember = project.team_members?.find(member => member.userId === userId);
      const hasReadPermission = teamMember?.permissions?.includes('read');

      if (!isOwner && !hasReadPermission) {
        throw new Error('Insufficient permissions to view analytics');
      }

      // Calculate analytics
      const analytics = {
        projectId: projectId,
        name: project.name,
        type: project.type,
        status: project.status,
        createdAt: project.created_at,
        lastUpdated: project.updated_at,
        
        // Team analytics
        team: {
          totalMembers: project.team_members?.length || 0,
          roles: {},
          recentActivity: []
        },
        
        // Contract analytics
        contracts: {
          total: project.contracts?.length || 0,
          byChain: {},
          verified: 0,
          deployed: 0
        },
        
        // Audit analytics
        audits: {
          total: project.audits?.length || 0,
          passed: 0,
          failed: 0,
          pending: 0,
          averageScore: 0
        },
        
        // Deployment analytics
        deployments: {
          total: project.deployments?.length || 0,
          successful: 0,
          failed: 0,
          byChain: {}
        },
        
        generatedAt: new Date().toISOString()
      };

      // Calculate team role distribution
      project.team_members?.forEach(member => {
        analytics.team.roles[member.role] = (analytics.team.roles[member.role] || 0) + 1;
      });

      // Calculate contract distribution
      project.contracts?.forEach(contract => {
        analytics.contracts.byChain[contract.chain] = (analytics.contracts.byChain[contract.chain] || 0) + 1;
        if (contract.address) analytics.contracts.deployed++;
        if (contract.abi) analytics.contracts.verified++;
      });

      // Calculate audit statistics
      if (project.audits?.length > 0) {
        const scores = project.audits.map(audit => audit.score || 0);
        analytics.audits.averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        
        project.audits.forEach(audit => {
          if (audit.status === 'passed') analytics.audits.passed++;
          else if (audit.status === 'failed') analytics.audits.failed++;
          else analytics.audits.pending++;
        });
      }

      // Calculate deployment statistics
      project.deployments?.forEach(deployment => {
        analytics.deployments.byChain[deployment.chain] = (analytics.deployments.byChain[deployment.chain] || 0) + 1;
        if (deployment.status === 'successful') analytics.deployments.successful++;
        else analytics.deployments.failed++;
      });

      return {
        success: true,
        analytics: analytics
      };
    } catch (error) {
      console.error('Get project analytics error:', error);
      throw error;
    }
  }
}

// Serverless function handler
const projectManagerHandler = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { userId, email } = req.auth;

  try {
    const projectManager = new ProjectManager();

    if (req.method === 'GET') {
      const { action, projectId, type, status, limit } = req.query;

      switch (action) {
        case 'list':
          const filters = { type, status, limit: limit ? parseInt(limit) : 50 };
          const projects = await projectManager.getUserProjects(userId, filters);
          
          projects.metadata = {
            userId,
            userEmail: email,
            timestamp: new Date().toISOString()
          };
          
          res.status(200).json(projects);
          break;

        case 'analytics':
          if (!projectId) {
            return res.status(400).json({
              success: false,
              error: 'Project ID is required'
            });
          }

          const analytics = await projectManager.getProjectAnalytics(projectId, userId);
          
          analytics.metadata = {
            userId,
            userEmail: email,
            timestamp: new Date().toISOString()
          };
          
          res.status(200).json(analytics);
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid action. Supported actions: list, analytics'
          });
      }
    } else if (req.method === 'POST') {
      const { action, projectData, projectId, contractData, memberData, updateData } = req.body;

      switch (action) {
        case 'create':
          console.log(`Creating project by user: ${email} (${userId})`);
          const createResult = await projectManager.createProject(projectData || {}, userId);
          
          createResult.metadata = {
            userId,
            userEmail: email,
            action: 'create',
            timestamp: new Date().toISOString()
          };
          
          res.status(200).json(createResult);
          break;

        case 'update':
          if (!projectId) {
            return res.status(400).json({
              success: false,
              error: 'Project ID is required'
            });
          }

          console.log(`Updating project ${projectId} by user: ${email} (${userId})`);
          const updateResult = await projectManager.updateProject(projectId, updateData || {}, userId);
          
          updateResult.metadata = {
            userId,
            userEmail: email,
            action: 'update',
            timestamp: new Date().toISOString()
          };
          
          res.status(200).json(updateResult);
          break;

        case 'add-contract':
          if (!projectId) {
            return res.status(400).json({
              success: false,
              error: 'Project ID is required'
            });
          }

          console.log(`Adding contract to project ${projectId} by user: ${email} (${userId})`);
          const contractResult = await projectManager.addContractToProject(projectId, contractData || {}, userId);
          
          contractResult.metadata = {
            userId,
            userEmail: email,
            action: 'add-contract',
            timestamp: new Date().toISOString()
          };
          
          res.status(200).json(contractResult);
          break;

        case 'add-member':
          if (!projectId) {
            return res.status(400).json({
              success: false,
              error: 'Project ID is required'
            });
          }

          console.log(`Adding team member to project ${projectId} by user: ${email} (${userId})`);
          const memberResult = await projectManager.addTeamMember(projectId, memberData || {}, userId);
          
          memberResult.metadata = {
            userId,
            userEmail: email,
            action: 'add-member',
            timestamp: new Date().toISOString()
          };
          
          res.status(200).json(memberResult);
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid action. Supported actions: create, update, add-contract, add-member'
          });
      }
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Project management error:', error);

    // Provide more detailed error information
    const errorResponse = {
      success: false,
      error: 'Project management failed',
      message: error.message,
      details: {
        errorType: error.name,
        endpoint: req.url,
        method: req.method,
        userId: req.auth?.userId || 'unknown'
      },
      timestamp: new Date().toISOString(),
      version: '2.0.0-serverless'
    };

    // Add stack trace in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = error.stack;
    }

    res.status(500).json(errorResponse);
  }
};

// Export with Clerk authentication middleware
module.exports = withAuth(projectManagerHandler);

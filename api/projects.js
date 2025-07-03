// Direct Projects API Endpoint - handles /api/projects calls
const { withAuth, withOptionalAuth } = require('./middleware/auth');
const { createClient } = require('@supabase/supabase-js');

// File-based storage for development
const fs = require('fs');
const path = require('path');

const STORAGE_FILE = path.join(__dirname, 'projects-storage.json');
let projectIdCounter = 1;

// Helper functions for file-based storage
const loadProjectsFromFile = () => {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = fs.readFileSync(STORAGE_FILE, 'utf8');
      const projects = JSON.parse(data);
      console.log(`📂 Loaded ${projects.length} projects from file storage`);
      return projects;
    }
  } catch (error) {
    console.error('Error loading projects from file:', error);
  }
  return [];
};

const saveProjectsToFile = (projects) => {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(projects, null, 2));
    console.log(`💾 Saved ${projects.length} projects to file storage`);
  } catch (error) {
    console.error('Error saving projects to file:', error);
  }
};

const saveProjectToStorage = (project) => {
  const projects = loadProjectsFromFile();
  // Remove existing project with same ID
  const filteredProjects = projects.filter(p => p.project_id !== project.project_id);
  // Add new project
  filteredProjects.push(project);
  saveProjectsToFile(filteredProjects);
  console.log(`💾 Project saved to storage: ${project.name} (${project.project_id})`);
  console.log(`📊 Total projects in storage: ${filteredProjects.length}`);
  return project;
};

const getProjectsFromStorage = (userId) => {
  const allProjects = loadProjectsFromFile();
  const userProjects = allProjects.filter(p => p.owner_id === userId);
  console.log(`📋 Retrieved ${userProjects.length} projects for user: ${userId}`);
  return userProjects;
};

const getProjectFromStorage = (projectId, userId) => {
  const allProjects = loadProjectsFromFile();
  const project = allProjects.find(p => p.project_id === projectId && p.owner_id === userId);
  console.log(`🔍 Retrieved project: ${project ? project.name : 'Not found'} (${projectId})`);
  return project;
};

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

// Direct projects handler
const directProjectsHandler = async (req, res) => {
  setCorsHeaders(res);

  console.log(`📝 Projects API: ${req.method} ${req.url}`);
  console.log('📦 Request body:', req.body);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Handle optional authentication for development
    const userId = req.auth?.userId || 'dev_user_' + Math.random().toString(36).substring(2, 15);
    const email = req.auth?.email || 'dev@example.com';

    console.log(`👤 User: ${email} (${userId})`);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      });
    }

    if (req.method === 'POST') {
      // Handle project creation
      const { name, description, type, visibility, settings, template, network, contract_code, project_data } = req.body;

      // Comprehensive validation
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Project name is required',
          timestamp: new Date().toISOString()
        });
      }

      if (name.length > 100) {
        return res.status(400).json({
          success: false,
          error: 'Project name must be less than 100 characters',
          timestamp: new Date().toISOString()
        });
      }

      const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create comprehensive project object
      const project = {
        project_id: projectId,
        name: name.trim(),
        description: description?.trim() || '',
        type: type || 'smart-contract',
        status: 'planning',
        visibility: visibility || 'private',
        owner_id: userId,
        template: template || null,
        network: network || 'ethereum',
        contract_code: contract_code || null,
        team_members: [
          {
            userId: userId,
            email: email,
            role: 'owner',
            permissions: ['read', 'write', 'admin', 'delete', 'invite', 'deploy', 'audit'],
            joinedAt: new Date().toISOString(),
            status: 'active'
          }
        ],
        settings: {
          allowCollaboration: settings?.allowCollaboration !== false,
          autoAudit: settings?.autoAudit !== false,
          notifications: settings?.notifications !== false,
          realTimeSync: settings?.realTimeSync !== false,
          codeReview: settings?.codeReview !== false,
          securityScanning: settings?.securityScanning !== false,
          gasOptimization: settings?.gasOptimization !== false,
          deploymentPipeline: settings?.deploymentPipeline || false
        },
        contracts: [],
        audits: [],
        deployments: [],
        milestones: [],
        tags: [],
        integrations: {
          github: null,
          chainide: null,
          hardhat: null,
          foundry: null
        },
        analytics: {
          totalCommits: 0,
          totalAudits: 0,
          totalDeployments: 0,
          securityScore: 0,
          qualityScore: 0,
          lastActivity: new Date().toISOString(),
          memberActivity: {},
          collaborationScore: 0
        },
        collaboration: {
          activeReviews: [],
          sharedWorkspaces: [],
          teamAnalytics: {
            memberActivity: {},
            collaborationScore: 0
          }
        },
        project_data: project_data || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log(`Creating project "${name}" for user: ${email} (${userId})`);

      // Enhanced database save with comprehensive error handling
      let dbSaved = false;
      let dbError = null;
      
      if (supabaseAdmin) {
        try {
          const { data, error } = await supabaseAdmin
            .from('projects')
            .insert(project)
            .select()
            .single();

          if (error) {
            console.warn('Database save failed:', error.message);
            dbError = error.message;
            // Continue without failing - project creation should still succeed
          } else {
            dbSaved = true;
            console.log(`Project ${projectId} saved to database successfully`);
          }
        } catch (dbException) {
          console.warn('Database operation exception:', dbException.message);
          dbError = dbException.message;
          // Continue without failing
        }
      } else {
        console.warn('Database not configured, project created in memory only');
      }

      // Always save to file storage as backup/fallback
      saveProjectToStorage(project);

      // Return comprehensive success response
      const response = {
        success: true,
        data: {
          id: projectId,
          name: project.name,
          description: project.description,
          type: project.type,
          status: project.status,
          visibility: project.visibility,
          template: project.template,
          network: project.network,
          contract_code: project.contract_code,
          project_data: project.project_data,
          settings: project.settings,
          memberCount: project.team_members.length,
          contractCount: project.contracts.length,
          auditCount: project.audits.length,
          deploymentCount: project.deployments.length,
          tags: project.tags,
          analytics: project.analytics,
          createdAt: project.created_at,
          updatedAt: project.updated_at,
          isOwner: true,
          permissions: ['read', 'write', 'admin', 'delete', 'invite', 'deploy', 'audit']
        },
        metadata: {
          dbSaved,
          dbError,
          projectId,
          userId,
          userEmail: email,
          endpoint: '/api/projects',
          method: 'POST',
          timestamp: new Date().toISOString(),
          version: '2.0.0-enhanced'
        },
        message: 'Project created successfully with comprehensive feature set'
      };

      res.status(201).json(response);

    } else if (req.method === 'GET') {
      // Handle project listing
      const { type, status, visibility, search, limit, offset } = req.query;

      console.log(`Listing projects for user: ${email} (${userId})`);

      let projects = [];
      let total = 0;
      let dbError = null;

      if (supabaseAdmin) {
        try {
          let query = supabaseAdmin
            .from('projects')
            .select('*', { count: 'exact' })
            .eq('owner_id', userId)
            .order('updated_at', { ascending: false });

          // Apply filters
          if (type) query = query.eq('type', type);
          if (status) query = query.eq('status', status);
          if (visibility) query = query.eq('visibility', visibility);
          if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
          if (limit) query = query.limit(parseInt(limit));
          if (offset) query = query.range(parseInt(offset) || 0, (parseInt(offset) || 0) + (parseInt(limit) || 20) - 1);

          const { data, error, count } = await query;

          if (error) {
            console.warn('Database query failed:', error.message);
            dbError = error.message;
          } else {
            projects = (data || []).map(project => ({
              id: project.project_id,
              name: project.name,
              description: project.description,
              type: project.type,
              status: project.status,
              visibility: project.visibility,
              template: project.template,
              network: project.network,
              contract_code: project.contract_code,
              project_data: project.project_data,
              memberCount: project.team_members?.length || 1,
              contractCount: project.contracts?.length || 0,
              auditCount: project.audits?.length || 0,
              deploymentCount: project.deployments?.length || 0,
              tags: project.tags || [],
              settings: project.settings || {},
              analytics: project.analytics || {},
              createdAt: project.created_at,
              updatedAt: project.updated_at,
              isOwner: project.owner_id === userId,
              lastActivity: project.analytics?.lastActivity || project.updated_at
            }));
            total = count || 0;
          }
        } catch (dbException) {
          console.warn('Database operation exception:', dbException.message);
          dbError = dbException.message;
        }
      }

      // If database failed or no projects found, try file storage
      if (projects.length === 0 || dbError) {
        console.log('🔄 Falling back to file storage for project listing');
        const storageProjects = getProjectsFromStorage(userId);

        if (storageProjects.length > 0) {
          projects = storageProjects.map(project => ({
            id: project.project_id,
            name: project.name,
            description: project.description,
            type: project.type,
            status: project.status,
            visibility: project.visibility,
            template: project.template,
            network: project.network,
            contract_code: project.contract_code,
            project_data: project.project_data,
            memberCount: project.team_members?.length || 1,
            contractCount: project.contracts?.length || 0,
            auditCount: project.audits?.length || 0,
            deploymentCount: project.deployments?.length || 0,
            tags: project.tags || [],
            settings: project.settings || {},
            analytics: project.analytics || {},
            createdAt: project.created_at,
            updatedAt: project.updated_at,
            isOwner: project.owner_id === userId,
            lastActivity: project.analytics?.lastActivity || project.updated_at,
            user_id: project.owner_id,
            created_at: project.created_at,
            updated_at: project.updated_at
          }));
          total = storageProjects.length;
          console.log(`📋 Retrieved ${projects.length} projects from file storage`);
        }
      }

      const response = {
        success: true,
        projects,
        total,
        filters: { type, status, visibility, search },
        pagination: {
          limit: parseInt(limit) || 20,
          offset: parseInt(offset) || 0,
          hasMore: projects.length === (parseInt(limit) || 20)
        },
        metadata: {
          userId,
          userEmail: email,
          dbError,
          endpoint: '/api/projects',
          method: 'GET',
          timestamp: new Date().toISOString(),
          version: '2.0.0-enhanced'
        },
        message: dbError ? 'Projects retrieved with database warnings' : 'Projects retrieved successfully'
      };

      res.status(200).json(response);

    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
        allowedMethods: ['GET', 'POST', 'OPTIONS'],
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Direct projects API error:', error);
    
    const errorResponse = {
      success: false,
      error: 'Projects API failed',
      message: error.message,
      details: {
        errorType: error.name,
        endpoint: '/api/projects',
        method: req.method,
        userId: req.auth?.userId || 'unknown',
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      },
      version: '2.0.0-enhanced'
    };

    // Add stack trace in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = error.stack;
    }

    res.status(500).json(errorResponse);
  }
};

// Export with optional authentication for development
module.exports = withOptionalAuth(directProjectsHandler);

// Enhanced Vercel serverless function for collaborative workspace management
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

// Create collaborative workspace (from backend controller)
const createWorkspace = async (workspaceData, userId) => {
  const workspaceId = `workspace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const workspace = {
      workspace_id: workspaceId,
      name: workspaceData.name || 'Untitled Workspace',
      description: workspaceData.description || '',
      owner_id: userId,
      settings: {
        visibility: workspaceData.visibility || 'private',
        allowGuestAccess: workspaceData.allowGuestAccess || false,
        maxMembers: workspaceData.maxMembers || 10,
        features: {
          realTimeEditing: true,
          codeReview: true,
          auditSharing: true,
          commentSystem: true,
          versionControl: true
        }
      },
      members: [
        {
          userId: userId,
          role: 'owner',
          permissions: ['read', 'write', 'admin', 'invite', 'delete'],
          joinedAt: new Date().toISOString()
        }
      ],
      projects: [],
      activity: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Save to database
    if (supabaseAdmin) {
      await supabaseAdmin
        .from('collaborative_workspaces')
        .insert(workspace);
    }

    return {
      success: true,
      workspace: workspace,
      message: 'Workspace created successfully'
    };
  } catch (error) {
    console.error('Create workspace error:', error);
    throw error;
  }
};

// Join workspace
const joinWorkspace = async (workspaceId, inviteCode, userId, userEmail) => {
  try {
    if (!supabaseAdmin) {
      throw new Error('Database not configured');
    }

    // Get workspace
    const { data: workspace, error } = await supabaseAdmin
      .from('collaborative_workspaces')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !workspace) {
      throw new Error('Workspace not found');
    }

    // Check if user is already a member
    const existingMember = workspace.members.find(member => member.userId === userId);
    if (existingMember) {
      return {
        success: true,
        workspace: workspace,
        message: 'Already a member of this workspace'
      };
    }

    // Validate invite code (simplified)
    const expectedInviteCode = `invite_${workspaceId.slice(-8)}`;
    if (inviteCode && inviteCode !== expectedInviteCode) {
      throw new Error('Invalid invite code');
    }

    // Add user to workspace
    const newMember = {
      userId: userId,
      email: userEmail,
      role: 'member',
      permissions: ['read', 'write'],
      joinedAt: new Date().toISOString()
    };

    workspace.members.push(newMember);
    workspace.updated_at = new Date().toISOString();

    // Update workspace
    await supabaseAdmin
      .from('collaborative_workspaces')
      .update({
        members: workspace.members,
        updated_at: workspace.updated_at
      })
      .eq('workspace_id', workspaceId);

    return {
      success: true,
      workspace: workspace,
      member: newMember,
      message: 'Successfully joined workspace'
    };
  } catch (error) {
    console.error('Join workspace error:', error);
    throw error;
  }
};

// Get user workspaces
const getUserWorkspaces = async (userId) => {
  try {
    if (!supabaseAdmin) {
      return {
        success: true,
        workspaces: [],
        message: 'Database not configured'
      };
    }

    const { data: workspaces, error } = await supabaseAdmin
      .from('collaborative_workspaces')
      .select('*')
      .contains('members', [{ userId: userId }]);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return {
      success: true,
      workspaces: workspaces || [],
      count: workspaces ? workspaces.length : 0
    };
  } catch (error) {
    console.error('Get user workspaces error:', error);
    return {
      success: false,
      error: error.message,
      workspaces: []
    };
  }
};

// Share audit results in workspace
const shareAuditResults = async (workspaceId, auditId, shareData, userId) => {
  try {
    const shareId = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const sharedAudit = {
      share_id: shareId,
      workspace_id: workspaceId,
      audit_id: auditId,
      shared_by: userId,
      title: shareData.title || 'Shared Audit Results',
      description: shareData.description || '',
      permissions: shareData.permissions || ['view'],
      tags: shareData.tags || [],
      shared_at: new Date().toISOString()
    };

    // Save shared audit
    if (supabaseAdmin) {
      await supabaseAdmin
        .from('shared_audits')
        .insert(sharedAudit);
    }

    return {
      success: true,
      sharedAudit: sharedAudit,
      message: 'Audit results shared successfully'
    };
  } catch (error) {
    console.error('Share audit error:', error);
    throw error;
  }
};

const collaborationHandler = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { userId, email } = req.auth;

  try {
    if (req.method === 'POST') {
      const { action, workspaceData, workspaceId, inviteCode, auditId, shareData } = req.body;

      switch (action) {
        case 'create':
          console.log(`Creating workspace by user: ${email} (${userId})`);
          const createResult = await createWorkspace(workspaceData || {}, userId);
          
          createResult.metadata = {
            userId,
            userEmail: email,
            action: 'create',
            timestamp: new Date().toISOString()
          };
          
          res.status(200).json(createResult);
          break;

        case 'join':
          if (!workspaceId) {
            return res.status(400).json({
              success: false,
              error: 'Workspace ID is required'
            });
          }
          
          console.log(`Joining workspace ${workspaceId} by user: ${email} (${userId})`);
          const joinResult = await joinWorkspace(workspaceId, inviteCode, userId, email);
          
          joinResult.metadata = {
            userId,
            userEmail: email,
            action: 'join',
            timestamp: new Date().toISOString()
          };
          
          res.status(200).json(joinResult);
          break;

        case 'share-audit':
          if (!workspaceId || !auditId) {
            return res.status(400).json({
              success: false,
              error: 'Workspace ID and Audit ID are required'
            });
          }
          
          console.log(`Sharing audit ${auditId} in workspace ${workspaceId} by user: ${email} (${userId})`);
          const shareResult = await shareAuditResults(workspaceId, auditId, shareData || {}, userId);
          
          shareResult.metadata = {
            userId,
            userEmail: email,
            action: 'share-audit',
            timestamp: new Date().toISOString()
          };
          
          res.status(200).json(shareResult);
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid action. Supported actions: create, join, share-audit'
          });
      }
    } else if (req.method === 'GET') {
      // Get user workspaces
      console.log(`Getting workspaces for user: ${email} (${userId})`);
      const result = await getUserWorkspaces(userId);
      
      result.metadata = {
        userId,
        userEmail: email,
        action: 'list',
        timestamp: new Date().toISOString(),
        version: '2.0.0-serverless'
      };
      
      res.status(200).json(result);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Collaboration API error:', error);
    res.status(500).json({
      success: false,
      error: 'Collaboration operation failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Export with Clerk authentication middleware
module.exports = withAuth(collaborationHandler);

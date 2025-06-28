const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const supabaseAuth = require('../middleware/supabaseAuth');
const supabaseService = require('../services/supabaseService');
const logger = require('../utils/logger');

// Create a new project
router.post('/create', supabaseAuth, async (req, res) => {
  try {
    const { name, description, type, template, network, files } = req.body;
    const userId = req.user.id;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        error: 'Project name and type are required'
      });
    }

    const projectData = {
      id: uuidv4(),
      name,
      description: description || null,
      user_id: userId,
      type: type || 'contract',
      status: 'active',
      project_data: {
        template: template || null,
        network: network || 'Ethereum',
        files: files || {},
        settings: {
          compiler: '0.8.19',
          optimization: true,
          runs: 200
        }
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const result = await supabaseService.createProject(projectData);

    if (result.success) {
      logger.info('Project created successfully', { projectId: result.data.id, userId });
      res.json({
        success: true,
        data: result.data
      });
    } else {
      logger.error('Failed to create project', { error: result.error, userId });
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Error creating project:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get user projects
router.get('/list', supabaseAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, type, limit = 50, offset = 0 } = req.query;

    const result = await supabaseService.getUserProjects(userId, {
      status,
      type,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        total: result.total || result.data.length
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Error fetching projects:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get project by ID
router.get('/:projectId', supabaseAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const result = await supabaseService.getProjectById(projectId, userId);

    if (result.success) {
      if (!result.data) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Error fetching project:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Update project
router.put('/:projectId', supabaseAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    // Ensure user owns the project
    const projectResult = await supabaseService.getProjectById(projectId, userId);
    if (!projectResult.success || !projectResult.data) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const result = await supabaseService.updateProject(projectId, updateData);

    if (result.success) {
      logger.info('Project updated successfully', { projectId, userId });
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Delete project
router.delete('/:projectId', supabaseAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    // Ensure user owns the project
    const projectResult = await supabaseService.getProjectById(projectId, userId);
    if (!projectResult.success || !projectResult.data) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const result = await supabaseService.deleteProject(projectId);

    if (result.success) {
      logger.info('Project deleted successfully', { projectId, userId });
      res.json({
        success: true,
        message: 'Project deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Error deleting project:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Save project files
router.post('/:projectId/files', supabaseAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    const { files } = req.body;

    if (!files || typeof files !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Files object is required'
      });
    }

    // Ensure user owns the project
    const projectResult = await supabaseService.getProjectById(projectId, userId);
    if (!projectResult.success || !projectResult.data) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const currentProjectData = projectResult.data.project_data || {};
    const updatedProjectData = {
      ...currentProjectData,
      files: files
    };

    const result = await supabaseService.updateProject(projectId, {
      project_data: updatedProjectData,
      updated_at: new Date().toISOString()
    });

    if (result.success) {
      logger.info('Project files saved successfully', { projectId, userId, fileCount: Object.keys(files).length });
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Error saving project files:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;

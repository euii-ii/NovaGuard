const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// In-memory storage for development (fallback when Supabase is not available)
let inMemoryProjects = [];
let projectIdCounter = 1;

// Mock LLM service for testing
const mockLLMAnalysis = (contractCode, contractAddress) => {
  return {
    vulnerabilities: [
      {
        name: "Reentrancy",
        affectedLines: "42-47",
        description: "Potential reentrancy vulnerability in withdraw function.",
        severity: "high",
        fixSuggestion: "Apply reentrancy guard or checks-effects-interactions pattern."
      },
      {
        name: "Integer Overflow",
        affectedLines: "23-25",
        description: "Potential integer overflow in calculation.",
        severity: "medium",
        fixSuggestion: "Use SafeMath library or Solidity 0.8+ built-in overflow protection."
      }
    ],
    securityScore: 75,
    riskCategory: {
      label: "medium",
      justification: "Some security issues found but manageable with proper fixes."
    },
    codeInsights: {
      gasOptimizationTips: [
        "Combine multiple state writes into single transaction",
        "Use events instead of storage for data that doesn't need to be queried",
        "Pack struct variables to save storage slots"
      ],
      antiPatternNotices: [
        "Usage of tx.origin instead of msg.sender",
        "Unbounded loop in function processArray"
      ],
      dangerousUsage: [
        "Direct use of delegatecall without proper validation"
      ]
    }
  };
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Audit endpoint
app.post('/functions/v1/audit', async (req, res) => {
  try {
    console.log('Received audit request:', req.body);
    
    const { contractAddress, chain, contractCode, name, description } = req.body;
    
    // Validate request
    if (!contractAddress && !contractCode) {
      return res.status(400).json({
        error: 'Either contractAddress or contractCode is required'
      });
    }

    // Get user ID from Authorization header (Clerk JWT)
    const authHeader = req.headers.authorization;
    let userId = 'anonymous';
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // In a real implementation, you'd verify the JWT token here
      // For now, we'll extract a mock user ID
      userId = 'user_' + Math.random().toString(36).substring(2, 15);
    }

    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate mock analysis results
    const analysisResults = mockLLMAnalysis(contractCode, contractAddress);

    // Store audit result in Supabase
    const auditData = {
      user_id: userId,
      contract_address: contractAddress,
      chain: chain || 'ethereum',
      contract_code: contractCode,
      project_name: name,
      project_description: description,
      analysis_results: analysisResults,
      status: 'completed',
      created_at: new Date().toISOString()
    };

    const { data: auditRecord, error: auditError } = await supabase
      .from('audits')
      .insert(auditData)
      .select()
      .single();

    if (auditError) {
      console.error('Error storing audit:', auditError);
      // Continue anyway, return results even if storage fails
    }

    // Return analysis results
    res.json({
      success: true,
      auditId: auditRecord?.id || `audit_${Date.now()}`,
      ...analysisResults
    });

  } catch (error) {
    console.error('Audit error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Create project endpoint
app.post('/functions/v1/projects', async (req, res) => {
  try {
    console.log('Received project creation request:', req.body);

    const { name, description, type, template, network, contract_code, project_data } = req.body;

    // Validate request
    if (!name) {
      return res.status(400).json({
        error: 'Project name is required'
      });
    }

    // Get user ID from Authorization header (Clerk JWT)
    const authHeader = req.headers.authorization;
    let userId = 'anonymous';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // In a real implementation, you'd verify the JWT token here
      // For now, we'll extract a mock user ID
      userId = 'user_' + Math.random().toString(36).substring(2, 15);
    }

    // Create project record
    const projectData = {
      user_id: userId,
      project_name: name,
      project_description: description,
      contract_code: contract_code,
      chain: network || 'ethereum',
      analysis_results: null, // Will be filled when audit is run
      status: 'draft',
      created_at: new Date().toISOString(),
      project_metadata: project_data
    };

    let project;
    try {
      const { data, error: projectError } = await supabase
        .from('audits')
        .insert(projectData)
        .select()
        .single();

      if (projectError) {
        throw projectError;
      }
      project = data;
    } catch (supabaseError) {
      console.log('Supabase not available, using in-memory storage:', supabaseError.message);

      // Fallback to in-memory storage
      project = {
        id: `project_${projectIdCounter++}`,
        ...projectData
      };
      inMemoryProjects.push(project);
    }

    // Transform to frontend format
    const transformedProject = {
      id: project.id,
      name: project.project_name,
      description: project.project_description,
      user_id: project.user_id,
      created_at: project.created_at,
      updated_at: project.updated_at || project.created_at,
      project_data: {
        contractCode: project.contract_code,
        chain: project.chain,
        template: project_data?.template,
        category: project_data?.category,
        network: project_data?.network,
        files: project_data?.files
      },
      status: project.status,
      type: type || 'contract'
    };

    console.log('Project created successfully:', transformedProject);
    res.json({
      success: true,
      project: transformedProject
    });

  } catch (error) {
    console.error('Project creation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Get projects endpoint
app.get('/functions/v1/projects', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let userId = 'anonymous';
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      userId = 'user_' + Math.random().toString(36).substring(2, 15);
    }

    // Get user's projects from Supabase or in-memory storage
    let projects;
    try {
      const { data, error } = await supabase
        .from('audits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      projects = data;
    } catch (supabaseError) {
      console.log('Supabase not available, using in-memory storage:', supabaseError.message);

      // Fallback to in-memory storage
      projects = inMemoryProjects.filter(p => p.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    // Transform to frontend format
    const transformedProjects = (projects || []).map(project => ({
      id: project.id,
      name: project.project_name || `Contract ${project.contract_address?.substring(0, 8)}`,
      description: project.project_description,
      user_id: project.user_id,
      created_at: project.created_at,
      updated_at: project.updated_at || project.created_at,
      project_data: {
        contractAddress: project.contract_address,
        chain: project.chain,
        analysisResults: project.analysis_results
      },
      status: project.status || 'completed',
      type: 'contract'
    }));

    res.json(transformedProjects);

  } catch (error) {
    console.error('Projects error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Get specific project
app.get('/functions/v1/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;

    let project;
    try {
      const { data, error } = await supabase
        .from('audits')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }
      project = data;
    } catch (supabaseError) {
      console.log('Supabase not available, using in-memory storage:', supabaseError.message);

      // Fallback to in-memory storage
      project = inMemoryProjects.find(p => p.id === id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
    }

    // Transform to frontend format
    const transformedProject = {
      id: project.id,
      name: project.project_name || `Contract ${project.contract_address?.substring(0, 8)}`,
      description: project.project_description,
      user_id: project.user_id,
      created_at: project.created_at,
      updated_at: project.updated_at || project.created_at,
      project_data: {
        contractAddress: project.contract_address,
        chain: project.chain,
        analysisResults: project.analysis_results
      },
      status: project.status || 'completed',
      type: 'contract'
    };

    res.json(transformedProject);

  } catch (error) {
    console.error('Project fetch error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Realtime session endpoints
app.post('/functions/v1/realtime/session/start', async (req, res) => {
  try {
    console.log('Starting realtime session:', req.body);

    const authHeader = req.headers.authorization;
    let userId = 'anonymous';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      userId = 'user_' + Math.random().toString(36).substring(2, 15);
    }

    // Simulate session start
    res.json({
      success: true,
      message: 'Development session started successfully',
      sessionId: `session_${Date.now()}`,
      userId: userId
    });

  } catch (error) {
    console.error('Realtime session error:', error);
    res.status(500).json({
      error: 'Failed to start session',
      message: error.message
    });
  }
});

// Service status endpoint
app.get('/functions/v1/status', async (req, res) => {
  try {
    res.json({
      success: true,
      services: {
        audit: 'online',
        projects: 'online',
        realtime: 'online',
        compiler: 'online'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Status check failed' });
  }
});

// Contract compilation endpoint
app.post('/functions/v1/compile', async (req, res) => {
  try {
    console.log('Compiling contract:', req.body);

    const { contractCode, contractName, agents } = req.body;

    if (!contractCode) {
      return res.status(400).json({
        error: 'Contract code is required'
      });
    }

    // Simulate compilation
    await new Promise(resolve => setTimeout(resolve, 1000));

    res.json({
      success: true,
      data: {
        compiled: true,
        contractName: contractName || 'Contract',
        warnings: [
          { message: 'Consider using SafeMath for arithmetic operations', line: 15 }
        ],
        bytecode: '0x608060405234801561001057600080fd5b50...',
        abi: []
      }
    });

  } catch (error) {
    console.error('Compilation error:', error);
    res.status(500).json({
      error: 'Compilation failed',
      message: error.message
    });
  }
});

// Project file operations
app.put('/functions/v1/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { files, project_data } = req.body;

    console.log('Updating project:', id, 'with files:', Object.keys(files || {}));

    const { data: project, error } = await supabase
      .from('audits')
      .update({
        project_metadata: { ...project_data, files },
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating project:', error);
      return res.status(500).json({ error: 'Failed to update project' });
    }

    res.json({
      success: true,
      data: project
    });

  } catch (error) {
    console.error('Project update error:', error);
    res.status(500).json({
      error: 'Failed to update project',
      message: error.message
    });
  }
});

// Export results endpoint
app.post('/functions/v1/export', async (req, res) => {
  try {
    const { format, data, filename } = req.body;

    console.log('Exporting results in format:', format);

    // In a real implementation, you might generate files server-side
    // For now, we'll just return success
    res.json({
      success: true,
      message: `Export prepared in ${format} format`,
      filename: filename || `export_${Date.now()}.${format}`
    });

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      error: 'Export failed',
      message: error.message
    });
  }
});

// Template endpoints
app.get('/functions/v1/templates', async (req, res) => {
  try {
    const templates = [
      {
        id: 'hello-world',
        name: 'Hello World',
        description: 'A simple smart contract to get started',
        category: 'Basic',
        network: 'Ethereum',
        version: '1.0.0'
      },
      {
        id: 'erc20-token',
        name: 'ERC-20 Token',
        description: 'Standard fungible token implementation',
        category: 'Token',
        network: 'Ethereum',
        version: '1.0.0'
      },
      {
        id: 'nft-collection',
        name: 'NFT Collection',
        description: 'ERC-721 NFT collection with minting',
        category: 'NFT',
        network: 'Ethereum',
        version: '1.0.0'
      }
    ];

    res.json({
      success: true,
      data: templates
    });

  } catch (error) {
    console.error('Templates error:', error);
    res.status(500).json({
      error: 'Failed to fetch templates',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 Audit endpoint: http://localhost:${PORT}/functions/v1/audit`);
  console.log(`📁 Projects endpoint: http://localhost:${PORT}/functions/v1/projects`);
  console.log(`⚡ Realtime endpoint: http://localhost:${PORT}/functions/v1/realtime`);
  console.log(`🔧 Compile endpoint: http://localhost:${PORT}/functions/v1/compile`);
  console.log(`📤 Export endpoint: http://localhost:${PORT}/functions/v1/export`);
  console.log(`📋 Templates endpoint: http://localhost:${PORT}/functions/v1/templates`);
});

module.exports = app;

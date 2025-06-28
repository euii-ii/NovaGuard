const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const supabaseAuth = require('../middleware/supabaseAuth');
const supabaseService = require('../services/supabaseService');
const logger = require('../utils/logger');

// Simulate Solidity compilation
const simulateCompilation = async (contractCode, settings = {}) => {
  // Simulate compilation delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  const hasErrors = Math.random() < 0.1; // 10% chance of errors
  const hasWarnings = Math.random() < 0.3; // 30% chance of warnings
  
  if (hasErrors) {
    return {
      success: false,
      errors: [
        {
          severity: 'error',
          message: 'Syntax error: Expected \';\' but got identifier',
          line: Math.floor(Math.random() * 50) + 1,
          column: Math.floor(Math.random() * 80) + 1
        }
      ]
    };
  }
  
  const result = {
    success: true,
    bytecode: '0x608060405234801561001057600080fd5b50...',
    abi: [
      {
        "inputs": [],
        "name": "name",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
      }
    ],
    gasEstimate: Math.floor(Math.random() * 1000000) + 500000,
    warnings: hasWarnings ? [
      {
        severity: 'warning',
        message: 'Unused local variable',
        line: Math.floor(Math.random() * 50) + 1,
        column: Math.floor(Math.random() * 80) + 1
      }
    ] : []
  };
  
  return result;
};

// Compile contract
router.post('/compile', supabaseAuth, async (req, res) => {
  try {
    const { contractCode, contractName, settings } = req.body;
    const userId = req.user.id;
    
    if (!contractCode) {
      return res.status(400).json({
        success: false,
        error: 'Contract code is required'
      });
    }
    
    logger.info('Starting compilation', { 
      contractName: contractName || 'Unknown',
      userId,
      codeLength: contractCode.length 
    });
    
    // Create compilation record
    const compilationId = uuidv4();
    const compilationRecord = {
      id: compilationId,
      user_id: userId,
      contract_name: contractName || 'Untitled',
      contract_code: contractCode,
      settings: settings || {
        compiler: '0.8.19',
        optimization: true,
        runs: 200
      },
      status: 'compiling',
      created_at: new Date().toISOString()
    };
    
    // Save compilation record to database
    await supabaseService.createCompilation(compilationRecord);
    
    // Perform compilation
    const compilationResult = await simulateCompilation(contractCode, settings);
    
    // Update compilation record with results
    const updateData = {
      status: compilationResult.success ? 'completed' : 'failed',
      result: compilationResult,
      completed_at: new Date().toISOString()
    };
    
    await supabaseService.updateCompilation(compilationId, updateData);
    
    if (compilationResult.success) {
      logger.info('Compilation successful', { 
        compilationId,
        contractName: contractName || 'Unknown',
        userId 
      });
    } else {
      logger.warn('Compilation failed', { 
        compilationId,
        contractName: contractName || 'Unknown',
        userId,
        errors: compilationResult.errors 
      });
    }
    
    res.json({
      success: true,
      data: {
        compilationId,
        ...compilationResult
      }
    });
    
  } catch (error) {
    logger.error('Error during compilation:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get compilation result
router.get('/result/:compilationId', supabaseAuth, async (req, res) => {
  try {
    const { compilationId } = req.params;
    const userId = req.user.id;
    
    const result = await supabaseService.getCompilation(compilationId, userId);
    
    if (!result.success || !result.data) {
      return res.status(404).json({
        success: false,
        error: 'Compilation not found'
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
    
  } catch (error) {
    logger.error('Error fetching compilation result:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get user compilation history
router.get('/history', supabaseAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;
    
    const result = await supabaseService.getUserCompilations(userId, {
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
    logger.error('Error fetching compilation history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Validate Solidity syntax
router.post('/validate', supabaseAuth, async (req, res) => {
  try {
    const { contractCode } = req.body;
    
    if (!contractCode) {
      return res.status(400).json({
        success: false,
        error: 'Contract code is required'
      });
    }
    
    // Simple syntax validation simulation
    const issues = [];
    
    // Check for basic syntax issues
    if (!contractCode.includes('pragma solidity')) {
      issues.push({
        severity: 'warning',
        message: 'Missing pragma directive',
        line: 1,
        column: 1
      });
    }
    
    if (!contractCode.includes('contract ')) {
      issues.push({
        severity: 'error',
        message: 'No contract definition found',
        line: 1,
        column: 1
      });
    }
    
    // Check for unmatched braces
    const openBraces = (contractCode.match(/{/g) || []).length;
    const closeBraces = (contractCode.match(/}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      issues.push({
        severity: 'error',
        message: 'Unmatched braces',
        line: contractCode.split('\n').length,
        column: 1
      });
    }
    
    res.json({
      success: true,
      data: {
        isValid: issues.filter(i => i.severity === 'error').length === 0,
        issues
      }
    });
    
  } catch (error) {
    logger.error('Error validating contract:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get compiler versions
router.get('/versions', async (req, res) => {
  try {
    const versions = [
      '0.8.19',
      '0.8.18',
      '0.8.17',
      '0.8.16',
      '0.8.15',
      '0.7.6',
      '0.6.12'
    ];
    
    res.json({
      success: true,
      data: versions
    });
    
  } catch (error) {
    logger.error('Error fetching compiler versions:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;

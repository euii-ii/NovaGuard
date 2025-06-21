#!/usr/bin/env node

/**
 * Simple test script to verify services are working
 */

const path = require('path');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.OPENROUTER_API_KEY = 'test-api-key';
process.env.JWT_SECRET = 'test-secret-key';

async function testServices() {
  console.log('Testing backend services...\n');

  try {
    // Test realTimeDevelopmentService
    console.log('1. Testing Real-Time Development Service...');
    const realTimeDevelopmentService = require('./src/services/realTimeDevelopmentService');
    await realTimeDevelopmentService.initialize();
    const rtStatus = realTimeDevelopmentService.getStatus();
    console.log('✓ Real-Time Development Service initialized');
    console.log(`  - Active analyses: ${rtStatus.activeAnalyses}`);
    console.log(`  - Queue size: ${rtStatus.queueSize}`);
    console.log(`  - Active sessions: ${rtStatus.activeSessions}`);

    // Test collaborativeWorkspaceManager
    console.log('\n2. Testing Collaborative Workspace Manager...');
    const collaborativeWorkspaceManager = require('./src/services/collaborativeWorkspaceManager');
    await collaborativeWorkspaceManager.initialize();
    const cwmStatus = collaborativeWorkspaceManager.getStatus();
    console.log('✓ Collaborative Workspace Manager initialized');
    console.log(`  - Active workspaces: ${cwmStatus.activeWorkspaces}`);
    console.log(`  - Total collaborators: ${cwmStatus.totalCollaborators}`);
    console.log(`  - Active sessions: ${cwmStatus.activeSessions}`);

    // Test workspace creation
    console.log('\n3. Testing workspace creation...');
    const workspace = await collaborativeWorkspaceManager.createWorkspace({
      name: 'Test Workspace',
      description: 'Test workspace for service validation',
      createdBy: 'test-user-123',
      visibility: 'private'
    });
    console.log('✓ Workspace created successfully');
    console.log(`  - Workspace ID: ${workspace.id}`);
    console.log(`  - Name: ${workspace.name}`);
    console.log(`  - Created by: ${workspace.createdBy}`);

    // Test code change processing
    console.log('\n4. Testing code change processing...');
    const changeData = {
      userId: 'test-user-123',
      workspaceId: workspace.id,
      filePath: 'contracts/Test.sol',
      content: 'pragma solidity ^0.8.0;\n\ncontract Test {\n    uint256 public value;\n}',
      cursorPosition: { line: 4, column: 1 },
      changeType: 'edit'
    };

    const result = await realTimeDevelopmentService.processCodeChange(changeData);
    console.log('✓ Code change processed successfully');
    console.log(`  - Analysis ID: ${result.analysisId}`);
    console.log(`  - Processing time: ${result.metadata.processingTime}ms`);

    // Test other core services
    console.log('\n5. Testing other core services...');
    
    const llmService = require('./src/services/llmService');
    const llmStatus = llmService.getModelInfo();
    console.log('✓ LLM Service accessible');
    console.log(`  - Default model: ${llmStatus.defaultModel}`);
    console.log(`  - Configured: ${llmStatus.configured}`);

    const web3Service = require('./src/services/web3Service');
    const chains = web3Service.getSupportedChains();
    console.log('✓ Web3 Service accessible');
    console.log(`  - Supported chains: ${Object.keys(chains).length}`);

    const multiChainWeb3Service = require('./src/services/multiChainWeb3Service');
    const multiChainStatus = multiChainWeb3Service.getStatus();
    console.log('✓ Multi-Chain Web3 Service accessible');
    console.log(`  - Initialized: ${multiChainStatus.initialized}`);

    console.log('\n🎉 All services are working correctly!');
    console.log('\nService Status Summary:');
    console.log('- Real-Time Development Service: ✓ Running');
    console.log('- Collaborative Workspace Manager: ✓ Running');
    console.log('- LLM Service: ✓ Running');
    console.log('- Web3 Service: ✓ Running');
    console.log('- Multi-Chain Web3 Service: ✓ Running');

  } catch (error) {
    console.error('❌ Service test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testServices().then(() => {
  console.log('\n✅ Service validation completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Service validation failed:', error.message);
  process.exit(1);
});
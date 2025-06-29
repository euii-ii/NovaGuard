#!/usr/bin/env node

/**
 * Frontend Deployment Integration Test
 * Tests the frontend deployment service integration
 */

// Use native fetch (Node.js 18+)

// Mock the deployment service
const DeploymentService = {
  async deployContract(contractCode, contractName, network, options = {}) {
    console.log('🚀 Frontend DeploymentService.deployContract called');
    console.log('Contract Name:', contractName);
    console.log('Network:', network);
    console.log('Options:', options);

    // Simulate the frontend API call
    const response = await fetch('http://localhost:3002/api/deployment/deploy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contractCode,
        contractName,
        chain: network.split('-')[0] || 'ethereum',
        network: network.split('-')[1] || 'sepolia',
        constructorArgs: options.constructorArgs || [],
        gasLimit: options.gasLimit || 'auto',
        gasPrice: options.gasPrice || 'auto'
      })
    });

    if (!response.ok) {
      throw new Error(`Deployment failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Deployment successful:', result);
    return result;
  }
};

async function testFrontendDeployment() {
  console.log('🌐 Testing Frontend Deployment Integration');
  console.log('==========================================\n');

  const testContract = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract FrontendTestContract {
    string public message;
    
    constructor(string memory _message) {
        message = _message;
    }
    
    function setMessage(string memory _message) public {
        message = _message;
    }
}`;

  try {
    console.log('📤 Deploying contract from frontend...');
    
    const result = await DeploymentService.deployContract(
      testContract,
      'FrontendTestContract',
      'ethereum-sepolia',
      {
        constructorArgs: ['Hello from Frontend!'],
        gasLimit: 'auto',
        gasPrice: 'auto'
      }
    );

    console.log('\n🎉 Frontend deployment test successful!');
    console.log('Deployment ID:', result.deploymentId);
    console.log('Contract Address:', result.contractAddress);
    console.log('Transaction Hash:', result.transactionHash);
    console.log('Explorer URL:', result.explorerUrl);

    return true;
  } catch (error) {
    console.error('❌ Frontend deployment test failed:', error.message);
    return false;
  }
}

async function testTerminalDeployment() {
  console.log('\n💻 Testing Terminal Deployment Command');
  console.log('======================================\n');

  // Simulate terminal deployment command
  const terminalCommand = 'deploy FrontendTestContract ethereum-sepolia';
  console.log('Terminal Command:', terminalCommand);

  try {
    // This would be called by the terminal service
    const result = await DeploymentService.deployContract(
      `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract TerminalTestContract {
    uint256 public value = 123;
}`,
      'TerminalTestContract',
      'ethereum-sepolia'
    );

    console.log('✅ Terminal deployment successful!');
    console.log('Result:', result);
    return true;
  } catch (error) {
    console.error('❌ Terminal deployment failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  const results = [];

  // Test 1: Frontend Integration
  const frontendResult = await testFrontendDeployment();
  results.push({ test: 'Frontend Integration', passed: frontendResult });

  // Test 2: Terminal Integration
  const terminalResult = await testTerminalDeployment();
  results.push({ test: 'Terminal Integration', passed: terminalResult });

  // Summary
  console.log('\n📊 Frontend Test Results:');
  console.log('=========================');
  results.forEach(result => {
    console.log(`${result.test}: ${result.passed ? '✅ PASS' : '❌ FAIL'}`);
  });

  const passedTests = results.filter(r => r.passed).length;
  console.log(`\n🎯 Overall: ${passedTests}/${results.length} tests passed`);

  if (passedTests === results.length) {
    console.log('🎉 All frontend deployment tests passed!');
    process.exit(0);
  } else {
    console.log('⚠️ Some frontend tests failed.');
    process.exit(1);
  }
}

runAllTests().catch(error => {
  console.error('💥 Frontend test suite crashed:', error);
  process.exit(1);
});

#!/usr/bin/env node

/**
 * FlashAudit Deployment Test Script
 * Tests the smart contract deployment functionality
 */

const axios = require('axios');

// Test configuration
const API_BASE_URL = 'http://localhost:3002';
const TEST_CONTRACT_CODE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract TestContract {
    uint256 private value;
    
    constructor(uint256 _initialValue) {
        value = _initialValue;
    }
    
    function setValue(uint256 _value) public {
        value = _value;
    }
    
    function getValue() public view returns (uint256) {
        return value;
    }
}`;

async function testHealthCheck() {
    console.log('🔍 Testing API Health Check...');
    try {
        const response = await axios.get(`${API_BASE_URL}/health`);
        console.log('✅ Health Check:', response.data);
        return true;
    } catch (error) {
        console.error('❌ Health Check Failed:', error.message);
        return false;
    }
}

async function testDeploymentEndpoint() {
    console.log('\n🚀 Testing Deployment Endpoint...');
    try {
        const deploymentData = {
            contractCode: TEST_CONTRACT_CODE,
            contractName: 'TestContract',
            chain: 'ethereum',
            network: 'sepolia',
            constructorArgs: [42],
            gasLimit: 'auto',
            gasPrice: 'auto'
        };

        console.log('📤 Sending deployment request...');
        console.log('Contract Name:', deploymentData.contractName);
        console.log('Network:', `${deploymentData.chain} ${deploymentData.network}`);

        const response = await axios.post(
            `${API_BASE_URL}/api/deployment/deploy`,
            deploymentData,
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('\n✅ Deployment Response:');
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));

        return response.data;
    } catch (error) {
        console.error('❌ Deployment Test Failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Error:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
        return null;
    }
}

async function runTests() {
    console.log('🧪 FlashAudit Deployment Test Suite');
    console.log('=====================================\n');

    // Test 1: Health Check
    const healthOk = await testHealthCheck();
    if (!healthOk) {
        console.log('\n❌ API server is not running. Please start the backend first.');
        process.exit(1);
    }

    // Test 2: Deployment Functionality
    const deploymentResult = await testDeploymentEndpoint();
    
    if (deploymentResult) {
        console.log('\n🎉 Deployment test completed successfully!');
    } else {
        console.log('\n⚠️ Deployment test failed.');
    }
}

runTests().catch(error => {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
});

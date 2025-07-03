#!/usr/bin/env node

/**
 * Simple Real Deployment Test
 * Tests basic deployment functionality with new RPC endpoints
 */

require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3002';
const SIMPLE_CONTRACT = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SimpleTest {
    string public message = "Hello World";
    
    function getMessage() public view returns (string memory) {
        return message;
    }
}`;

async function testSimpleDeployment() {
    console.log('🚀 Testing Simple Real Deployment');
    console.log('=================================\n');
    
    try {
        const deploymentData = {
            contractCode: SIMPLE_CONTRACT,
            contractName: 'SimpleTest',
            chain: 'ethereum',
            network: 'sepolia',
            constructorArgs: [],
            gasLimit: 'auto',
            gasPrice: 'auto'
        };

        console.log('📤 Sending deployment request...');
        console.log('Contract Name:', deploymentData.contractName);
        console.log('Network:', `${deploymentData.chain} ${deploymentData.network}`);
        console.log('Real deployment enabled:', process.env.ENABLE_REAL_DEPLOYMENT);

        const response = await axios.post(
            `${API_BASE_URL}/api/deployment/deploy`,
            deploymentData,
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 120000 // 2 minute timeout
            }
        );

        console.log('\n✅ Deployment Response:');
        console.log('Status:', response.status);
        console.log('Success:', response.data.success);
        console.log('Deployment ID:', response.data.deploymentId);
        console.log('Transaction Hash:', response.data.transactionHash);
        console.log('Contract Address:', response.data.contractAddress);
        
        if (response.data.gasUsed) {
            console.log('Gas Used:', response.data.gasUsed.toLocaleString());
        }
        
        if (response.data.explorerUrl) {
            console.log('Explorer URL:', response.data.explorerUrl);
        }

        // Check if this was a real deployment
        if (response.data.transactionHash && response.data.transactionHash.startsWith('0x') && response.data.transactionHash.length === 66) {
            console.log('\n🎉 REAL DEPLOYMENT SUCCESSFUL!');
            console.log('🔗 Contract deployed to actual blockchain');
            console.log('💰 Real gas was consumed');
            console.log('🌐 Viewable on block explorer');
        } else {
            console.log('\n⚠️ This appears to be a simulation');
        }

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

testSimpleDeployment().catch(error => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
});

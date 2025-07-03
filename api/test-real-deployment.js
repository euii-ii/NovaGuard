#!/usr/bin/env node

/**
 * Real Blockchain Deployment Test Script
 * Tests actual on-chain deployment functionality
 */

require('dotenv').config();
const axios = require('axios');
const { deploymentConfig, validateConfig, getDeploymentStatusMessage } = require('./deployment/config');

// Test configuration
const API_BASE_URL = 'http://localhost:3002';
const TEST_CONTRACT_CODE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract RealDeploymentTest {
    string public message;
    uint256 public deployedAt;
    address public deployer;
    
    constructor(string memory _message) {
        message = _message;
        deployedAt = block.timestamp;
        deployer = msg.sender;
    }
    
    function updateMessage(string memory _newMessage) public {
        require(msg.sender == deployer, "Only deployer can update");
        message = _newMessage;
    }
    
    function getInfo() public view returns (string memory, uint256, address) {
        return (message, deployedAt, deployer);
    }
}`;

async function checkConfiguration() {
    console.log('🔧 Checking Deployment Configuration');
    console.log('====================================\n');
    
    console.log('Status:', getDeploymentStatusMessage());
    console.log('Real deployment enabled:', deploymentConfig.enableRealDeployment);
    console.log('Contract verification enabled:', deploymentConfig.enableContractVerification);
    console.log('Default gas limit:', deploymentConfig.defaultGasLimit.toLocaleString());
    console.log('Default gas price:', deploymentConfig.defaultGasPrice, 'wei');
    
    const errors = validateConfig();
    if (errors.length > 0) {
        console.log('\n❌ Configuration errors:');
        errors.forEach(error => console.log(`  - ${error}`));
        return false;
    }
    
    console.log('\n✅ Configuration is valid');
    return true;
}

async function testRealDeployment() {
    console.log('\n🚀 Testing Real Blockchain Deployment');
    console.log('=====================================\n');
    
    try {
        const deploymentData = {
            contractCode: TEST_CONTRACT_CODE,
            contractName: 'RealDeploymentTest',
            chain: 'ethereum',
            network: 'sepolia', // Use Sepolia testnet
            constructorArgs: ['Hello from Real Deployment!'],
            gasLimit: 'auto',
            gasPrice: 'auto'
        };

        console.log('📤 Sending real deployment request...');
        console.log('Contract Name:', deploymentData.contractName);
        console.log('Network:', `${deploymentData.chain} ${deploymentData.network}`);
        console.log('Constructor Args:', deploymentData.constructorArgs);
        console.log('Real deployment enabled:', process.env.ENABLE_REAL_DEPLOYMENT);

        const response = await axios.post(
            `${API_BASE_URL}/api/deployment/deploy`,
            deploymentData,
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 60000 // 60 second timeout
            }
        );

        console.log('\n✅ Deployment Response:');
        console.log('Status:', response.status);
        console.log('Success:', response.data.success);
        console.log('Deployment ID:', response.data.deploymentId);
        console.log('Transaction Hash:', response.data.transactionHash);
        console.log('Contract Address:', response.data.contractAddress);
        console.log('Gas Used:', response.data.gasUsed?.toLocaleString());
        console.log('Gas Price:', response.data.gasPrice, 'wei');
        console.log('Block Number:', response.data.blockNumber?.toLocaleString());
        console.log('Explorer URL:', response.data.explorerUrl);
        console.log('Contract Explorer:', response.data.contractExplorerUrl);

        // Check if this was a real deployment or simulation
        if (response.data.transactionHash && response.data.transactionHash.length === 66) {
            if (deploymentConfig.enableRealDeployment) {
                console.log('\n🎉 REAL DEPLOYMENT SUCCESSFUL!');
                console.log('🔗 This contract was deployed to the actual blockchain');
                console.log('💰 Real gas was consumed for this transaction');
                console.log('🌐 You can view it on the block explorer');
            } else {
                console.log('\n⚠️ This appears to be a simulation (real deployment disabled)');
            }
        }

        return response.data;
    } catch (error) {
        console.error('❌ Real Deployment Test Failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Error:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
        return null;
    }
}

async function testNetworkConnectivity() {
    console.log('\n🌐 Testing Network Connectivity');
    console.log('===============================\n');
    
    const { ethers } = require('ethers');
    
    const networks = [
        { name: 'Ethereum Sepolia', rpc: process.env.ETHEREUM_SEPOLIA_RPC },
        { name: 'Polygon Mumbai', rpc: process.env.POLYGON_MUMBAI_RPC }
    ];
    
    for (const network of networks) {
        try {
            console.log(`Testing ${network.name}...`);
            const provider = new ethers.JsonRpcProvider(network.rpc);
            const blockNumber = await provider.getBlockNumber();
            console.log(`✅ ${network.name}: Connected (Block #${blockNumber.toLocaleString()})`);
        } catch (error) {
            console.log(`❌ ${network.name}: Failed (${error.message})`);
        }
    }
}

async function runAllTests() {
    console.log('🧪 Real Blockchain Deployment Test Suite');
    console.log('=========================================\n');

    // Test 1: Configuration Check
    const configOk = await checkConfiguration();
    
    // Test 2: Network Connectivity
    await testNetworkConnectivity();
    
    // Test 3: Real Deployment
    if (configOk) {
        const deploymentResult = await testRealDeployment();
        
        if (deploymentResult && deploymentResult.success) {
            console.log('\n🎉 All tests completed successfully!');
            
            if (deploymentConfig.enableRealDeployment) {
                console.log('\n📋 Next Steps:');
                console.log('1. Check the transaction on the block explorer');
                console.log('2. Verify the contract was deployed correctly');
                console.log('3. Test contract interactions if needed');
                console.log('\n⚠️ Note: Real gas was consumed for this deployment');
            }
        } else {
            console.log('\n⚠️ Deployment test failed or returned unexpected results');
        }
    } else {
        console.log('\n❌ Configuration issues prevent real deployment testing');
    }
}

// Run the tests
runAllTests().catch(error => {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
});

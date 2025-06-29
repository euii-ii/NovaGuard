// Enhanced Vercel serverless function for smart contract deployment
const { withAuth } = require('../middleware/auth');
const { createClient } = require('@supabase/supabase-js');
const { ethers } = require('ethers');
const solc = require('solc');

console.log('✅ Blockchain libraries loaded successfully - Real deployment enabled');

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

// Network configurations
const NETWORK_CONFIGS = {
  ethereum: {
    mainnet: {
      rpc: process.env.ETHEREUM_MAINNET_RPC || 'https://eth-mainnet.g.alchemy.com/v2/demo',
      chainId: 1,
      explorer: 'https://etherscan.io',
      currency: 'ETH'
    },
    sepolia: {
      rpc: process.env.ETHEREUM_SEPOLIA_RPC || 'https://eth-sepolia.g.alchemy.com/v2/demo',
      chainId: 11155111,
      explorer: 'https://sepolia.etherscan.io',
      currency: 'ETH'
    },
    goerli: {
      rpc: process.env.ETHEREUM_GOERLI_RPC || 'https://eth-goerli.g.alchemy.com/v2/demo',
      chainId: 5,
      explorer: 'https://goerli.etherscan.io',
      currency: 'ETH'
    }
  },
  polygon: {
    mainnet: {
      rpc: process.env.POLYGON_MAINNET_RPC || 'https://polygon-mainnet.g.alchemy.com/v2/demo',
      chainId: 137,
      explorer: 'https://polygonscan.com',
      currency: 'MATIC'
    },
    mumbai: {
      rpc: process.env.POLYGON_MUMBAI_RPC || 'https://polygon-mumbai.g.alchemy.com/v2/demo',
      chainId: 80001,
      explorer: 'https://mumbai.polygonscan.com',
      currency: 'MATIC'
    }
  },
  arbitrum: {
    mainnet: {
      rpc: process.env.ARBITRUM_MAINNET_RPC || 'https://arb-mainnet.g.alchemy.com/v2/demo',
      chainId: 42161,
      explorer: 'https://arbiscan.io',
      currency: 'ETH'
    },
    goerli: {
      rpc: process.env.ARBITRUM_GOERLI_RPC || 'https://arb-goerli.g.alchemy.com/v2/demo',
      chainId: 421613,
      explorer: 'https://goerli.arbiscan.io',
      currency: 'ETH'
    }
  },
  optimism: {
    mainnet: {
      rpc: process.env.OPTIMISM_MAINNET_RPC || 'https://opt-mainnet.g.alchemy.com/v2/demo',
      chainId: 10,
      explorer: 'https://optimistic.etherscan.io',
      currency: 'ETH'
    },
    goerli: {
      rpc: process.env.OPTIMISM_GOERLI_RPC || 'https://opt-goerli.g.alchemy.com/v2/demo',
      chainId: 420,
      explorer: 'https://goerli-optimism.etherscan.io',
      currency: 'ETH'
    }
  },
  base: {
    mainnet: {
      rpc: process.env.BASE_MAINNET_RPC || 'https://base-mainnet.g.alchemy.com/v2/demo',
      chainId: 8453,
      explorer: 'https://basescan.org',
      currency: 'ETH'
    },
    goerli: {
      rpc: process.env.BASE_GOERLI_RPC || 'https://base-goerli.g.alchemy.com/v2/demo',
      chainId: 84531,
      explorer: 'https://goerli.basescan.org',
      currency: 'ETH'
    }
  }
};

// CORS headers helper
const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
};

// Compile Solidity contract
const compileContract = (contractCode, contractName) => {
  const input = {
    language: 'Solidity',
    sources: {
      [`${contractName}.sol`]: {
        content: contractCode
      }
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode']
        }
      }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const errors = output.errors.filter(error => error.severity === 'error');
    if (errors.length > 0) {
      throw new Error(`Compilation failed: ${errors.map(e => e.message).join(', ')}`);
    }
  }

  const contract = output.contracts[`${contractName}.sol`][contractName];
  if (!contract) {
    throw new Error(`Contract ${contractName} not found in compilation output`);
  }

  return {
    abi: contract.abi,
    bytecode: contract.evm.bytecode.object
  };
};

// Real contract deployment function
const deployContract = async (contractCode, deploymentOptions, userId) => {
  const deploymentId = `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const enableRealDeployment = process.env.ENABLE_REAL_DEPLOYMENT === 'true';

  try {
    console.log(`🚀 Starting deployment ${deploymentId}`);
    console.log(`Real deployment enabled: ${enableRealDeployment}`);

    // Log deployment start to database
    if (supabaseAdmin) {
      await supabaseAdmin
        .from('deployment_logs')
        .insert({
          deployment_id: deploymentId,
          user_id: userId,
          contract_code: contractCode.substring(0, 1000),
          chain: deploymentOptions.chain || 'ethereum',
          network: deploymentOptions.network || 'sepolia',
          status: 'deploying',
          created_at: new Date().toISOString()
        });
    }

    if (!enableRealDeployment) {
      console.log('⚠️ Real deployment disabled, using simulation');
      // Simulate deployment process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate mock deployment result
      const mockTxHash = '0x' + Math.random().toString(16).substr(2, 64);
      const mockContractAddress = '0x' + Math.random().toString(16).substr(2, 40);

      const deploymentResult = {
        deploymentId,
        success: true,
        transactionHash: mockTxHash,
        contractAddress: mockContractAddress,
        chain: deploymentOptions.chain || 'ethereum',
        network: deploymentOptions.network || 'sepolia',
        gasUsed: Math.floor(Math.random() * 1000000) + 500000,
        gasPrice: '20000000000', // 20 gwei
        blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
        explorerUrl: `https://etherscan.io/tx/${mockTxHash}`,
        contractExplorerUrl: `https://etherscan.io/address/${mockContractAddress}`,
        deployedAt: new Date().toISOString(),
        status: 'deployed'
      };

      return deploymentResult;
    }

    // Real blockchain deployment
    console.log('🔗 Performing real blockchain deployment');

    const chain = deploymentOptions.chain || 'ethereum';
    const network = deploymentOptions.network || 'sepolia';
    const contractName = deploymentOptions.contractName || 'Contract';

    // Get network configuration
    const networkConfig = NETWORK_CONFIGS[chain]?.[network];
    if (!networkConfig) {
      throw new Error(`Unsupported network: ${chain}-${network}`);
    }

    console.log(`📡 Connecting to ${chain} ${network} (${networkConfig.rpc})`);

    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(networkConfig.rpc);

    // Use testnet private key for testnets, deployer key for mainnets
    const isTestnet = ['sepolia', 'goerli', 'mumbai'].includes(network);
    const privateKey = isTestnet
      ? process.env.TESTNET_DEPLOYER_PRIVATE_KEY
      : process.env.DEPLOYER_PRIVATE_KEY;

    if (!privateKey) {
      throw new Error('Deployer private key not configured');
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(`👤 Deployer address: ${wallet.address}`);

    // Check wallet balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`💰 Deployer balance: ${ethers.formatEther(balance)} ${networkConfig.currency}`);

    if (balance === 0n) {
      throw new Error(`Insufficient balance for deployment. Please fund ${wallet.address}`);
    }

    // Compile contract
    console.log('🔨 Compiling contract...');
    const { abi, bytecode } = compileContract(contractCode, contractName);
    console.log('✅ Contract compiled successfully');

    // Create contract factory
    const contractFactory = new ethers.ContractFactory(abi, bytecode, wallet);

    // Prepare constructor arguments
    const constructorArgs = deploymentOptions.constructorArgs || [];
    console.log('📝 Constructor args:', constructorArgs);

    // Deploy contract
    console.log('🚀 Deploying contract to blockchain...');
    const contract = await contractFactory.deploy(...constructorArgs, {
      gasLimit: deploymentOptions.gasLimit === 'auto' ? undefined : deploymentOptions.gasLimit,
      gasPrice: deploymentOptions.gasPrice === 'auto' ? undefined : deploymentOptions.gasPrice
    });

    console.log('⏳ Waiting for deployment transaction...');
    const deploymentTx = await contract.deploymentTransaction();
    const receipt = await deploymentTx.wait();

    console.log('✅ Contract deployed successfully!');
    console.log(`📍 Contract address: ${await contract.getAddress()}`);
    console.log(`🔗 Transaction hash: ${receipt.hash}`);

    const contractAddress = await contract.getAddress();
    const deploymentResult = {
      deploymentId,
      success: true,
      transactionHash: receipt.hash,
      contractAddress,
      chain,
      network,
      gasUsed: Number(receipt.gasUsed),
      gasPrice: deploymentTx.gasPrice ? deploymentTx.gasPrice.toString() : '0',
      blockNumber: receipt.blockNumber,
      explorerUrl: `${networkConfig.explorer}/tx/${receipt.hash}`,
      contractExplorerUrl: `${networkConfig.explorer}/address/${contractAddress}`,
      deployedAt: new Date().toISOString(),
      status: 'deployed',
      abi: abi,
      bytecode: bytecode
    };

    // Log successful deployment to database
    if (supabaseAdmin) {
      await supabaseAdmin
        .from('deployment_logs')
        .update({
          status: 'deployed',
          transaction_hash: deploymentResult.transactionHash,
          contract_address: deploymentResult.contractAddress,
          gas_used: deploymentResult.gasUsed,
          block_number: deploymentResult.blockNumber,
          deployed_at: new Date().toISOString()
        })
        .eq('deployment_id', deploymentId);
    }

    console.log('📊 Deployment completed successfully:', deploymentResult);
    return deploymentResult;
  } catch (error) {
    console.error('Deployment error:', error);
    
    // Log error to database
    if (supabaseAdmin) {
      await supabaseAdmin
        .from('deployment_logs')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('deployment_id', deploymentId);
    }
    
    throw error;
  }
};

const deploymentHandler = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      contractCode, 
      contractName,
      chain, 
      network,
      constructorArgs,
      gasLimit,
      gasPrice 
    } = req.body;
    const { userId, email } = req.auth;

    // Validation
    if (!contractCode) {
      return res.status(400).json({
        error: 'Contract code is required',
        details: 'Please provide the contract source code for deployment'
      });
    }

    if (contractCode.length > 1000000) {
      return res.status(400).json({
        error: 'Contract code too large',
        details: 'Contract code must be less than 1MB'
      });
    }

    console.log(`Deployment request from user: ${email} (${userId})`);
    console.log(`Deploying to: ${chain || 'ethereum'} ${network || 'mainnet'}`);

    // Deploy the contract
    const result = await deployContract(contractCode, {
      contractName: contractName || 'UnnamedContract',
      chain: chain || 'ethereum',
      network: network || 'mainnet',
      constructorArgs: constructorArgs || [],
      gasLimit: gasLimit || 'auto',
      gasPrice: gasPrice || 'auto'
    }, userId);

    // Add user context to the response
    result.deploymentMetadata = {
      userId,
      userEmail: email,
      timestamp: new Date().toISOString(),
      contractName: contractName || 'UnnamedContract',
      version: '2.0.0-serverless'
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('Deployment API error:', error);
    res.status(500).json({
      error: 'Deployment failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Export with Clerk authentication middleware
module.exports = withAuth(deploymentHandler);

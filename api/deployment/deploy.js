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
    },
    sepolia: {
      rpc: process.env.BASE_SEPOLIA_RPC || 'https://base-sepolia.g.alchemy.com/v2/demo',
      chainId: 84532,
      explorer: 'https://sepolia.basescan.org',
      currency: 'ETH'
    }
  },
  bsc: {
    mainnet: {
      rpc: process.env.BSC_MAINNET_RPC || 'https://bsc-dataseed1.binance.org',
      chainId: 56,
      explorer: 'https://bscscan.com',
      currency: 'BNB'
    },
    testnet: {
      rpc: process.env.BSC_TESTNET_RPC || 'https://data-seed-prebsc-1-s1.binance.org:8545',
      chainId: 97,
      explorer: 'https://testnet.bscscan.com',
      currency: 'BNB'
    }
  },
  avalanche: {
    mainnet: {
      rpc: process.env.AVALANCHE_MAINNET_RPC || 'https://api.avax.network/ext/bc/C/rpc',
      chainId: 43114,
      explorer: 'https://snowtrace.io',
      currency: 'AVAX'
    },
    fuji: {
      rpc: process.env.AVALANCHE_FUJI_RPC || 'https://api.avax-test.network/ext/bc/C/rpc',
      chainId: 43113,
      explorer: 'https://testnet.snowtrace.io',
      currency: 'AVAX'
    }
  },
  fantom: {
    mainnet: {
      rpc: process.env.FANTOM_MAINNET_RPC || 'https://rpc.ftm.tools',
      chainId: 250,
      explorer: 'https://ftmscan.com',
      currency: 'FTM'
    },
    testnet: {
      rpc: process.env.FANTOM_TESTNET_RPC || 'https://rpc.testnet.fantom.network',
      chainId: 4002,
      explorer: 'https://testnet.ftmscan.com',
      currency: 'FTM'
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

// Enhanced multi-chain contract deployment function
const deployContract = async (contractCode, deploymentOptions, userId, progressCallback) => {
  const deploymentId = `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const enableRealDeployment = process.env.ENABLE_REAL_DEPLOYMENT === 'true';

  try {
    console.log(`🚀 Starting enhanced deployment ${deploymentId}`);
    console.log(`Real deployment enabled: ${enableRealDeployment}`);
    console.log(`Target: ${deploymentOptions.chain}-${deploymentOptions.network}`);

    // Progress tracking
    const updateProgress = (step, message) => {
      console.log(`📊 [${step}%] ${message}`);
      if (progressCallback) progressCallback(step, message);
    };

    updateProgress(10, 'Initializing deployment');

    // Validate chain and network
    const chain = deploymentOptions.chain || 'ethereum';
    const network = deploymentOptions.network || 'sepolia';

    if (!NETWORK_CONFIGS[chain] || !NETWORK_CONFIGS[chain][network]) {
      throw new Error(`Unsupported network: ${chain}-${network}`);
    }

    updateProgress(20, 'Validating network configuration');

    // Log deployment start to database
    if (supabaseAdmin) {
      await supabaseAdmin
        .from('deployment_logs')
        .insert({
          deployment_id: deploymentId,
          user_id: userId,
          contract_code: contractCode.substring(0, 1000),
          chain: chain,
          network: network,
          status: 'deploying',
          deployment_options: deploymentOptions,
          created_at: new Date().toISOString()
        });
    }

    updateProgress(30, 'Logged deployment start');

    if (!enableRealDeployment) {
      console.log('⚠️ Real deployment disabled, using enhanced simulation');
      updateProgress(40, 'Running deployment simulation');

      // Enhanced simulation with realistic timing
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateProgress(60, 'Compiling contract');
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateProgress(80, 'Estimating gas');
      await new Promise(resolve => setTimeout(resolve, 500));
      updateProgress(90, 'Broadcasting transaction');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate mock deployment result with realistic data
      const mockTxHash = '0x' + Math.random().toString(16).substr(2, 64);
      const mockContractAddress = '0x' + Math.random().toString(16).substr(2, 40);
      const networkConfig = NETWORK_CONFIGS[chain][network];

      const deploymentResult = {
        deploymentId,
        success: true,
        transactionHash: mockTxHash,
        contractAddress: mockContractAddress,
        chain: chain,
        network: network,
        gasUsed: Math.floor(Math.random() * 1000000) + 500000,
        gasPrice: '20000000000', // 20 gwei
        blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
        explorerUrl: `${networkConfig.explorer}/tx/${mockTxHash}`,
        contractExplorerUrl: `${networkConfig.explorer}/address/${mockContractAddress}`,
        deployedAt: new Date().toISOString(),
        status: 'deployed',
        simulationMode: true,
        networkInfo: networkConfig
      };

      updateProgress(100, 'Deployment simulation completed');
      return deploymentResult;
    }

    // Real blockchain deployment
    console.log('🔗 Performing real blockchain deployment');
    updateProgress(40, 'Connecting to blockchain network');

    const contractName = deploymentOptions.contractName || 'Contract';

    // Get network configuration
    const networkConfig = NETWORK_CONFIGS[chain][network];
    console.log(`📡 Connecting to ${chain} ${network} (${networkConfig.rpc})`);

    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(networkConfig.rpc);
    updateProgress(50, 'Established blockchain connection');

    // Enhanced testnet detection
    const isTestnet = ['sepolia', 'goerli', 'mumbai', 'testnet', 'fuji'].includes(network);
    const privateKey = isTestnet
      ? process.env.TESTNET_DEPLOYER_PRIVATE_KEY
      : process.env.DEPLOYER_PRIVATE_KEY;

    if (!privateKey) {
      throw new Error(`Deployer private key not configured for ${isTestnet ? 'testnet' : 'mainnet'}`);
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(`👤 Deployer address: ${wallet.address}`);
    updateProgress(55, 'Wallet configured');

    // Check wallet balance with enhanced validation
    const balance = await provider.getBalance(wallet.address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`💰 Deployer balance: ${balanceEth} ${networkConfig.currency}`);

    if (balance === 0n) {
      throw new Error(`Insufficient balance for deployment. Please fund ${wallet.address} with ${networkConfig.currency}`);
    }

    // Estimate minimum required balance (rough estimate)
    const minRequiredBalance = ethers.parseEther('0.01'); // 0.01 ETH/native token
    if (balance < minRequiredBalance) {
      console.warn(`⚠️ Low balance detected: ${balanceEth} ${networkConfig.currency}. Deployment may fail.`);
    }

    updateProgress(60, 'Wallet balance verified');

    // Compile contract
    console.log('🔨 Compiling contract...');
    updateProgress(65, 'Compiling smart contract');
    const { abi, bytecode } = compileContract(contractCode, contractName);
    console.log('✅ Contract compiled successfully');
    updateProgress(70, 'Contract compilation completed');

    // Create contract factory
    const contractFactory = new ethers.ContractFactory(abi, bytecode, wallet);

    // Prepare constructor arguments
    const constructorArgs = deploymentOptions.constructorArgs || [];
    console.log('📝 Constructor args:', constructorArgs);

    // Enhanced gas estimation
    updateProgress(75, 'Estimating gas requirements');
    let gasEstimate;
    try {
      gasEstimate = await contractFactory.getDeployTransaction(...constructorArgs).then(tx =>
        provider.estimateGas(tx)
      );
      console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);
    } catch (gasError) {
      console.warn('⚠️ Gas estimation failed, using default limits');
      gasEstimate = ethers.parseUnits('2000000', 'wei'); // 2M gas default
    }

    // Get current gas price
    const feeData = await provider.getFeeData();
    const gasPrice = deploymentOptions.gasPrice === 'auto'
      ? feeData.gasPrice
      : ethers.parseUnits(deploymentOptions.gasPrice.toString(), 'gwei');

    console.log(`💰 Gas price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

    // Calculate deployment cost
    const deploymentCost = gasEstimate * gasPrice;
    console.log(`💸 Estimated deployment cost: ${ethers.formatEther(deploymentCost)} ${networkConfig.currency}`);

    updateProgress(80, 'Gas estimation completed');

    // Deploy contract with enhanced options
    console.log('🚀 Deploying contract to blockchain...');
    updateProgress(85, 'Broadcasting deployment transaction');

    const deploymentOptions_enhanced = {
      gasLimit: deploymentOptions.gasLimit === 'auto' ? gasEstimate * 120n / 100n : deploymentOptions.gasLimit, // 20% buffer
      gasPrice: gasPrice
    };

    const contract = await contractFactory.deploy(...constructorArgs, deploymentOptions_enhanced);

    console.log('⏳ Waiting for deployment transaction...');
    updateProgress(90, 'Waiting for transaction confirmation');

    const deploymentTx = await contract.deploymentTransaction();
    const receipt = await deploymentTx.wait();

    console.log('✅ Contract deployed successfully!');
    console.log(`📍 Contract address: ${await contract.getAddress()}`);
    console.log(`🔗 Transaction hash: ${receipt.hash}`);

    updateProgress(95, 'Deployment transaction confirmed');

    const contractAddress = await contract.getAddress();

    // Enhanced deployment result with comprehensive metadata
    const deploymentResult = {
      deploymentId,
      success: true,
      transactionHash: receipt.hash,
      contractAddress,
      chain,
      network,
      gasUsed: Number(receipt.gasUsed),
      gasPrice: deploymentTx.gasPrice ? deploymentTx.gasPrice.toString() : '0',
      gasEstimate: gasEstimate.toString(),
      blockNumber: receipt.blockNumber,
      explorerUrl: `${networkConfig.explorer}/tx/${receipt.hash}`,
      contractExplorerUrl: `${networkConfig.explorer}/address/${contractAddress}`,
      deployedAt: new Date().toISOString(),
      status: 'deployed',
      abi: abi,
      bytecode: bytecode,
      networkInfo: {
        chainId: networkConfig.chainId,
        currency: networkConfig.currency,
        explorer: networkConfig.explorer
      },
      deploymentCost: {
        gasUsed: Number(receipt.gasUsed),
        gasPrice: deploymentTx.gasPrice.toString(),
        totalCost: (receipt.gasUsed * deploymentTx.gasPrice).toString(),
        totalCostEth: ethers.formatEther(receipt.gasUsed * deploymentTx.gasPrice),
        currency: networkConfig.currency
      },
      contractMetadata: {
        name: contractName,
        constructorArgs: constructorArgs,
        compiler: 'solc',
        deployedBy: wallet.address
      }
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
          gas_price: deploymentResult.gasPrice,
          block_number: deploymentResult.blockNumber,
          deployment_cost: deploymentResult.deploymentCost.totalCost,
          network_info: deploymentResult.networkInfo,
          deployed_at: new Date().toISOString()
        })
        .eq('deployment_id', deploymentId);
    }

    updateProgress(100, 'Deployment completed successfully');
    console.log('📊 Enhanced deployment completed:', deploymentResult);
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

// Enhanced deployment handler with multi-chain support
const deploymentHandler = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      supportedChains: Object.keys(NETWORK_CONFIGS)
    });
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

    // Enhanced validation
    if (!contractCode) {
      return res.status(400).json({
        error: 'Contract code is required',
        details: 'Please provide the contract source code for deployment',
        supportedChains: Object.keys(NETWORK_CONFIGS)
      });
    }

    if (contractCode.length > 1000000) {
      return res.status(400).json({
        error: 'Contract code too large',
        details: 'Contract code must be less than 1MB'
      });
    }

    // Validate chain and network
    const targetChain = chain || 'ethereum';
    const targetNetwork = network || 'sepolia';

    if (!NETWORK_CONFIGS[targetChain]) {
      return res.status(400).json({
        error: `Unsupported blockchain: ${targetChain}`,
        supportedChains: Object.keys(NETWORK_CONFIGS)
      });
    }

    if (!NETWORK_CONFIGS[targetChain][targetNetwork]) {
      return res.status(400).json({
        error: `Unsupported network: ${targetNetwork} on ${targetChain}`,
        supportedNetworks: Object.keys(NETWORK_CONFIGS[targetChain])
      });
    }

    console.log(`🚀 Enhanced deployment request from user: ${email} (${userId})`);
    console.log(`📍 Target: ${targetChain}-${targetNetwork}`);
    console.log(`📝 Contract: ${contractName || 'UnnamedContract'}`);

    // Progress tracking (for future WebSocket implementation)
    const progressUpdates = [];
    const progressCallback = (step, message) => {
      progressUpdates.push({ step, message, timestamp: new Date().toISOString() });
    };

    // Deploy the contract with enhanced options
    const result = await deployContract(contractCode, {
      contractName: contractName || 'UnnamedContract',
      chain: targetChain,
      network: targetNetwork,
      constructorArgs: constructorArgs || [],
      gasLimit: gasLimit || 'auto',
      gasPrice: gasPrice || 'auto'
    }, userId, progressCallback);

    // Add comprehensive metadata to the response
    result.deploymentMetadata = {
      userId,
      userEmail: email,
      timestamp: new Date().toISOString(),
      contractName: contractName || 'UnnamedContract',
      version: '3.0.0-enhanced',
      progressUpdates: progressUpdates,
      supportedChains: Object.keys(NETWORK_CONFIGS),
      targetNetwork: {
        chain: targetChain,
        network: targetNetwork,
        config: NETWORK_CONFIGS[targetChain][targetNetwork]
      }
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('Enhanced deployment API error:', error);
    res.status(500).json({
      error: 'Deployment failed',
      message: error.message,
      timestamp: new Date().toISOString(),
      supportedChains: Object.keys(NETWORK_CONFIGS)
    });
  }
};

// Export with Clerk authentication middleware
module.exports = withAuth(deploymentHandler);

// Deployment Configuration for FlashAudit
// This file contains deployment settings and network configurations

const deploymentConfig = {
  // Enable/disable real blockchain deployment
  enableRealDeployment: process.env.ENABLE_REAL_DEPLOYMENT === 'true',
  
  // Enable/disable contract verification on block explorers
  enableContractVerification: process.env.ENABLE_CONTRACT_VERIFICATION === 'true',
  
  // Default gas settings
  defaultGasLimit: parseInt(process.env.DEFAULT_GAS_LIMIT) || 3000000,
  defaultGasPrice: process.env.DEFAULT_GAS_PRICE || '20000000000', // 20 gwei
  maxGasPrice: process.env.MAX_GAS_PRICE || '100000000000', // 100 gwei
  
  // Deployment timeout (5 minutes)
  deploymentTimeout: parseInt(process.env.DEPLOYMENT_TIMEOUT) || 300000,
  
  // Test wallet configuration (DO NOT USE IN PRODUCTION)
  testWallets: {
    // These are test private keys - NEVER use real private keys with funds!
    deployer: process.env.TESTNET_DEPLOYER_PRIVATE_KEY || '0xfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
    user: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  },
  
  // Supported networks for deployment
  supportedNetworks: [
    'ethereum-mainnet',
    'ethereum-sepolia', 
    'ethereum-goerli',
    'polygon-mainnet',
    'polygon-mumbai',
    'arbitrum-mainnet',
    'arbitrum-goerli',
    'optimism-mainnet',
    'optimism-goerli',
    'base-mainnet',
    'base-goerli'
  ],
  
  // Testnet networks (use test wallets)
  testnetNetworks: [
    'ethereum-sepolia',
    'ethereum-goerli', 
    'polygon-mumbai',
    'arbitrum-goerli',
    'optimism-goerli',
    'base-goerli'
  ],
  
  // Faucet URLs for testnets
  faucets: {
    'ethereum-sepolia': 'https://sepoliafaucet.com/',
    'ethereum-goerli': 'https://goerlifaucet.com/',
    'polygon-mumbai': 'https://faucet.polygon.technology/',
    'arbitrum-goerli': 'https://bridge.arbitrum.io/',
    'optimism-goerli': 'https://app.optimism.io/faucet',
    'base-goerli': 'https://www.coinbase.com/faucets/base-ethereum-goerli-faucet'
  },
  
  // Contract verification API keys
  verificationApiKeys: {
    etherscan: process.env.ETHERSCAN_API_KEY,
    polygonscan: process.env.POLYGONSCAN_API_KEY,
    arbiscan: process.env.ARBISCAN_API_KEY,
    optimisticEtherscan: process.env.OPTIMISTIC_ETHERSCAN_API_KEY,
    basescan: process.env.BASESCAN_API_KEY
  }
};

// Validate configuration
const validateConfig = () => {
  const errors = [];
  
  if (deploymentConfig.enableRealDeployment) {
    // Check if private keys are configured
    if (!process.env.TESTNET_DEPLOYER_PRIVATE_KEY) {
      errors.push('TESTNET_DEPLOYER_PRIVATE_KEY not configured');
    }
    
    if (!process.env.DEPLOYER_PRIVATE_KEY) {
      errors.push('DEPLOYER_PRIVATE_KEY not configured (required for mainnet)');
    }
    
    // Check if RPC URLs are configured
    const requiredRpcVars = [
      'ETHEREUM_SEPOLIA_RPC',
      'POLYGON_MUMBAI_RPC'
    ];
    
    requiredRpcVars.forEach(varName => {
      if (!process.env[varName]) {
        errors.push(`${varName} not configured`);
      }
    });
  }
  
  return errors;
};

// Get network-specific configuration
const getNetworkConfig = (chain, network) => {
  const networkKey = `${chain}-${network}`;
  
  if (!deploymentConfig.supportedNetworks.includes(networkKey)) {
    throw new Error(`Unsupported network: ${networkKey}`);
  }
  
  const isTestnet = deploymentConfig.testnetNetworks.includes(networkKey);
  
  return {
    isTestnet,
    faucetUrl: deploymentConfig.faucets[networkKey],
    privateKey: isTestnet 
      ? deploymentConfig.testWallets.deployer 
      : process.env.DEPLOYER_PRIVATE_KEY
  };
};

// Get deployment status message
const getDeploymentStatusMessage = () => {
  if (!deploymentConfig.enableRealDeployment) {
    return '⚠️ Real deployment is DISABLED. Using simulation mode.';
  }
  
  const errors = validateConfig();
  if (errors.length > 0) {
    return `❌ Real deployment is ENABLED but misconfigured: ${errors.join(', ')}`;
  }
  
  return '✅ Real deployment is ENABLED and properly configured.';
};

module.exports = {
  deploymentConfig,
  validateConfig,
  getNetworkConfig,
  getDeploymentStatusMessage
};

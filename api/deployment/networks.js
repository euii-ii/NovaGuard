// Enhanced Vercel serverless function for blockchain networks information
const { withOptionalAuth } = require('../middleware/auth');

// CORS headers helper
const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
};

// Comprehensive blockchain networks configuration
const getNetworksConfig = () => {
  return {
    mainnets: [
      {
        id: 'ethereum',
        name: 'Ethereum Mainnet',
        chainId: 1,
        rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
        explorerUrl: 'https://etherscan.io',
        explorerApiUrl: 'https://api.etherscan.io/api',
        currency: 'ETH',
        testnet: false,
        gasPrice: 'dynamic',
        blockTime: 12,
        features: ['evm', 'smart-contracts', 'defi', 'nft'],
        status: 'active'
      },
      {
        id: 'polygon',
        name: 'Polygon Mainnet',
        chainId: 137,
        rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-mainnet.g.alchemy.com/v2/demo',
        explorerUrl: 'https://polygonscan.com',
        explorerApiUrl: 'https://api.polygonscan.com/api',
        currency: 'MATIC',
        testnet: false,
        gasPrice: 'dynamic',
        blockTime: 2,
        features: ['evm', 'smart-contracts', 'defi', 'nft', 'low-fees'],
        status: 'active'
      },
      {
        id: 'bsc',
        name: 'BNB Smart Chain',
        chainId: 56,
        rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/',
        explorerUrl: 'https://bscscan.com',
        explorerApiUrl: 'https://api.bscscan.com/api',
        currency: 'BNB',
        testnet: false,
        gasPrice: 'dynamic',
        blockTime: 3,
        features: ['evm', 'smart-contracts', 'defi', 'nft'],
        status: 'active'
      },
      {
        id: 'arbitrum',
        name: 'Arbitrum One',
        chainId: 42161,
        rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
        explorerUrl: 'https://arbiscan.io',
        explorerApiUrl: 'https://api.arbiscan.io/api',
        currency: 'ETH',
        testnet: false,
        gasPrice: 'dynamic',
        blockTime: 1,
        features: ['evm', 'smart-contracts', 'defi', 'layer2', 'low-fees'],
        status: 'active'
      },
      {
        id: 'optimism',
        name: 'Optimism',
        chainId: 10,
        rpcUrl: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
        explorerUrl: 'https://optimistic.etherscan.io',
        explorerApiUrl: 'https://api-optimistic.etherscan.io/api',
        currency: 'ETH',
        testnet: false,
        gasPrice: 'dynamic',
        blockTime: 2,
        features: ['evm', 'smart-contracts', 'defi', 'layer2', 'low-fees'],
        status: 'active'
      },
      {
        id: 'base',
        name: 'Base',
        chainId: 8453,
        rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
        explorerUrl: 'https://basescan.org',
        explorerApiUrl: 'https://api.basescan.org/api',
        currency: 'ETH',
        testnet: false,
        gasPrice: 'dynamic',
        blockTime: 2,
        features: ['evm', 'smart-contracts', 'defi', 'layer2', 'coinbase'],
        status: 'active'
      }
    ],
    testnets: [
      {
        id: 'sepolia',
        name: 'Ethereum Sepolia',
        chainId: 11155111,
        rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo',
        explorerUrl: 'https://sepolia.etherscan.io',
        explorerApiUrl: 'https://api-sepolia.etherscan.io/api',
        currency: 'ETH',
        testnet: true,
        gasPrice: 'dynamic',
        blockTime: 12,
        features: ['evm', 'smart-contracts', 'testing'],
        status: 'active',
        faucet: 'https://sepoliafaucet.com'
      },
      {
        id: 'mumbai',
        name: 'Polygon Mumbai',
        chainId: 80001,
        rpcUrl: process.env.POLYGON_MUMBAI_RPC_URL || 'https://polygon-mumbai.g.alchemy.com/v2/demo',
        explorerUrl: 'https://mumbai.polygonscan.com',
        explorerApiUrl: 'https://api-testnet.polygonscan.com/api',
        currency: 'MATIC',
        testnet: true,
        gasPrice: 'dynamic',
        blockTime: 2,
        features: ['evm', 'smart-contracts', 'testing'],
        status: 'active',
        faucet: 'https://faucet.polygon.technology'
      },
      {
        id: 'bsc-testnet',
        name: 'BNB Smart Chain Testnet',
        chainId: 97,
        rpcUrl: process.env.BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/',
        explorerUrl: 'https://testnet.bscscan.com',
        explorerApiUrl: 'https://api-testnet.bscscan.com/api',
        currency: 'BNB',
        testnet: true,
        gasPrice: 'dynamic',
        blockTime: 3,
        features: ['evm', 'smart-contracts', 'testing'],
        status: 'active',
        faucet: 'https://testnet.binance.org/faucet-smart'
      }
    ]
  };
};

const networksHandler = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, chainId } = req.query;
    const auth = req.auth; // Optional auth

    console.log(`Networks request${auth ? ` from user: ${auth.email}` : ' (anonymous)'}`);

    const networksConfig = getNetworksConfig();
    
    // Filter by type if specified
    if (type === 'mainnet') {
      return res.status(200).json({
        type: 'mainnet',
        networks: networksConfig.mainnets,
        count: networksConfig.mainnets.length,
        timestamp: new Date().toISOString()
      });
    }
    
    if (type === 'testnet') {
      return res.status(200).json({
        type: 'testnet',
        networks: networksConfig.testnets,
        count: networksConfig.testnets.length,
        timestamp: new Date().toISOString()
      });
    }

    // Filter by chainId if specified
    if (chainId) {
      const allNetworks = [...networksConfig.mainnets, ...networksConfig.testnets];
      const network = allNetworks.find(n => n.chainId === parseInt(chainId));
      
      if (!network) {
        return res.status(404).json({
          error: 'Network not found',
          chainId: parseInt(chainId),
          timestamp: new Date().toISOString()
        });
      }
      
      return res.status(200).json({
        network,
        timestamp: new Date().toISOString()
      });
    }

    // Return all networks
    res.status(200).json({
      ...networksConfig,
      totalNetworks: networksConfig.mainnets.length + networksConfig.testnets.length,
      supportedFeatures: ['evm', 'smart-contracts', 'defi', 'nft', 'layer2', 'low-fees'],
      timestamp: new Date().toISOString(),
      version: '2.0.0-serverless'
    });
  } catch (error) {
    console.error('Networks API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Export with optional Clerk authentication middleware
module.exports = withOptionalAuth(networksHandler);

// Enhanced Web3 Service for blockchain interactions - migrated from backend
const { withAuth } = require('../middleware/auth');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

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

// CORS headers helper
const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
};

// Web3 Service Class (migrated from backend)
class Web3Service {
  constructor() {
    this.supportedChains = {
      ethereum: {
        name: 'Ethereum Mainnet',
        chainId: 1,
        rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
        explorerUrl: 'https://etherscan.io',
        explorerApiUrl: 'https://api.etherscan.io/api',
        apiKey: process.env.ETHERSCAN_API_KEY || 'demo',
        currency: 'ETH'
      },
      polygon: {
        name: 'Polygon Mainnet',
        chainId: 137,
        rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-mainnet.g.alchemy.com/v2/demo',
        explorerUrl: 'https://polygonscan.com',
        explorerApiUrl: 'https://api.polygonscan.com/api',
        apiKey: process.env.POLYGONSCAN_API_KEY || 'demo',
        currency: 'MATIC'
      },
      bsc: {
        name: 'BNB Smart Chain',
        chainId: 56,
        rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/',
        explorerUrl: 'https://bscscan.com',
        explorerApiUrl: 'https://api.bscscan.com/api',
        apiKey: process.env.BSCSCAN_API_KEY || 'demo',
        currency: 'BNB'
      },
      arbitrum: {
        name: 'Arbitrum One',
        chainId: 42161,
        rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
        explorerUrl: 'https://arbiscan.io',
        explorerApiUrl: 'https://api.arbiscan.io/api',
        apiKey: process.env.ARBISCAN_API_KEY || 'demo',
        currency: 'ETH'
      },
      optimism: {
        name: 'Optimism',
        chainId: 10,
        rpcUrl: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
        explorerUrl: 'https://optimistic.etherscan.io',
        explorerApiUrl: 'https://api-optimistic.etherscan.io/api',
        apiKey: process.env.OPTIMISM_API_KEY || 'demo',
        currency: 'ETH'
      },
      base: {
        name: 'Base',
        chainId: 8453,
        rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
        explorerUrl: 'https://basescan.org',
        explorerApiUrl: 'https://api.basescan.org/api',
        apiKey: process.env.BASESCAN_API_KEY || 'demo',
        currency: 'ETH'
      }
    };
  }

  // Validate Ethereum address (from backend)
  isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  // Check if chain is supported (from backend)
  isChainSupported(chain) {
    return Object.keys(this.supportedChains).includes(chain.toLowerCase());
  }

  // Get supported chains (from backend)
  getSupportedChains() {
    return this.supportedChains;
  }

  // Get contract from blockchain address (from backend)
  async getContractFromAddress(contractAddress, chain = 'ethereum') {
    try {
      const chainConfig = this.supportedChains[chain.toLowerCase()];
      if (!chainConfig) {
        throw new Error(`Unsupported chain: ${chain}`);
      }

      console.log(`Fetching contract from ${chain}: ${contractAddress}`);

      // Get contract source code from block explorer
      const sourceCodeUrl = `${chainConfig.explorerApiUrl}?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${chainConfig.apiKey}`;
      
      const sourceResponse = await axios.get(sourceCodeUrl, { timeout: 10000 });
      
      if (sourceResponse.data.status !== '1') {
        throw new Error('Contract not found or not verified');
      }

      const contractData = sourceResponse.data.result[0];

      // Get contract ABI if available
      let abi = null;
      try {
        if (contractData.ABI && contractData.ABI !== 'Contract source code not verified') {
          abi = JSON.parse(contractData.ABI);
        }
      } catch (error) {
        console.warn('Failed to parse contract ABI:', error.message);
      }

      // Get basic contract info
      const contractInfo = {
        address: contractAddress,
        chain: chain,
        name: contractData.ContractName || 'Unknown',
        compiler: contractData.CompilerVersion || 'Unknown',
        sourceCode: contractData.SourceCode || null,
        abi: abi,
        isVerified: !!contractData.SourceCode && contractData.SourceCode !== '',
        constructorArguments: contractData.ConstructorArguments || '',
        swarmSource: contractData.SwarmSource || '',
        library: contractData.Library || '',
        licenseType: contractData.LicenseType || '',
        proxy: contractData.Proxy || '0',
        implementation: contractData.Implementation || '',
        fetchedAt: new Date().toISOString()
      };

      // Get additional contract statistics
      try {
        const balanceUrl = `${chainConfig.explorerApiUrl}?module=account&action=balance&address=${contractAddress}&tag=latest&apikey=${chainConfig.apiKey}`;
        const balanceResponse = await axios.get(balanceUrl, { timeout: 5000 });
        
        if (balanceResponse.data.status === '1') {
          contractInfo.balance = balanceResponse.data.result;
          contractInfo.balanceEth = (parseInt(balanceResponse.data.result) / 1e18).toFixed(6);
        }
      } catch (error) {
        console.warn('Failed to fetch contract balance:', error.message);
      }

      // Get transaction count
      try {
        const txCountUrl = `${chainConfig.explorerApiUrl}?module=proxy&action=eth_getTransactionCount&address=${contractAddress}&tag=latest&apikey=${chainConfig.apiKey}`;
        const txCountResponse = await axios.get(txCountUrl, { timeout: 5000 });
        
        if (txCountResponse.data.result) {
          contractInfo.transactionCount = parseInt(txCountResponse.data.result, 16);
        }
      } catch (error) {
        console.warn('Failed to fetch transaction count:', error.message);
      }

      return contractInfo;

    } catch (error) {
      console.error('Error fetching contract from blockchain:', error.message);
      throw new Error(`Failed to fetch contract: ${error.message}`);
    }
  }

  // Get contract transactions (from backend)
  async getContractTransactions(contractAddress, chain = 'ethereum', page = 1, offset = 10) {
    try {
      const chainConfig = this.supportedChains[chain.toLowerCase()];
      if (!chainConfig) {
        throw new Error(`Unsupported chain: ${chain}`);
      }

      const txListUrl = `${chainConfig.explorerApiUrl}?module=account&action=txlist&address=${contractAddress}&startblock=0&endblock=99999999&page=${page}&offset=${offset}&sort=desc&apikey=${chainConfig.apiKey}`;
      
      const response = await axios.get(txListUrl, { timeout: 10000 });
      
      if (response.data.status !== '1') {
        return { transactions: [], total: 0 };
      }

      const transactions = response.data.result.map(tx => ({
        hash: tx.hash,
        blockNumber: parseInt(tx.blockNumber),
        timeStamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
        from: tx.from,
        to: tx.to,
        value: tx.value,
        valueEth: (parseInt(tx.value) / 1e18).toFixed(6),
        gas: parseInt(tx.gas),
        gasPrice: tx.gasPrice,
        gasUsed: parseInt(tx.gasUsed),
        isError: tx.isError === '1',
        methodId: tx.methodId,
        functionName: tx.functionName || 'Unknown'
      }));

      return {
        transactions,
        total: transactions.length,
        page,
        offset
      };

    } catch (error) {
      console.error('Error fetching contract transactions:', error.message);
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }
  }

  // Analyze contract bytecode (from backend)
  async analyzeContractBytecode(contractAddress, chain = 'ethereum') {
    try {
      const chainConfig = this.supportedChains[chain.toLowerCase()];
      if (!chainConfig) {
        throw new Error(`Unsupported chain: ${chain}`);
      }

      // Get contract bytecode
      const bytecodeUrl = `${chainConfig.explorerApiUrl}?module=proxy&action=eth_getCode&address=${contractAddress}&tag=latest&apikey=${chainConfig.apiKey}`;
      
      const response = await axios.get(bytecodeUrl, { timeout: 10000 });
      
      if (!response.data.result || response.data.result === '0x') {
        throw new Error('No bytecode found - address is not a contract');
      }

      const bytecode = response.data.result;
      
      // Basic bytecode analysis
      const analysis = {
        address: contractAddress,
        chain: chain,
        bytecode: bytecode,
        size: (bytecode.length - 2) / 2, // Remove 0x prefix and divide by 2
        hasMetadata: bytecode.includes('a264697066735822'), // IPFS hash marker
        hasPausable: bytecode.includes('5c975abb'), // pause() function selector
        hasOwnable: bytecode.includes('8da5cb5b'), // owner() function selector
        hasUpgradeable: bytecode.includes('3659cfe6'), // upgradeTo() function selector
        hasMultisig: bytecode.includes('c6427474'), // confirmTransaction() function selector
        complexity: 'unknown',
        analyzedAt: new Date().toISOString()
      };

      // Estimate complexity based on bytecode size
      if (analysis.size < 1000) {
        analysis.complexity = 'low';
      } else if (analysis.size < 5000) {
        analysis.complexity = 'medium';
      } else {
        analysis.complexity = 'high';
      }

      return analysis;

    } catch (error) {
      console.error('Error analyzing contract bytecode:', error.message);
      throw new Error(`Failed to analyze bytecode: ${error.message}`);
    }
  }

  // Get network status (from backend)
  async getNetworkStatus(chain = 'ethereum') {
    try {
      const chainConfig = this.supportedChains[chain.toLowerCase()];
      if (!chainConfig) {
        throw new Error(`Unsupported chain: ${chain}`);
      }

      // Get latest block number
      const blockUrl = `${chainConfig.explorerApiUrl}?module=proxy&action=eth_blockNumber&apikey=${chainConfig.apiKey}`;
      const blockResponse = await axios.get(blockUrl, { timeout: 5000 });
      
      const latestBlock = blockResponse.data.result ? parseInt(blockResponse.data.result, 16) : null;

      // Get gas price
      const gasPriceUrl = `${chainConfig.explorerApiUrl}?module=proxy&action=eth_gasPrice&apikey=${chainConfig.apiKey}`;
      const gasPriceResponse = await axios.get(gasPriceUrl, { timeout: 5000 });
      
      const gasPrice = gasPriceResponse.data.result ? parseInt(gasPriceResponse.data.result, 16) : null;

      return {
        chain: chain,
        name: chainConfig.name,
        chainId: chainConfig.chainId,
        latestBlock: latestBlock,
        gasPrice: gasPrice,
        gasPriceGwei: gasPrice ? (gasPrice / 1e9).toFixed(2) : null,
        currency: chainConfig.currency,
        explorerUrl: chainConfig.explorerUrl,
        rpcUrl: chainConfig.rpcUrl,
        status: 'healthy',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error getting network status:', error.message);
      return {
        chain: chain,
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Serverless function handler
const web3ServiceHandler = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { userId, email } = req.auth;

  try {
    const web3Service = new Web3Service();

    if (req.method === 'GET') {
      const { action, chain, address, page, offset } = req.query;

      switch (action) {
        case 'chains':
          res.status(200).json({
            success: true,
            chains: web3Service.getSupportedChains(),
            metadata: {
              userId,
              userEmail: email,
              timestamp: new Date().toISOString()
            }
          });
          break;

        case 'network-status':
          const networkStatus = await web3Service.getNetworkStatus(chain || 'ethereum');
          res.status(200).json({
            success: true,
            networkStatus,
            metadata: {
              userId,
              userEmail: email,
              timestamp: new Date().toISOString()
            }
          });
          break;

        case 'contract-info':
          if (!address) {
            return res.status(400).json({
              success: false,
              error: 'Contract address is required'
            });
          }

          const contractInfo = await web3Service.getContractFromAddress(address, chain || 'ethereum');
          res.status(200).json({
            success: true,
            contractInfo,
            metadata: {
              userId,
              userEmail: email,
              timestamp: new Date().toISOString()
            }
          });
          break;

        case 'transactions':
          if (!address) {
            return res.status(400).json({
              success: false,
              error: 'Contract address is required'
            });
          }

          const transactions = await web3Service.getContractTransactions(
            address, 
            chain || 'ethereum', 
            parseInt(page) || 1, 
            parseInt(offset) || 10
          );
          res.status(200).json({
            success: true,
            ...transactions,
            metadata: {
              userId,
              userEmail: email,
              timestamp: new Date().toISOString()
            }
          });
          break;

        case 'bytecode-analysis':
          if (!address) {
            return res.status(400).json({
              success: false,
              error: 'Contract address is required'
            });
          }

          const bytecodeAnalysis = await web3Service.analyzeContractBytecode(address, chain || 'ethereum');
          res.status(200).json({
            success: true,
            bytecodeAnalysis,
            metadata: {
              userId,
              userEmail: email,
              timestamp: new Date().toISOString()
            }
          });
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid action. Supported actions: chains, network-status, contract-info, transactions, bytecode-analysis'
          });
      }
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Web3 service error:', error);
    res.status(500).json({
      success: false,
      error: 'Web3 service failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Export with Clerk authentication middleware
module.exports = withAuth(web3ServiceHandler);

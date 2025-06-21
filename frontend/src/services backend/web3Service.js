const { ethers } = require('ethers');
const logger = require('../../../backend/src/utils/logger');

class Web3Service {
  constructor() {
    this.providers = this.initializeProviders();
    this.supportedChains = {
      ethereum: { chainId: 1, name: 'Ethereum Mainnet' },
      polygon: { chainId: 137, name: 'Polygon Mainnet' },
      bsc: { chainId: 56, name: 'BNB Smart Chain' },
      sepolia: { chainId: 11155111, name: 'Sepolia Testnet' },
      mumbai: { chainId: 80001, name: 'Polygon Mumbai' },
      bscTestnet: { chainId: 97, name: 'BNB Smart Chain Testnet' },
    };
  }

  /**
   * Initialize blockchain providers
   * @returns {Object} Providers for different chains
   */
  initializeProviders() {
    const providers = {};

    try {
      // Ethereum
      if (process.env.ETHEREUM_RPC_URL) {
        providers.ethereum = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
      }

      // Polygon
      if (process.env.POLYGON_RPC_URL) {
        providers.polygon = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
      }

      // BSC
      if (process.env.BSC_RPC_URL) {
        providers.bsc = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL);
      }

      // Testnets
      if (process.env.SEPOLIA_RPC_URL) {
        providers.sepolia = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
      }

      if (process.env.POLYGON_MUMBAI_RPC_URL) {
        providers.mumbai = new ethers.JsonRpcProvider(process.env.POLYGON_MUMBAI_RPC_URL);
      }

      if (process.env.BSC_TESTNET_RPC_URL) {
        providers.bscTestnet = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
      }

      logger.info('Web3 providers initialized', { 
        chains: Object.keys(providers) 
      });

    } catch (error) {
      logger.error('Failed to initialize Web3 providers', { error: error.message });
    }

    return providers;
  }

  /**
   * Get contract source code from blockchain
   * @param {string} contractAddress - Contract address
   * @param {string} chain - Blockchain name
   * @returns {Object} Contract information
   */
  async getContractFromAddress(contractAddress, chain = 'ethereum') {
    try {
      logger.info('Fetching contract from address', { contractAddress, chain });

      // Validate address
      if (!ethers.isAddress(contractAddress)) {
        throw new Error('Invalid contract address format');
      }

      const provider = this.providers[chain];
      if (!provider) {
        throw new Error(`Unsupported chain: ${chain}`);
      }

      // Get contract bytecode
      const bytecode = await provider.getCode(contractAddress);
      
      if (bytecode === '0x') {
        throw new Error('No contract found at this address');
      }

      // Get contract details
      const contractInfo = await this.getContractDetails(contractAddress, provider, chain);

      // Try to get source code from block explorer APIs
      const sourceCode = await this.getSourceCodeFromExplorer(contractAddress, chain);

      return {
        address: contractAddress,
        chain,
        chainId: this.supportedChains[chain]?.chainId,
        bytecode,
        sourceCode,
        ...contractInfo,
        fetchedAt: new Date().toISOString(),
      };

    } catch (error) {
      logger.error('Failed to fetch contract from address', { 
        contractAddress, 
        chain, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get contract details from blockchain
   * @param {string} contractAddress - Contract address
   * @param {Object} provider - Ethers provider
   * @param {string} chain - Chain name
   * @returns {Object} Contract details
   */
  async getContractDetails(contractAddress, provider, chain) {
    try {
      // Get basic contract information
      const [balance, transactionCount] = await Promise.all([
        provider.getBalance(contractAddress),
        provider.getTransactionCount(contractAddress),
      ]);

      // Get latest block for context
      const latestBlock = await provider.getBlockNumber();

      return {
        balance: ethers.formatEther(balance),
        transactionCount,
        latestBlock,
        network: await provider.getNetwork(),
      };

    } catch (error) {
      logger.warn('Failed to get contract details', { 
        contractAddress, 
        chain, 
        error: error.message 
      });
      return {};
    }
  }

  /**
   * Get source code from block explorer APIs
   * @param {string} contractAddress - Contract address
   * @param {string} chain - Chain name
   * @returns {string|null} Source code
   */
  async getSourceCodeFromExplorer(contractAddress, chain) {
    const explorerAPIs = {
      ethereum: {
        url: 'https://api.etherscan.io/api',
        key: process.env.ETHERSCAN_API_KEY,
      },
      polygon: {
        url: 'https://api.polygonscan.com/api',
        key: process.env.POLYGONSCAN_API_KEY,
      },
      bsc: {
        url: 'https://api.bscscan.com/api',
        key: process.env.BSCSCAN_API_KEY,
      },
      sepolia: {
        url: 'https://api-sepolia.etherscan.io/api',
        key: process.env.ETHERSCAN_API_KEY,
      },
    };

    const explorerConfig = explorerAPIs[chain];
    if (!explorerConfig || !explorerConfig.key) {
      logger.warn('No explorer API configuration for chain', { chain });
      return null;
    }

    try {
      const axios = require('axios');
      const response = await axios.get(explorerConfig.url, {
        params: {
          module: 'contract',
          action: 'getsourcecode',
          address: contractAddress,
          apikey: explorerConfig.key,
        },
        timeout: 10000,
      });

      if (response.data.status === '1' && response.data.result[0]) {
        const result = response.data.result[0];
        return {
          sourceCode: result.SourceCode,
          contractName: result.ContractName,
          compilerVersion: result.CompilerVersion,
          optimizationUsed: result.OptimizationUsed,
          runs: result.Runs,
          constructorArguments: result.ConstructorArguments,
          evmVersion: result.EVMVersion,
          library: result.Library,
          licenseType: result.LicenseType,
          proxy: result.Proxy,
          implementation: result.Implementation,
          swarmSource: result.SwarmSource,
        };
      }

      return null;

    } catch (error) {
      logger.warn('Failed to fetch source code from explorer', { 
        contractAddress, 
        chain, 
        error: error.message 
      });
      return null;
    }
  }

  /**
   * Validate contract address format
   * @param {string} address - Address to validate
   * @returns {boolean} Is valid address
   */
  isValidAddress(address) {
    return ethers.isAddress(address);
  }

  /**
   * Get supported chains
   * @returns {Object} Supported chains information
   */
  getSupportedChains() {
    return this.supportedChains;
  }

  /**
   * Check if chain is supported
   * @param {string} chain - Chain name
   * @returns {boolean} Is supported
   */
  isChainSupported(chain) {
    return chain in this.supportedChains && chain in this.providers;
  }

  /**
   * Get provider for chain
   * @param {string} chain - Chain name
   * @returns {Object|null} Provider instance
   */
  getProvider(chain) {
    return this.providers[chain] || null;
  }

  /**
   * Get transaction details
   * @param {string} txHash - Transaction hash
   * @param {string} chain - Chain name
   * @returns {Object} Transaction details
   */
  async getTransaction(txHash, chain = 'ethereum') {
    try {
      const provider = this.providers[chain];
      if (!provider) {
        throw new Error(`Unsupported chain: ${chain}`);
      }

      const [transaction, receipt] = await Promise.all([
        provider.getTransaction(txHash),
        provider.getTransactionReceipt(txHash),
      ]);

      return {
        transaction,
        receipt,
        chain,
        fetchedAt: new Date().toISOString(),
      };

    } catch (error) {
      logger.error('Failed to fetch transaction', { 
        txHash, 
        chain, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get block information
   * @param {number|string} blockNumber - Block number or 'latest'
   * @param {string} chain - Chain name
   * @returns {Object} Block information
   */
  async getBlock(blockNumber, chain = 'ethereum') {
    try {
      const provider = this.providers[chain];
      if (!provider) {
        throw new Error(`Unsupported chain: ${chain}`);
      }

      const block = await provider.getBlock(blockNumber);
      return {
        block,
        chain,
        fetchedAt: new Date().toISOString(),
      };

    } catch (error) {
      logger.error('Failed to fetch block', { 
        blockNumber, 
        chain, 
        error: error.message 
      });
      throw error;
    }
  }
}

module.exports = new Web3Service();

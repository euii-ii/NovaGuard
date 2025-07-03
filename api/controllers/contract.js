// Comprehensive Contract Controller - migrated from backend controllers
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

// Contract Controller Class (from backend)
class ContractController {
  constructor() {
    this.supportedChains = {
      ethereum: {
        name: 'Ethereum Mainnet',
        explorerApiUrl: 'https://api.etherscan.io/api',
        apiKey: process.env.ETHERSCAN_API_KEY || 'demo'
      },
      polygon: {
        name: 'Polygon Mainnet',
        explorerApiUrl: 'https://api.polygonscan.com/api',
        apiKey: process.env.POLYGONSCAN_API_KEY || 'demo'
      },
      bsc: {
        name: 'BNB Smart Chain',
        explorerApiUrl: 'https://api.bscscan.com/api',
        apiKey: process.env.BSCSCAN_API_KEY || 'demo'
      },
      arbitrum: {
        name: 'Arbitrum One',
        explorerApiUrl: 'https://api.arbiscan.io/api',
        apiKey: process.env.ARBISCAN_API_KEY || 'demo'
      },
      optimism: {
        name: 'Optimism',
        explorerApiUrl: 'https://api-optimistic.etherscan.io/api',
        apiKey: process.env.OPTIMISM_API_KEY || 'demo'
      },
      base: {
        name: 'Base',
        explorerApiUrl: 'https://api.basescan.org/api',
        apiKey: process.env.BASESCAN_API_KEY || 'demo'
      }
    };
  }

  // Validate contract address (from backend)
  isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  // Get contract from blockchain (from backend)
  async getContractFromBlockchain(contractAddress, chain = 'ethereum') {
    try {
      const chainConfig = this.supportedChains[chain.toLowerCase()];
      if (!chainConfig) {
        throw new Error(`Unsupported chain: ${chain}`);
      }

      if (!this.isValidAddress(contractAddress)) {
        throw new Error('Invalid contract address format');
      }

      console.log(`Fetching contract from ${chain}: ${contractAddress}`);

      // Get contract source code
      const sourceCodeUrl = `${chainConfig.explorerApiUrl}?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${chainConfig.apiKey}`;
      
      const sourceResponse = await axios.get(sourceCodeUrl, { timeout: 15000 });
      
      if (sourceResponse.data.status !== '1') {
        throw new Error('Contract not found or not verified on blockchain explorer');
      }

      const contractData = sourceResponse.data.result[0];

      if (!contractData.SourceCode || contractData.SourceCode === '') {
        throw new Error('Contract source code is not verified on this blockchain explorer');
      }

      // Parse ABI if available
      let abi = null;
      try {
        if (contractData.ABI && contractData.ABI !== 'Contract source code not verified') {
          abi = JSON.parse(contractData.ABI);
        }
      } catch (error) {
        console.warn('Failed to parse contract ABI:', error.message);
      }

      // Clean up source code (handle multiple files)
      let sourceCode = contractData.SourceCode;
      if (sourceCode.startsWith('{')) {
        try {
          const sourceObj = JSON.parse(sourceCode.slice(1, -1));
          if (sourceObj.sources) {
            // Multiple files - combine them
            sourceCode = Object.values(sourceObj.sources)
              .map(source => source.content)
              .join('\n\n');
          }
        } catch (error) {
          console.warn('Failed to parse multi-file source code, using raw source');
        }
      }

      const contractInfo = {
        address: contractAddress,
        chain: chain,
        name: contractData.ContractName || 'Unknown Contract',
        compiler: contractData.CompilerVersion || 'Unknown',
        sourceCode: sourceCode,
        abi: abi,
        isVerified: true,
        constructorArguments: contractData.ConstructorArguments || '',
        swarmSource: contractData.SwarmSource || '',
        library: contractData.Library || '',
        licenseType: contractData.LicenseType || '',
        proxy: contractData.Proxy === '1',
        implementation: contractData.Implementation || '',
        optimizationUsed: contractData.OptimizationUsed === '1',
        runs: contractData.Runs || '0',
        evmVersion: contractData.EVMVersion || '',
        fetchedAt: new Date().toISOString()
      };

      return {
        success: true,
        contract: contractInfo
      };

    } catch (error) {
      console.error('Error fetching contract from blockchain:', error.message);
      return {
        success: false,
        error: error.message,
        contract: null
      };
    }
  }

  // Store contract in database (from backend)
  async storeContract(contractData, userId) {
    try {
      if (!supabaseAdmin) {
        console.warn('Database not configured, skipping contract storage');
        return { success: true, stored: false };
      }

      const contractRecord = {
        user_id: userId,
        contract_address: contractData.address,
        contract_name: contractData.name,
        chain: contractData.chain,
        source_code: contractData.sourceCode,
        abi: contractData.abi,
        compiler_version: contractData.compiler,
        is_verified: contractData.isVerified,
        is_proxy: contractData.proxy,
        implementation_address: contractData.implementation,
        optimization_used: contractData.optimizationUsed,
        optimization_runs: contractData.runs,
        evm_version: contractData.evmVersion,
        license_type: contractData.licenseType,
        fetched_at: contractData.fetchedAt,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabaseAdmin
        .from('contracts')
        .insert(contractRecord)
        .select()
        .single();

      if (error) {
        console.error('Database storage error:', error);
        return { success: false, error: error.message, stored: false };
      }

      return { success: true, stored: true, record: data };
    } catch (error) {
      console.error('Store contract error:', error);
      return { success: false, error: error.message, stored: false };
    }
  }

  // Get user contracts (from backend)
  async getUserContracts(userId, limit = 20, offset = 0) {
    try {
      if (!supabaseAdmin) {
        return {
          success: true,
          contracts: [],
          total: 0,
          message: 'Database not configured'
        };
      }

      const { data: contracts, error, count } = await supabaseAdmin
        .from('contracts')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        success: true,
        contracts: contracts || [],
        total: count || 0,
        limit,
        offset
      };
    } catch (error) {
      console.error('Get user contracts error:', error);
      return {
        success: false,
        error: error.message,
        contracts: [],
        total: 0
      };
    }
  }

  // Upload contract file (from backend)
  async uploadContractFile(fileData, userId) {
    try {
      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Validate file data
      if (!fileData.content || typeof fileData.content !== 'string') {
        throw new Error('Contract content is required');
      }

      if (fileData.content.length > 1000000) {
        throw new Error('Contract file too large (max 1MB)');
      }

      // Basic Solidity validation
      if (!fileData.content.includes('contract ') && 
          !fileData.content.includes('library ') && 
          !fileData.content.includes('interface ')) {
        throw new Error('No contract, library, or interface declaration found');
      }

      // Store upload record
      if (supabaseAdmin) {
        try {
          await supabaseAdmin
            .from('contract_uploads')
            .insert({
              upload_id: uploadId,
              user_id: userId,
              filename: fileData.filename || 'contract.sol',
              contract_code: fileData.content.substring(0, 1000),
              file_size: fileData.content.length,
              uploaded_at: new Date().toISOString()
            });
        } catch (dbError) {
          console.warn('Database logging failed:', dbError.message);
        }
      }

      return {
        success: true,
        uploadId: uploadId,
        filename: fileData.filename || 'contract.sol',
        size: fileData.content.length,
        content: fileData.content,
        message: 'Contract uploaded successfully'
      };
    } catch (error) {
      console.error('Upload contract file error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get contract statistics (from backend)
  async getContractStatistics(userId) {
    try {
      if (!supabaseAdmin) {
        return {
          success: true,
          statistics: {
            totalContracts: 0,
            verifiedContracts: 0,
            chainDistribution: {},
            recentUploads: 0
          },
          message: 'Database not configured'
        };
      }

      // Get user contracts
      const { data: contracts } = await supabaseAdmin
        .from('contracts')
        .select('*')
        .eq('user_id', userId);

      // Get recent uploads (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentUploads } = await supabaseAdmin
        .from('contract_uploads')
        .select('*')
        .eq('user_id', userId)
        .gte('uploaded_at', sevenDaysAgo.toISOString());

      // Calculate statistics
      const statistics = {
        totalContracts: contracts?.length || 0,
        verifiedContracts: contracts?.filter(c => c.is_verified).length || 0,
        proxyContracts: contracts?.filter(c => c.is_proxy).length || 0,
        chainDistribution: {},
        recentUploads: recentUploads?.length || 0,
        totalUploads: 0
      };

      // Calculate chain distribution
      contracts?.forEach(contract => {
        const chain = contract.chain || 'unknown';
        statistics.chainDistribution[chain] = (statistics.chainDistribution[chain] || 0) + 1;
      });

      // Get total uploads
      const { count: totalUploads } = await supabaseAdmin
        .from('contract_uploads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      statistics.totalUploads = totalUploads || 0;

      return {
        success: true,
        statistics: statistics
      };
    } catch (error) {
      console.error('Get contract statistics error:', error);
      return {
        success: false,
        error: error.message,
        statistics: {}
      };
    }
  }
}

// Serverless function handler
const contractControllerHandler = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { userId, email } = req.auth;

  try {
    const contractController = new ContractController();

    if (req.method === 'GET') {
      const { action, address, chain, limit, offset } = req.query;

      switch (action) {
        case 'fetch':
          if (!address) {
            return res.status(400).json({
              success: false,
              error: 'Contract address is required'
            });
          }

          console.log(`Fetching contract ${address} on ${chain || 'ethereum'} for user: ${email} (${userId})`);
          
          const fetchResult = await contractController.getContractFromBlockchain(address, chain || 'ethereum');
          
          // Store contract if fetch was successful
          if (fetchResult.success && fetchResult.contract) {
            const storeResult = await contractController.storeContract(fetchResult.contract, userId);
            fetchResult.stored = storeResult.stored;
          }
          
          fetchResult.metadata = {
            userId,
            userEmail: email,
            timestamp: new Date().toISOString()
          };
          
          res.status(200).json(fetchResult);
          break;

        case 'list':
          console.log(`Listing contracts for user: ${email} (${userId})`);
          
          const listResult = await contractController.getUserContracts(
            userId, 
            parseInt(limit) || 20, 
            parseInt(offset) || 0
          );
          
          listResult.metadata = {
            userId,
            userEmail: email,
            timestamp: new Date().toISOString()
          };
          
          res.status(200).json(listResult);
          break;

        case 'statistics':
          console.log(`Getting contract statistics for user: ${email} (${userId})`);
          
          const statsResult = await contractController.getContractStatistics(userId);
          
          statsResult.metadata = {
            userId,
            userEmail: email,
            timestamp: new Date().toISOString()
          };
          
          res.status(200).json(statsResult);
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid action. Supported actions: fetch, list, statistics'
          });
      }
    } else if (req.method === 'POST') {
      const { action, fileData, filename, content } = req.body;

      switch (action) {
        case 'upload':
          if (!content) {
            return res.status(400).json({
              success: false,
              error: 'Contract content is required'
            });
          }

          console.log(`Uploading contract file for user: ${email} (${userId})`);
          
          const uploadData = {
            content: content,
            filename: filename || 'contract.sol'
          };
          
          const uploadResult = await contractController.uploadContractFile(uploadData, userId);
          
          uploadResult.metadata = {
            userId,
            userEmail: email,
            timestamp: new Date().toISOString()
          };
          
          res.status(200).json(uploadResult);
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid action. Supported actions: upload'
          });
      }
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Contract controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Contract controller failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Export with Clerk authentication middleware
module.exports = withAuth(contractControllerHandler);

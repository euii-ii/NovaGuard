import axios from 'axios';

export interface DeploymentConfig {
  contractName: string;
  contractCode: string;
  constructorArgs?: any[];
  network: string;
  gasLimit?: number;
  gasPrice?: string;
  value?: string;
}

export interface DeploymentResult {
  success: boolean;
  transactionHash?: string;
  contractAddress?: string;
  gasUsed?: number;
  error?: string;
  explorerUrl?: string;
}

export interface NetworkConfig {
  id: string;
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  currency: string;
  testnet: boolean;
}

class DeploymentService {
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
  }

  // Get supported networks for deployment
  async getSupportedNetworks(): Promise<NetworkConfig[]> {
    try {
      const response = await axios.get(`${this.baseURL}/api/v1/deployment/networks`);
      return response.data.networks;
    } catch (error) {
      console.error('Failed to fetch supported networks:', error);
      // Return default networks if API fails
      return this.getDefaultNetworks();
    }
  }

  // Deploy contract to specified network
  async deployContract(config: DeploymentConfig): Promise<DeploymentResult> {
    try {
      const response = await axios.post(`${this.baseURL}/api/v1/deployment/deploy`, {
        contractName: config.contractName,
        contractCode: config.contractCode,
        constructorArgs: config.constructorArgs || [],
        network: config.network,
        gasLimit: config.gasLimit,
        gasPrice: config.gasPrice,
        value: config.value
      });

      return {
        success: true,
        transactionHash: response.data.transactionHash,
        contractAddress: response.data.contractAddress,
        gasUsed: response.data.gasUsed,
        explorerUrl: response.data.explorerUrl
      };
    } catch (error: any) {
      console.error('Deployment failed:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Deployment failed'
      };
    }
  }

  // Estimate gas for deployment
  async estimateGas(config: Omit<DeploymentConfig, 'gasLimit' | 'gasPrice'>): Promise<{
    gasEstimate: number;
    gasPriceRecommendation: string;
    estimatedCost: string;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/v1/deployment/estimate-gas`, {
        contractName: config.contractName,
        contractCode: config.contractCode,
        constructorArgs: config.constructorArgs || [],
        network: config.network,
        value: config.value
      });

      return response.data;
    } catch (error: any) {
      console.error('Gas estimation failed:', error);
      throw new Error(error.response?.data?.error || 'Gas estimation failed');
    }
  }

  // Verify contract on block explorer
  async verifyContract(contractAddress: string, network: string, sourceCode: string): Promise<{
    success: boolean;
    verificationUrl?: string;
    error?: string;
  }> {
    try {
      const response = await axios.post(`${this.baseURL}/api/v1/deployment/verify`, {
        contractAddress,
        network,
        sourceCode
      });

      return {
        success: true,
        verificationUrl: response.data.verificationUrl
      };
    } catch (error: any) {
      console.error('Contract verification failed:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Verification failed'
      };
    }
  }

  // Get deployment history
  async getDeploymentHistory(): Promise<Array<{
    id: string;
    contractName: string;
    contractAddress: string;
    network: string;
    transactionHash: string;
    deployedAt: string;
    status: 'success' | 'failed' | 'pending';
  }>> {
    try {
      const response = await axios.get(`${this.baseURL}/api/v1/deployment/history`);
      return response.data.deployments;
    } catch (error) {
      console.error('Failed to fetch deployment history:', error);
      return [];
    }
  }

  // Get default networks configuration
  private getDefaultNetworks(): NetworkConfig[] {
    return [
      {
        id: 'ethereum',
        name: 'Ethereum Mainnet',
        chainId: 1,
        rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/demo',
        explorerUrl: 'https://etherscan.io',
        currency: 'ETH',
        testnet: false
      },
      {
        id: 'sepolia',
        name: 'Ethereum Sepolia',
        chainId: 11155111,
        rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/demo',
        explorerUrl: 'https://sepolia.etherscan.io',
        currency: 'ETH',
        testnet: true
      },
      {
        id: 'polygon',
        name: 'Polygon Mainnet',
        chainId: 137,
        rpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2/demo',
        explorerUrl: 'https://polygonscan.com',
        currency: 'MATIC',
        testnet: false
      },
      {
        id: 'mumbai',
        name: 'Polygon Mumbai',
        chainId: 80001,
        rpcUrl: 'https://polygon-mumbai.g.alchemy.com/v2/demo',
        explorerUrl: 'https://mumbai.polygonscan.com',
        currency: 'MATIC',
        testnet: true
      },
      {
        id: 'bsc',
        name: 'BNB Smart Chain',
        chainId: 56,
        rpcUrl: 'https://bsc-dataseed.binance.org',
        explorerUrl: 'https://bscscan.com',
        currency: 'BNB',
        testnet: false
      },
      {
        id: 'bsc-testnet',
        name: 'BNB Testnet',
        chainId: 97,
        rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
        explorerUrl: 'https://testnet.bscscan.com',
        currency: 'BNB',
        testnet: true
      }
    ];
  }
}

export const deploymentService = new DeploymentService();
export default deploymentService;

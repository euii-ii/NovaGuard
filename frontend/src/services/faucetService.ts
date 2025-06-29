// Faucet Service for FlashAudit - Automated Testnet Token Distribution
export interface FaucetConfig {
  name: string;
  chainId: number;
  currency: string;
  faucetUrl: string;
  apiEndpoint?: string;
  maxAmount: number;
  cooldownHours: number;
  requiresAuth: boolean;
}

export interface FaucetResult {
  success: boolean;
  amount?: string;
  transactionHash?: string;
  message: string;
  cooldownRemaining?: number;
  error?: string;
}

export class FaucetService {
  private static faucets: { [key: string]: FaucetConfig } = {
    sepolia: {
      name: 'Sepolia Testnet',
      chainId: 11155111,
      currency: 'SepoliaETH',
      faucetUrl: 'https://sepoliafaucet.com',
      apiEndpoint: 'https://api.sepoliafaucet.com/request',
      maxAmount: 0.5,
      cooldownHours: 24,
      requiresAuth: false
    },
    goerli: {
      name: 'Goerli Testnet',
      chainId: 5,
      currency: 'GoerliETH',
      faucetUrl: 'https://goerlifaucet.com',
      apiEndpoint: 'https://api.goerlifaucet.com/request',
      maxAmount: 0.25,
      cooldownHours: 24,
      requiresAuth: false
    },
    mumbai: {
      name: 'Polygon Mumbai',
      chainId: 80001,
      currency: 'MATIC',
      faucetUrl: 'https://faucet.polygon.technology',
      apiEndpoint: 'https://api.polygon.technology/faucet',
      maxAmount: 1.0,
      cooldownHours: 24,
      requiresAuth: true
    },
    'arbitrum-goerli': {
      name: 'Arbitrum Goerli',
      chainId: 421613,
      currency: 'AGOR',
      faucetUrl: 'https://bridge.arbitrum.io',
      maxAmount: 0.1,
      cooldownHours: 24,
      requiresAuth: false
    },
    'optimism-goerli': {
      name: 'Optimism Goerli',
      chainId: 420,
      currency: 'OpETH',
      faucetUrl: 'https://app.optimism.io/faucet',
      maxAmount: 0.2,
      cooldownHours: 24,
      requiresAuth: false
    }
  };

  private static lastRequestTimes: { [key: string]: number } = {};

  static getFaucet(network: string): FaucetConfig | null {
    return this.faucets[network] || null;
  }

  static getAllFaucets(): { [key: string]: FaucetConfig } {
    return this.faucets;
  }

  static async requestTokens(
    network: string,
    walletAddress: string,
    userEmail?: string
  ): Promise<FaucetResult> {
    try {
      const faucet = this.getFaucet(network);
      if (!faucet) {
        return {
          success: false,
          message: `Faucet not available for network: ${network}`,
          error: 'Network not supported'
        };
      }

      // Check cooldown
      const cooldownKey = `${network}-${walletAddress}`;
      const lastRequest = this.lastRequestTimes[cooldownKey];
      const now = Date.now();
      const cooldownMs = faucet.cooldownHours * 60 * 60 * 1000;

      if (lastRequest && (now - lastRequest) < cooldownMs) {
        const remainingMs = cooldownMs - (now - lastRequest);
        const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
        
        return {
          success: false,
          message: `Cooldown active. Try again in ${remainingHours} hours.`,
          cooldownRemaining: remainingHours,
          error: 'Cooldown active'
        };
      }

      // Validate wallet address
      if (!this.isValidAddress(walletAddress)) {
        return {
          success: false,
          message: 'Invalid wallet address format',
          error: 'Invalid address'
        };
      }

      // Simulate faucet request
      const result = await this.simulateFaucetRequest(faucet, walletAddress, userEmail);
      
      if (result.success) {
        // Update last request time
        this.lastRequestTimes[cooldownKey] = now;
      }

      return result;

    } catch (error: any) {
      return {
        success: false,
        message: `Faucet request failed: ${error.message}`,
        error: error.message
      };
    }
  }

  private static async simulateFaucetRequest(
    faucet: FaucetConfig,
    walletAddress: string,
    userEmail?: string
  ): Promise<FaucetResult> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate success/failure (90% success rate)
    const isSuccess = Math.random() > 0.1;

    if (!isSuccess) {
      const errors = [
        'Faucet temporarily unavailable',
        'Daily limit exceeded',
        'Network congestion',
        'Invalid request'
      ];
      const randomError = errors[Math.floor(Math.random() * errors.length)];
      
      return {
        success: false,
        message: randomError,
        error: randomError
      };
    }

    // Generate random amount within limits
    const amount = (Math.random() * faucet.maxAmount * 0.8 + faucet.maxAmount * 0.2).toFixed(4);
    const transactionHash = `0x${Math.random().toString(16).substring(2, 66)}`;

    return {
      success: true,
      amount: `${amount} ${faucet.currency}`,
      transactionHash,
      message: `Successfully sent ${amount} ${faucet.currency} to ${walletAddress}`
    };
  }

  private static isValidAddress(address: string): boolean {
    // Basic Ethereum address validation
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  static async checkFaucetStatus(network: string): Promise<{
    available: boolean;
    message: string;
    estimatedWaitTime?: string;
  }> {
    const faucet = this.getFaucet(network);
    if (!faucet) {
      return {
        available: false,
        message: 'Faucet not available for this network'
      };
    }

    // Simulate status check
    await new Promise(resolve => setTimeout(resolve, 500));

    const isAvailable = Math.random() > 0.2; // 80% uptime
    
    if (isAvailable) {
      return {
        available: true,
        message: `${faucet.name} faucet is operational`,
        estimatedWaitTime: '1-2 minutes'
      };
    } else {
      return {
        available: false,
        message: `${faucet.name} faucet is temporarily unavailable`,
        estimatedWaitTime: '10-30 minutes'
      };
    }
  }

  static getCooldownStatus(network: string, walletAddress: string): {
    inCooldown: boolean;
    remainingHours?: number;
    nextRequestTime?: Date;
  } {
    const faucet = this.getFaucet(network);
    if (!faucet) {
      return { inCooldown: false };
    }

    const cooldownKey = `${network}-${walletAddress}`;
    const lastRequest = this.lastRequestTimes[cooldownKey];
    
    if (!lastRequest) {
      return { inCooldown: false };
    }

    const now = Date.now();
    const cooldownMs = faucet.cooldownHours * 60 * 60 * 1000;
    const timeSinceLastRequest = now - lastRequest;

    if (timeSinceLastRequest >= cooldownMs) {
      return { inCooldown: false };
    }

    const remainingMs = cooldownMs - timeSinceLastRequest;
    const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
    const nextRequestTime = new Date(lastRequest + cooldownMs);

    return {
      inCooldown: true,
      remainingHours,
      nextRequestTime
    };
  }

  static async getMultipleFaucetTokens(
    networks: string[],
    walletAddress: string,
    userEmail?: string
  ): Promise<{ [network: string]: FaucetResult }> {
    const results: { [network: string]: FaucetResult } = {};

    // Process requests sequentially to avoid rate limiting
    for (const network of networks) {
      results[network] = await this.requestTokens(network, walletAddress, userEmail);
      
      // Add delay between requests
      if (networks.indexOf(network) < networks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  static getRecommendedTestnets(): string[] {
    return ['sepolia', 'mumbai', 'arbitrum-goerli'];
  }

  static getFaucetInstructions(network: string): {
    steps: string[];
    tips: string[];
    troubleshooting: string[];
  } {
    const faucet = this.getFaucet(network);
    if (!faucet) {
      return {
        steps: ['Network not supported'],
        tips: [],
        troubleshooting: []
      };
    }

    return {
      steps: [
        'Connect your wallet (MetaMask recommended)',
        `Switch to ${faucet.name}`,
        `Run: faucet ${network}`,
        'Wait for transaction confirmation',
        'Check your wallet balance'
      ],
      tips: [
        `Maximum ${faucet.maxAmount} ${faucet.currency} per request`,
        `${faucet.cooldownHours} hour cooldown between requests`,
        'Use testnet tokens for development only',
        'Keep some tokens for gas fees'
      ],
      troubleshooting: [
        'Ensure wallet is connected',
        'Check network connection',
        'Verify correct network selected',
        'Wait for cooldown period to expire',
        `Visit ${faucet.faucetUrl} for manual requests`
      ]
    };
  }
}

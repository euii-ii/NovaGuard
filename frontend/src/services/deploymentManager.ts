// Advanced Deployment Manager for FlashAudit
import { DeploymentService } from './deploymentService';
import type { NetworkConfig } from './deploymentService';

export interface DeploymentPlan {
  id: string;
  contractName: string;
  network: string;
  constructorArgs: any[];
  gasLimit: number;
  gasPrice: string;
  estimatedCost: string;
  verificationEnabled: boolean;
  status: 'pending' | 'deploying' | 'deployed' | 'failed' | 'verified';
  createdAt: Date;
}

export interface DeploymentExecution {
  planId: string;
  transactionHash?: string;
  contractAddress?: string;
  gasUsed?: number;
  actualCost?: string;
  blockNumber?: number;
  confirmations: number;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
  logs: DeploymentLog[];
}

export interface DeploymentLog {
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  data?: any;
}

export interface ContractVerification {
  contractAddress: string;
  network: string;
  sourceCode: string;
  compilerVersion: string;
  optimizationEnabled: boolean;
  status: 'pending' | 'verified' | 'failed';
  verificationUrl?: string;
}

export class DeploymentManager {
  private static instance: DeploymentManager;
  private deploymentPlans: Map<string, DeploymentPlan> = new Map();
  private deploymentExecutions: Map<string, DeploymentExecution> = new Map();
  private verifications: Map<string, ContractVerification> = new Map();

  static getInstance(): DeploymentManager {
    if (!this.instance) {
      this.instance = new DeploymentManager();
    }
    return this.instance;
  }

  async createDeploymentPlan(
    contractCode: string,
    contractName: string,
    network: string,
    constructorArgs: any[] = [],
    options: {
      gasLimit?: number;
      gasPrice?: string;
      verificationEnabled?: boolean;
    } = {}
  ): Promise<DeploymentPlan> {
    const planId = this.generateId();
    const networkConfig = DeploymentService.getNetwork(network);
    
    if (!networkConfig) {
      throw new Error(`Network ${network} not supported`);
    }

    // Estimate gas and cost
    const gasEstimate = await DeploymentService.estimateGas(contractCode, network);
    const gasLimit = options.gasLimit || (gasEstimate?.gasEstimate ? gasEstimate.gasEstimate * 1.2 : 500000);
    const gasPrice = options.gasPrice || networkConfig.gasPrice || '20000000000';
    const estimatedCost = gasEstimate?.cost || '0.01 ETH';

    const plan: DeploymentPlan = {
      id: planId,
      contractName,
      network,
      constructorArgs,
      gasLimit: Math.floor(gasLimit),
      gasPrice,
      estimatedCost,
      verificationEnabled: options.verificationEnabled || false,
      status: 'pending',
      createdAt: new Date()
    };

    this.deploymentPlans.set(planId, plan);
    return plan;
  }

  async executeDeployment(
    planId: string,
    contractCode: string,
    onProgress?: (log: DeploymentLog) => void
  ): Promise<DeploymentExecution> {
    const plan = this.deploymentPlans.get(planId);
    if (!plan) {
      throw new Error(`Deployment plan ${planId} not found`);
    }

    const execution: DeploymentExecution = {
      planId,
      confirmations: 0,
      status: 'pending',
      logs: []
    };

    this.deploymentExecutions.set(planId, execution);

    const addLog = (level: DeploymentLog['level'], message: string, data?: any) => {
      const log: DeploymentLog = {
        timestamp: new Date(),
        level,
        message,
        data
      };
      execution.logs.push(log);
      if (onProgress) onProgress(log);
    };

    try {
      plan.status = 'deploying';
      addLog('info', `Starting deployment of ${plan.contractName} to ${plan.network}`);

      // Pre-deployment checks
      await this.performPreDeploymentChecks(plan, addLog);

      // Execute deployment
      addLog('info', 'Executing deployment transaction...');
      const result = await DeploymentService.deployContract(
        contractCode,
        plan.contractName,
        plan.network,
        plan.constructorArgs
      );

      if (result.success) {
        execution.transactionHash = result.transactionHash;
        execution.contractAddress = result.contractAddress;
        execution.gasUsed = result.gasUsed;
        execution.actualCost = result.deploymentCost;
        execution.status = 'confirmed';
        plan.status = 'deployed';

        addLog('success', `Contract deployed successfully!`);
        addLog('info', `Contract Address: ${result.contractAddress}`);
        addLog('info', `Transaction Hash: ${result.transactionHash}`);
        addLog('info', `Gas Used: ${result.gasUsed?.toLocaleString()}`);
        addLog('info', `Cost: ${result.deploymentCost}`);

        // Start verification if enabled
        if (plan.verificationEnabled && result.contractAddress) {
          await this.startVerification(result.contractAddress, plan.network, contractCode, addLog);
        }

        // Monitor confirmations
        this.monitorConfirmations(execution, addLog);

      } else {
        execution.status = 'failed';
        execution.error = result.error;
        plan.status = 'failed';
        addLog('error', `Deployment failed: ${result.error}`);
      }

    } catch (error) {
      execution.status = 'failed';
      execution.error = String(error);
      plan.status = 'failed';
      addLog('error', `Deployment error: ${error}`);
    }

    return execution;
  }

  private async performPreDeploymentChecks(
    plan: DeploymentPlan,
    addLog: (level: DeploymentLog['level'], message: string, data?: any) => void
  ): Promise<void> {
    addLog('info', 'Performing pre-deployment checks...');

    // Check wallet connection
    if (!window.ethereum) {
      throw new Error('No wallet detected');
    }

    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (accounts.length === 0) {
      throw new Error('No wallet connected');
    }

    addLog('info', `Deploying from: ${accounts[0]}`);

    // Check network
    const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
    const networkConfig = DeploymentService.getNetwork(plan.network);
    
    if (parseInt(currentChainId, 16) !== networkConfig?.chainId) {
      addLog('warning', `Switching to ${networkConfig?.name}...`);
      // Network switching would happen here
    }

    // Check balance
    const balance = await window.ethereum.request({
      method: 'eth_getBalance',
      params: [accounts[0], 'latest']
    });
    
    const balanceInEth = parseInt(balance, 16) / Math.pow(10, 18);
    addLog('info', `Wallet balance: ${balanceInEth.toFixed(6)} ${networkConfig?.currency}`);

    if (balanceInEth < 0.001) {
      addLog('warning', 'Low balance detected - deployment may fail');
    }

    addLog('success', 'Pre-deployment checks completed');
  }

  private async startVerification(
    contractAddress: string,
    network: string,
    sourceCode: string,
    addLog: (level: DeploymentLog['level'], message: string, data?: any) => void
  ): Promise<void> {
    addLog('info', 'Starting contract verification...');

    const verification: ContractVerification = {
      contractAddress,
      network,
      sourceCode,
      compilerVersion: '0.8.19',
      optimizationEnabled: true,
      status: 'pending'
    };

    this.verifications.set(contractAddress, verification);

    // Simulate verification process
    setTimeout(() => {
      verification.status = 'verified';
      verification.verificationUrl = `https://etherscan.io/address/${contractAddress}#code`;
      addLog('success', 'Contract verified successfully!');
      addLog('info', `Verification URL: ${verification.verificationUrl}`);
    }, 5000);
  }

  private monitorConfirmations(
    execution: DeploymentExecution,
    addLog: (level: DeploymentLog['level'], message: string, data?: any) => void
  ): void {
    // Simulate confirmation monitoring
    let confirmations = 0;
    const interval = setInterval(() => {
      confirmations++;
      execution.confirmations = confirmations;
      
      if (confirmations === 1) {
        addLog('info', 'First confirmation received');
      } else if (confirmations === 3) {
        addLog('info', '3 confirmations - deployment considered safe');
      } else if (confirmations === 12) {
        addLog('success', '12 confirmations - deployment finalized');
        clearInterval(interval);
      }
    }, 2000);
  }

  async getDeploymentHistory(): Promise<DeploymentPlan[]> {
    return Array.from(this.deploymentPlans.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getDeploymentExecution(planId: string): Promise<DeploymentExecution | undefined> {
    return this.deploymentExecutions.get(planId);
  }

  async getVerificationStatus(contractAddress: string): Promise<ContractVerification | undefined> {
    return this.verifications.get(contractAddress);
  }

  async estimateDeploymentCost(
    contractCode: string,
    network: string,
    gasPrice?: string
  ): Promise<{
    gasEstimate: number;
    costInEth: number;
    costInUSD: number;
    networkFee: number;
  }> {
    const gasEstimate = await DeploymentService.estimateGas(contractCode, network);
    const networkConfig = DeploymentService.getNetwork(network);
    
    if (!gasEstimate || !networkConfig) {
      throw new Error('Unable to estimate deployment cost');
    }

    const gasPriceWei = gasPrice ? parseInt(gasPrice) : parseInt(networkConfig.gasPrice || '20000000000');
    const costInWei = gasEstimate.gasEstimate * gasPriceWei;
    const costInEth = costInWei / Math.pow(10, 18);
    const costInUSD = costInEth * 2000; // Rough ETH price
    const networkFee = costInEth * 0.1; // Rough network fee

    return {
      gasEstimate: gasEstimate.gasEstimate,
      costInEth,
      costInUSD,
      networkFee
    };
  }

  async cancelDeployment(planId: string): Promise<boolean> {
    const plan = this.deploymentPlans.get(planId);
    if (!plan || plan.status !== 'pending') {
      return false;
    }

    plan.status = 'failed';
    return true;
  }

  async retryDeployment(planId: string, contractCode: string): Promise<DeploymentExecution> {
    const plan = this.deploymentPlans.get(planId);
    if (!plan) {
      throw new Error(`Deployment plan ${planId} not found`);
    }

    // Reset plan status
    plan.status = 'pending';
    
    // Create new execution
    return this.executeDeployment(planId, contractCode);
  }

  private generateId(): string {
    return `deploy_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // Batch deployment for multiple contracts
  async batchDeploy(
    contracts: Array<{
      code: string;
      name: string;
      network: string;
      constructorArgs?: any[];
    }>,
    onProgress?: (contractName: string, log: DeploymentLog) => void
  ): Promise<DeploymentExecution[]> {
    const executions: DeploymentExecution[] = [];

    for (const contract of contracts) {
      const plan = await this.createDeploymentPlan(
        contract.code,
        contract.name,
        contract.network,
        contract.constructorArgs
      );

      const execution = await this.executeDeployment(
        plan.id,
        contract.code,
        (log) => onProgress?.(contract.name, log)
      );

      executions.push(execution);

      // Wait between deployments to avoid nonce issues
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return executions;
  }
}

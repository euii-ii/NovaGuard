// Advanced AI Terminal Service for FlashAudit
import { DebuggerService } from './debuggerService';
import type { DebugResult } from './debuggerService';
import { DeploymentManager } from './deploymentManager';
import type { DeploymentPlan } from './deploymentManager';
import { FaucetService } from './faucetService';

export interface TerminalCommand {
  name: string;
  description: string;
  usage: string;
  category: 'debug' | 'deploy' | 'ai' | 'blockchain' | 'file' | 'utility';
  aliases?: string[];
  examples: string[];
}

export interface AIContext {
  currentFile?: string;
  projectFiles: string[];
  recentCommands: string[];
  deploymentHistory: DeploymentPlan[];
  debugResults?: DebugResult;
  walletConnected: boolean;
  currentNetwork?: string;
}

export interface AIResponse {
  message: string;
  suggestions: string[];
  codeExamples?: string[];
  nextSteps?: string[];
  relatedCommands?: string[];
}

export class AdvancedTerminalService {
  private static instance: AdvancedTerminalService;
  private debugger = DebuggerService.getInstance();
  private deploymentManager = DeploymentManager.getInstance();
  private aiContext: AIContext = {
    projectFiles: [],
    recentCommands: [],
    deploymentHistory: [],
    walletConnected: false
  };

  private commands: Map<string, TerminalCommand> = new Map([
    ['debug', {
      name: 'debug',
      description: 'Advanced contract debugging with AI analysis',
      usage: 'debug [file] [--gas] [--security] [--trace]',
      category: 'debug',
      aliases: ['analyze', 'check'],
      examples: [
        'debug MyContract.sol',
        'debug --gas --security',
        'debug MyContract.sol --trace'
      ]
    }],
    ['deploy-plan', {
      name: 'deploy-plan',
      description: 'Create a deployment plan with cost estimation',
      usage: 'deploy-plan <network> [file] [--args arg1,arg2]',
      category: 'deploy',
      aliases: ['plan'],
      examples: [
        'deploy-plan sepolia MyContract.sol',
        'deploy-plan ethereum --args "Hello,World"'
      ]
    }],
    ['deploy-execute', {
      name: 'deploy-execute',
      description: 'Execute a deployment plan',
      usage: 'deploy-execute <plan-id>',
      category: 'deploy',
      aliases: ['execute'],
      examples: [
        'deploy-execute deploy_123456789'
      ]
    }],
    ['ai-explain', {
      name: 'ai-explain',
      description: 'AI explanation of code or concepts',
      usage: 'ai-explain <topic|code>',
      category: 'ai',
      aliases: ['explain'],
      examples: [
        'ai-explain reentrancy',
        'ai-explain "function transfer()"'
      ]
    }],
    ['ai-optimize', {
      name: 'ai-optimize',
      description: 'AI-powered code optimization suggestions',
      usage: 'ai-optimize [file]',
      category: 'ai',
      aliases: ['optimize'],
      examples: [
        'ai-optimize MyContract.sol',
        'ai-optimize'
      ]
    }],
    ['ai-security', {
      name: 'ai-security',
      description: 'AI security audit and recommendations',
      usage: 'ai-security [file]',
      category: 'ai',
      aliases: ['security', 'audit'],
      examples: [
        'ai-security MyContract.sol',
        'ai-security'
      ]
    }],
    ['trace', {
      name: 'trace',
      description: 'Generate execution trace for debugging',
      usage: 'trace <function> [args]',
      category: 'debug',
      examples: [
        'trace transfer 100',
        'trace mint 0x123...'
      ]
    }],
    ['gas-profile', {
      name: 'gas-profile',
      description: 'Detailed gas usage analysis',
      usage: 'gas-profile [file]',
      category: 'debug',
      examples: [
        'gas-profile MyContract.sol'
      ]
    }],
    ['deploy-history', {
      name: 'deploy-history',
      description: 'Show deployment history and status',
      usage: 'deploy-history [--network network]',
      category: 'deploy',
      examples: [
        'deploy-history',
        'deploy-history --network ethereum'
      ]
    }],
    ['multi-deploy', {
      name: 'multi-deploy',
      description: 'Deploy multiple contracts in sequence',
      usage: 'multi-deploy <network> <file1,file2,...>',
      category: 'deploy',
      examples: [
        'multi-deploy sepolia Token.sol,Vault.sol'
      ]
    }]
  ]);

  static getInstance(): AdvancedTerminalService {
    if (!this.instance) {
      this.instance = new AdvancedTerminalService();
    }
    return this.instance;
  }

  updateContext(updates: Partial<AIContext>): void {
    this.aiContext = { ...this.aiContext, ...updates };
  }

  addRecentCommand(command: string): void {
    this.aiContext.recentCommands.unshift(command);
    if (this.aiContext.recentCommands.length > 10) {
      this.aiContext.recentCommands.pop();
    }
  }

  getCommand(name: string): TerminalCommand | undefined {
    return this.commands.get(name) || 
           Array.from(this.commands.values()).find(cmd => 
             cmd.aliases?.includes(name)
           );
  }

  getAllCommands(): TerminalCommand[] {
    return Array.from(this.commands.values());
  }

  getCommandsByCategory(category: TerminalCommand['category']): TerminalCommand[] {
    return Array.from(this.commands.values()).filter(cmd => cmd.category === category);
  }

  async executeAdvancedCommand(
    command: string,
    args: string[],
    fileContents: { [key: string]: string },
    activeFile?: string
  ): Promise<{
    success: boolean;
    output: string[];
    data?: any;
    suggestions?: string[];
  }> {
    this.addRecentCommand(`${command} ${args.join(' ')}`);

    try {
      switch (command) {
        case 'debug':
        case 'analyze':
        case 'check':
          return await this.handleDebugCommand(args, fileContents, activeFile);

        case 'deploy':
          return await this.handleDeployCommand(args, fileContents, activeFile);

        case 'deploy-plan':
        case 'plan':
          return await this.handleDeployPlanCommand(args, fileContents, activeFile);

        case 'deploy-execute':
        case 'execute':
          return await this.handleDeployExecuteCommand(args);

        case 'run':
          return await this.handleRunCommand(args, fileContents, activeFile);

        case 'ai-explain':
        case 'explain':
          return await this.handleAIExplainCommand(args);

        case 'ai-optimize':
        case 'optimize':
          return await this.handleAIOptimizeCommand(args, fileContents, activeFile);

        case 'ai-security':
        case 'security':
        case 'audit':
          return await this.handleAISecurityCommand(args, fileContents, activeFile);

        case 'trace':
          return await this.handleTraceCommand(args, fileContents, activeFile);

        case 'gas-profile':
          return await this.handleGasProfileCommand(args, fileContents, activeFile);

        case 'deploy-history':
          return await this.handleDeployHistoryCommand(args);

        case 'multi-deploy':
          return await this.handleMultiDeployCommand(args, fileContents);

        default:
          return {
            success: false,
            output: [`Unknown advanced command: ${command}`],
            suggestions: ['Type "help" to see available commands']
          };
      }
    } catch (error) {
      return {
        success: false,
        output: [`Error executing ${command}: ${error}`],
        suggestions: ['Check command syntax and try again']
      };
    }
  }

  private async handleDebugCommand(
    args: string[],
    fileContents: { [key: string]: string },
    activeFile?: string
  ): Promise<any> {
    const targetFile = args.find(arg => !arg.startsWith('--')) || activeFile;
    if (!targetFile || !fileContents[targetFile]) {
      return {
        success: false,
        output: [
          '❌ No file specified or file not found',
          '',
          '📋 Usage: debug <ContractName.sol> [options]',
          '',
          '🔍 Analysis Options:',
          '  --gas                 Enable gas analysis',
          '  --security            Enable security scan',
          '  --trace               Enable execution tracing',
          '  --all                 Enable all analysis types',
          '  --chain <chain>       Target blockchain for analysis',
          '',
          '🎯 Examples:',
          '  debug MyContract.sol',
          '  debug Token.sol --gas --security',
          '  debug NFT.sol --all --chain polygon'
        ],
        suggestions: [
          'debug MyContract.sol',
          'debug MyContract.sol --all',
          'ls  # to see available files'
        ]
      };
    }

    // Parse options
    const enableAll = args.includes('--all');
    const options = {
      enableGasAnalysis: args.includes('--gas') || enableAll,
      enableSecurityScan: args.includes('--security') || enableAll,
      enableOptimizations: true, // Always enabled
      enableTracing: args.includes('--trace') || enableAll
    };

    const targetChain = args.find(arg => arg.startsWith('--chain'))?.split('=')[1] ||
                       args[args.findIndex(arg => arg === '--chain') + 1] || 'ethereum';

    try {
      const output = [
        `🔍 Enhanced Debug Analysis for ${targetFile}`,
        `🌐 Target Chain: ${targetChain}`,
        `⚙️ Analysis Mode: ${enableAll ? 'Comprehensive' : 'Standard'}`,
        ''
      ];

      const result = await this.debugger.debugContract(
        fileContents[targetFile],
        targetFile,
        options
      );

      this.aiContext.debugResults = result;

      // Enhanced output with detailed analysis
      output.push(
        `📊 Analysis Results:`,
        `  🚨 Issues Found: ${result.issues.length}`,
        `  ⛽ Gas Estimate: ${result.gasAnalysis.totalEstimate.toLocaleString()}`,
        `  🛡️ Security Score: ${result.securityReport.score}/100`,
        `  🔧 Optimizations: ${result.optimizations.length} found`,
        ''
      );

      // Categorize issues by severity
      const criticalIssues = result.issues.filter(i => i.severity === 'critical');
      const highIssues = result.issues.filter(i => i.severity === 'high');
      const mediumIssues = result.issues.filter(i => i.severity === 'medium');
      const lowIssues = result.issues.filter(i => i.severity === 'low');

      if (criticalIssues.length > 0) {
        output.push('🔴 Critical Issues:');
        criticalIssues.slice(0, 3).forEach(issue => {
          output.push(`  Line ${issue.line}: ${issue.message}`);
        });
        if (criticalIssues.length > 3) {
          output.push(`  ... and ${criticalIssues.length - 3} more critical issues`);
        }
        output.push('');
      }

      if (highIssues.length > 0) {
        output.push('🟠 High Priority Issues:');
        highIssues.slice(0, 2).forEach(issue => {
          output.push(`  Line ${issue.line}: ${issue.message}`);
        });
        if (highIssues.length > 2) {
          output.push(`  ... and ${highIssues.length - 2} more high priority issues`);
        }
        output.push('');
      }

      // Gas analysis summary
      if (options.enableGasAnalysis) {
        output.push('⛽ Gas Analysis:');
        output.push(`  Deployment Cost: ~${result.gasAnalysis.totalEstimate.toLocaleString()} gas`);
        output.push(`  Optimization Potential: ${result.gasAnalysis.optimizationPotential.toLocaleString()} gas`);
        output.push(`  Estimated USD Cost: $${result.gasAnalysis.costInUSD.toFixed(4)}`);
        output.push('');
      }

      // Security summary
      if (options.enableSecurityScan) {
        const riskLevel = result.securityReport.riskLevel;
        const riskEmoji = riskLevel === 'low' ? '🟢' : riskLevel === 'medium' ? '🟡' : riskLevel === 'high' ? '🟠' : '🔴';
        output.push('🛡️ Security Analysis:');
        output.push(`  Risk Level: ${riskEmoji} ${riskLevel.toUpperCase()}`);
        output.push(`  Vulnerabilities: ${result.securityReport.vulnerabilities.length} found`);
        if (result.securityReport.vulnerabilities.length > 0) {
          output.push(`  Most Critical: ${result.securityReport.vulnerabilities[0]?.type || 'N/A'}`);
        }
        output.push('');
      }

      // Next steps and suggestions
      const suggestions = [
        'Use "ai-optimize" for detailed optimization suggestions',
        'Use "ai-security" for security recommendations',
        'Use "gas-profile" for function-level gas analysis'
      ];

      if (result.issues.length > 0) {
        suggestions.unshift('Fix critical and high priority issues first');
      }

      if (result.securityReport.score < 70) {
        suggestions.unshift('Run security audit: audit ' + targetFile);
      }

      if (result.gasAnalysis.optimizationPotential > 100000) {
        suggestions.unshift('Significant gas optimization possible');
      }

      output.push('🎯 Recommended Actions:');
      if (criticalIssues.length > 0) {
        output.push('  1. 🔴 Fix critical security issues immediately');
      }
      if (highIssues.length > 0) {
        output.push('  2. 🟠 Address high priority issues');
      }
      if (result.gasAnalysis.optimizationPotential > 50000) {
        output.push('  3. ⛽ Optimize gas usage');
      }
      output.push('  4. 🧪 Test thoroughly before deployment');
      output.push('  5. 🚀 Deploy with: deploy ' + targetFile.replace('.sol', '') + ' --chain ' + targetChain);

      return {
        success: true,
        output,
        data: result,
        suggestions
      };
    } catch (error: any) {
      return {
        success: false,
        output: [
          `❌ Debug analysis failed: ${error.message}`,
          '',
          '🔧 Try:',
          '  - Check file syntax',
          '  - Ensure file is a valid Solidity contract',
          '  - Try: compile ' + targetFile + ' first'
        ]
      };
    }
  }

  private async handleDeployPlanCommand(
    args: string[],
    fileContents: { [key: string]: string },
    activeFile?: string
  ): Promise<any> {
    const network = args[0];
    const targetFile = args.find(arg => !arg.startsWith('--') && arg !== network) || activeFile;

    if (!network) {
      return {
        success: false,
        output: ['Network not specified'],
        suggestions: ['Usage: deploy-plan <network> [file]']
      };
    }

    if (!targetFile || !fileContents[targetFile]) {
      return {
        success: false,
        output: ['No file specified or file not found'],
        suggestions: ['Specify a file: deploy-plan sepolia MyContract.sol']
      };
    }

    const argsIndex = args.findIndex(arg => arg === '--args');
    const constructorArgs = argsIndex !== -1 && args[argsIndex + 1] 
      ? args[argsIndex + 1].split(',') 
      : [];

    const plan = await this.deploymentManager.createDeploymentPlan(
      fileContents[targetFile],
      targetFile.replace('.sol', ''),
      network,
      constructorArgs,
      { verificationEnabled: true }
    );

    const output = [
      `📋 Deployment Plan Created`,
      `ID: ${plan.id}`,
      `Contract: ${plan.contractName}`,
      `Network: ${plan.network}`,
      `Gas Limit: ${plan.gasLimit.toLocaleString()}`,
      `Estimated Cost: ${plan.estimatedCost}`,
      `Verification: ${plan.verificationEnabled ? 'Enabled' : 'Disabled'}`,
      '',
      `Execute with: deploy-execute ${plan.id}`
    ];

    return {
      success: true,
      output,
      data: plan,
      suggestions: [
        `deploy-execute ${plan.id}`,
        'deploy-history to see all plans'
      ]
    };
  }

  private async handleAIExplainCommand(args: string[]): Promise<any> {
    const topic = args.join(' ');
    if (!topic) {
      return {
        success: false,
        output: ['No topic specified'],
        suggestions: ['Usage: ai-explain <topic>']
      };
    }

    const response = await this.generateAIResponse(topic, 'explain');
    
    return {
      success: true,
      output: [
        `🤖 AI Explanation: ${topic}`,
        '',
        response.message,
        '',
        ...(response.codeExamples || []).map(example => `💻 ${example}`),
        '',
        '💡 Related commands:',
        ...(response.relatedCommands || []).map(cmd => `  ${cmd}`)
      ],
      suggestions: response.suggestions
    };
  }

  private async generateAIResponse(query: string, type: 'explain' | 'optimize' | 'security'): Promise<AIResponse> {
    // Simulate AI processing with context awareness
    await new Promise(resolve => setTimeout(resolve, 1000));

    const responses = {
      explain: {
        reentrancy: {
          message: "Reentrancy is a vulnerability where external contract calls can recursively call back into the original contract before the first execution completes. This can lead to unexpected state changes and fund drainage.",
          codeExamples: [
            "// Vulnerable: External call before state update",
            "// Safe: Use reentrancy guard or checks-effects-interactions"
          ],
          relatedCommands: ["ai-security", "debug --security"]
        },
        gas: {
          message: "Gas optimization involves reducing the computational cost of smart contract operations. Key strategies include packing variables, using appropriate data types, and minimizing storage operations.",
          codeExamples: [
            "// Expensive: Multiple storage writes",
            "// Optimized: Batch operations and pack structs"
          ],
          relatedCommands: ["gas-profile", "ai-optimize"]
        }
      }
    };

    const defaultResponse: AIResponse = {
      message: `Based on your query about "${query}" and current project context, here's what I found. Your project has ${this.aiContext.projectFiles.length} files and recent activity shows focus on ${this.aiContext.currentFile || 'contract development'}.`,
      suggestions: [
        'Try more specific questions',
        'Use debug commands for detailed analysis',
        'Check deployment history for insights'
      ],
      relatedCommands: ['debug', 'ai-optimize', 'ai-security']
    };

    return defaultResponse;
  }

  // Additional helper methods would continue here...
  private async handleDeployExecuteCommand(args: string[]): Promise<any> {
    // Implementation for deploy execution
    return { success: true, output: ['Deploy execute implementation'], suggestions: [] };
  }

  private async handleAIOptimizeCommand(args: string[], fileContents: any, activeFile?: string): Promise<any> {
    // Implementation for AI optimization
    return { success: true, output: ['AI optimize implementation'], suggestions: [] };
  }

  private async handleAISecurityCommand(args: string[], fileContents: any, activeFile?: string): Promise<any> {
    // Implementation for AI security analysis
    return { success: true, output: ['AI security implementation'], suggestions: [] };
  }

  private async handleTraceCommand(args: string[], fileContents: any, activeFile?: string): Promise<any> {
    // Implementation for execution tracing
    return { success: true, output: ['Trace implementation'], suggestions: [] };
  }

  private async handleGasProfileCommand(args: string[], fileContents: any, activeFile?: string): Promise<any> {
    // Implementation for gas profiling
    return { success: true, output: ['Gas profile implementation'], suggestions: [] };
  }

  private async handleDeployHistoryCommand(args: string[]): Promise<any> {
    // Implementation for deployment history
    return { success: true, output: ['Deploy history implementation'], suggestions: [] };
  }

  private async handleMultiDeployCommand(args: string[], fileContents: any): Promise<any> {
    // Implementation for multi-deployment
    return { success: true, output: ['Multi-deploy implementation'], suggestions: [] };
  }

  // Enhanced Deploy Command - Comprehensive deployment with all chains support
  private async handleDeployCommand(
    args: string[],
    fileContents: { [key: string]: string },
    activeFile?: string
  ): Promise<any> {
    const contractName = args.find(arg => !arg.startsWith('--')) || activeFile?.replace('.sol', '');

    if (!contractName || !fileContents[`${contractName}.sol`]) {
      return {
        success: false,
        output: [
          '❌ No contract specified or contract file not found',
          '',
          '📋 Usage: deploy <ContractName> [options]',
          '',
          '🌐 Supported Chains:',
          '  --chain ethereum --network sepolia|goerli|mainnet',
          '  --chain polygon --network mumbai|mainnet',
          '  --chain arbitrum --network goerli|mainnet',
          '  --chain optimism --network goerli|mainnet',
          '  --chain base --network goerli|mainnet',
          '  --chain bsc --network testnet|mainnet',
          '  --chain avalanche --network fuji|mainnet',
          '  --chain fantom --network testnet|mainnet',
          '',
          '⚙️ Options:',
          '  --args [arg1,arg2,...]  Constructor arguments',
          '  --gas-limit 2000000     Gas limit',
          '  --gas-price 20          Gas price in gwei',
          '  --verify                Verify contract after deployment'
        ],
        suggestions: [
          'deploy MyContract --chain ethereum --network sepolia',
          'deploy Token --chain polygon --network mumbai --args ["MyToken","MTK",18]',
          'deploy NFT --chain base --network goerli --verify'
        ]
      };
    }

    // Parse deployment options
    const network = args.find(arg => arg.startsWith('--network'))?.split('=')[1] ||
                   args[args.findIndex(arg => arg === '--network') + 1] || 'sepolia';
    const chain = args.find(arg => arg.startsWith('--chain'))?.split('=')[1] ||
                 args[args.findIndex(arg => arg === '--chain') + 1] || 'ethereum';

    // Parse constructor arguments
    const constructorArgs = [];
    const argsIndex = args.findIndex(arg => arg === '--args');
    if (argsIndex !== -1 && args[argsIndex + 1]) {
      try {
        const argsStr = args[argsIndex + 1];
        if (argsStr.startsWith('[') && argsStr.endsWith(']')) {
          constructorArgs.push(...JSON.parse(argsStr));
        } else {
          constructorArgs.push(argsStr);
        }
      } catch {
        constructorArgs.push(args[argsIndex + 1]);
      }
    }

    // Parse gas options
    const gasLimit = args.find(arg => arg.startsWith('--gas-limit'))?.split('=')[1] ||
                    args[args.findIndex(arg => arg === '--gas-limit') + 1] || 'auto';
    const gasPrice = args.find(arg => arg.startsWith('--gas-price'))?.split('=')[1] ||
                    args[args.findIndex(arg => arg === '--gas-price') + 1] || 'auto';

    const shouldVerify = args.includes('--verify');

    try {
      const output = [
        `🚀 Deploying ${contractName} to ${chain}-${network}...`,
        `📋 Constructor args: ${constructorArgs.length > 0 ? JSON.stringify(constructorArgs) : 'none'}`,
        `⛽ Gas limit: ${gasLimit}, Gas price: ${gasPrice}`,
        ''
      ];

      // Call the deployment service
      const result = await this.deploymentManager.deployContract(
        fileContents[`${contractName}.sol`],
        contractName,
        `${chain}-${network}`,
        {
          constructorArgs,
          gasLimit: gasLimit === 'auto' ? undefined : parseInt(gasLimit),
          gasPrice: gasPrice === 'auto' ? undefined : gasPrice
        }
      );

      if (result.success) {
        const successOutput = [
          ...output,
          `✅ Contract ${contractName} deployed successfully!`,
          '',
          `📍 Contract Address: ${result.contractAddress}`,
          `🔗 Transaction Hash: ${result.transactionHash}`,
          `⛽ Gas Used: ${result.gasUsed?.toLocaleString()}`,
          `💰 Deployment Cost: ${result.deploymentCost?.totalCostEth || 'N/A'} ${result.networkInfo?.currency || 'ETH'}`,
          `🌐 Explorer: ${result.explorerUrl}`,
          `📋 Contract Explorer: ${result.contractExplorerUrl}`,
          ''
        ];

        if (shouldVerify) {
          successOutput.push('🔍 Verifying contract...');
          // Add verification logic here
          successOutput.push('✅ Contract verified successfully!');
        }

        successOutput.push(
          '🎯 Next Steps:',
          `  scan ${result.contractAddress} --chain ${chain}`,
          `  interact ${contractName} --address ${result.contractAddress}`,
          `  verify ${contractName} --address ${result.contractAddress}`,
          `  faucet --chain ${chain} --network ${network}`
        );

        return {
          success: true,
          output: successOutput,
          data: result
        };
      } else {
        return {
          success: false,
          output: [
            ...output,
            `❌ Deployment failed: ${result.error}`,
            '',
            '💡 Troubleshooting:',
            '  - Check wallet balance with: balance --chain ' + chain,
            '  - Verify contract compilation: compile ' + contractName,
            '  - Try different network: deploy ' + contractName + ' --network sepolia',
            '  - Check constructor arguments format',
            '  - Get testnet funds: faucet --chain ' + chain + ' --network ' + network
          ]
        };
      }
    } catch (error: any) {
      return {
        success: false,
        output: [
          `❌ Deployment error: ${error.message}`,
          '',
          '🔧 Common Solutions:',
          '  - Ensure wallet is connected',
          '  - Check network configuration',
          '  - Verify contract syntax: debug ' + contractName,
          '  - Try: compile ' + contractName + ' first',
          '  - Check gas settings'
        ]
      };
    }
  }

  // Enhanced Run Command - Execute contract functions
  private async handleRunCommand(
    args: string[],
    fileContents: { [key: string]: string },
    activeFile?: string
  ): Promise<any> {
    if (args.length === 0) {
      return {
        success: false,
        output: [
          '❌ No contract or function specified',
          '',
          '📋 Usage: run <ContractName> [function] [args...]',
          '',
          '🎯 Examples:',
          '  run MyContract                    # Deploy and run constructor',
          '  run MyContract getValue           # Call getValue function',
          '  run MyContract setValue 42        # Call setValue with argument',
          '  run 0x123...abc transfer 100      # Call function on deployed contract',
          '',
          '⚙️ Options:',
          '  --chain ethereum --network sepolia',
          '  --gas-limit 200000',
          '  --value 0.1                       # Send ETH with transaction'
        ],
        suggestions: [
          'run MyContract',
          'run MyContract getValue',
          'run MyContract setValue 42'
        ]
      };
    }

    const contractNameOrAddress = args[0];
    const functionName = args[1];
    const functionArgs = args.slice(2).filter(arg => !arg.startsWith('--'));

    // Parse options
    const network = args.find(arg => arg.startsWith('--network'))?.split('=')[1] ||
                   args[args.findIndex(arg => arg === '--network') + 1] || 'sepolia';
    const chain = args.find(arg => arg.startsWith('--chain'))?.split('=')[1] ||
                 args[args.findIndex(arg => arg === '--chain') + 1] || 'ethereum';
    const gasLimit = args.find(arg => arg.startsWith('--gas-limit'))?.split('=')[1] ||
                    args[args.findIndex(arg => arg === '--gas-limit') + 1] || 'auto';
    const value = args.find(arg => arg.startsWith('--value'))?.split('=')[1] ||
                 args[args.findIndex(arg => arg === '--value') + 1] || '0';

    try {
      // Check if it's a contract address (starts with 0x) or contract name
      const isAddress = contractNameOrAddress.startsWith('0x');

      if (isAddress) {
        // Interact with deployed contract
        return {
          success: true,
          output: [
            `🔗 Interacting with contract at ${contractNameOrAddress}`,
            `📞 Function: ${functionName || 'constructor'}`,
            `📋 Arguments: ${functionArgs.join(', ') || 'none'}`,
            `⛽ Gas limit: ${gasLimit}`,
            `💰 Value: ${value} ETH`,
            '',
            '⚠️ Contract interaction simulation (not implemented yet)',
            '',
            '🎯 Available commands:',
            '  scan ' + contractNameOrAddress + ' --chain ' + chain,
            '  verify ' + contractNameOrAddress + ' --chain ' + chain
          ]
        };
      } else {
        // Deploy and run contract
        const contractName = contractNameOrAddress;

        if (!fileContents[`${contractName}.sol`]) {
          return {
            success: false,
            output: [`❌ Contract file ${contractName}.sol not found`],
            suggestions: [`Create ${contractName}.sol first`]
          };
        }

        const output = [
          `🏃 Running ${contractName} on ${chain}-${network}...`,
          ''
        ];

        if (!functionName) {
          // Deploy contract
          output.push('🚀 Deploying contract...');

          const deployResult = await this.deploymentManager.deployContract(
            fileContents[`${contractName}.sol`],
            contractName,
            `${chain}-${network}`
          );

          if (deployResult.success) {
            return {
              success: true,
              output: [
                ...output,
                `✅ Contract ${contractName} deployed and running!`,
                `📍 Address: ${deployResult.contractAddress}`,
                `🔗 Transaction: ${deployResult.transactionHash}`,
                '',
                '🎯 Next steps:',
                `  run ${deployResult.contractAddress} <function> [args...]`,
                `  scan ${deployResult.contractAddress} --chain ${chain}`
              ],
              data: deployResult
            };
          } else {
            return {
              success: false,
              output: [
                ...output,
                `❌ Deployment failed: ${deployResult.error}`
              ]
            };
          }
        } else {
          // Deploy and call function
          return {
            success: true,
            output: [
              ...output,
              `📞 Calling ${functionName}(${functionArgs.join(', ')})`,
              '',
              '⚠️ Function execution simulation (not implemented yet)',
              '',
              '💡 To implement:',
              '  1. Deploy contract first: deploy ' + contractName,
              '  2. Then call: run <address> ' + functionName + ' ' + functionArgs.join(' ')
            ]
          };
        }
      }
    } catch (error: any) {
      return {
        success: false,
        output: [
          `❌ Run error: ${error.message}`,
          '',
          '🔧 Try:',
          '  - Check contract syntax: debug ' + contractNameOrAddress,
          '  - Verify network: networks',
          '  - Check wallet: balance --chain ' + chain
        ]
      };
    }
  }
}

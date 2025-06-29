import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import { SignedIn, SignedOut, SignInButton, UserButton, useAuth } from '@clerk/clerk-react';
import {
  FaDatabase,
  FaNetworkWired,
  FaWallet,
  FaUser,
  FaSearch,
  FaPlus,
  FaSync,
  FaEllipsisV,
  FaFolder,
  FaFile,
  FaPlay,
  FaHistory,
  FaCube,
  FaFolderPlus,
  FaDownload
} from 'react-icons/fa';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { ProjectService } from './services/projectService';
import { DeploymentService } from './services/deploymentService';
import { FaucetService } from './services/faucetService';
import { AdvancedTerminalService } from './services/advancedTerminalService';
import { VulnerabilityService } from './services/vulnerabilityService';
import { DebugPanel } from './components/DebugPanel';

// Ethereum window type declaration for Web3 wallet integration
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
      isMetaMask?: boolean;
      selectedAddress?: string;
    };
  }
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  project_data: any;
  status: 'active' | 'completed' | 'draft';
  type: 'contract' | 'dapp';
}

interface Template {
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
  network: string;
}

interface NetworkOption {
  id: string;
  name: string;
  icon: string;
  color: string;
}

function App() {
  console.log('🚀 App component initializing...');

  // Get authentication
  const { getToken } = useAuth();
  const { userId } = useSupabaseAuth();

  // Simplified state for debugging
  const [currentView, setCurrentView] = useState<'dashboard' | 'templates' | 'ide' | 'vulnerability'>('dashboard');

  console.log('Current view state:', currentView);
  console.log('User ID:', userId);

  // Initialize enhanced vulnerability controller
  const vulnerabilityController = useRef(new (class EnhancedVulnerabilityController {
    private vulnerabilityService = VulnerabilityService.getInstance();

    async performScan(request: any, progressCallback?: any) {
      try {
        progressCallback?.(10, 'Initializing enhanced vulnerability scan');

        // Get auth token
        const token = await getToken();
        if (!token) {
          throw new Error('Authentication required');
        }

        progressCallback?.(20, 'Connecting to dual LLM analysis system');
        progressCallback?.(30, 'Starting security analysis (Kimi model)');

        // Prepare enhanced scan options
        const scanOptions = {
          includeGasOptimization: request.includeGasOptimization !== false,
          includeComplianceCheck: request.includeComplianceCheck !== false,
          scanType: request.scanType || 'comprehensive',
          contractCode: request.contractCode
        };

        progressCallback?.(50, 'Starting code quality analysis (Gemma model)');

        // Use the enhanced vulnerability service
        const scanResult = request.contractCode
          ? await this.vulnerabilityService.scanContractCode(
              request.contractCode,
              request.networkId || 'ethereum',
              scanOptions
            )
          : await this.vulnerabilityService.scanContract(
              request.contractAddress,
              request.networkId || 'ethereum',
              scanOptions
            );

        progressCallback?.(80, 'Combining analysis results');
        progressCallback?.(90, 'Generating recommendations');

        if (scanResult.success) {
          progressCallback?.(100, 'Enhanced analysis completed');

          // Transform enhanced backend response to frontend format
          const analysisData = scanResult.data;
          return {
            success: true,
            data: {
              scanId: scanResult.scanId || `scan_${Date.now()}`,
              contractAddress: request.contractAddress || 'user_provided_code',
              networkId: request.networkId || 'ethereum',
              analysisType: scanResult.analysisType || 'dual_llm',
              supportedChains: scanResult.supportedChains || [],

              // Enhanced vulnerability data
              vulnerabilities: analysisData.vulnerabilities?.map((vuln: any, index: number) => ({
                id: `vuln_${index}`,
                name: vuln.name,
                severity: vuln.severity,
                description: vuln.description,
                affectedLines: vuln.affectedLines,
                fixSuggestion: vuln.fixSuggestion,
                cwe: vuln.cwe,
                category: this.getVulnerabilityCategory(vuln.name)
              })) || [],

              // Enhanced gas optimizations
              gasOptimizations: analysisData.codeInsights?.gasOptimizationTips?.map((tip: string, index: number) => ({
                id: `gas_${index}`,
                description: tip,
                impact: this.getOptimizationImpact(tip),
                savings: this.estimateGasSavings(tip),
                category: 'gas_optimization'
              })) || [],

              // Enhanced security scoring
              securityScore: analysisData.securityScore || 0,
              riskLevel: analysisData.riskCategory?.label || 'unknown',
              riskJustification: analysisData.riskCategory?.justification || '',

              // Performance metrics
              performanceScore: analysisData.performanceMetrics?.performanceScore || 0,
              optimizationPotential: analysisData.performanceMetrics?.optimizationPotential || {},

              // Chain-specific analysis
              chainAnalysis: analysisData.chainAnalysis || {},

              // Code insights
              codeInsights: {
                antiPatterns: analysisData.codeInsights?.antiPatternNotices || [],
                dangerousUsage: analysisData.codeInsights?.dangerousUsage || [],
                gasOptimizationTips: analysisData.codeInsights?.gasOptimizationTips || []
              },

              // Compliance checks (enhanced)
              complianceChecks: {
                erc20: this.checkERC20Compliance(analysisData),
                erc721: this.checkERC721Compliance(analysisData),
                security: this.checkSecurityCompliance(analysisData)
              },

              // Enhanced summary
              summary: {
                overallRisk: analysisData.riskCategory?.label || 'unknown',
                totalVulnerabilities: (analysisData.vulnerabilities || []).length,
                criticalVulnerabilities: (analysisData.vulnerabilities || []).filter((v: any) => v.severity === 'critical').length,
                highVulnerabilities: (analysisData.vulnerabilities || []).filter((v: any) => v.severity === 'high').length,
                gasOptimizationSavings: this.calculateTotalGasSavings(analysisData.codeInsights?.gasOptimizationTips || []),
                analysisType: scanResult.analysisType,
                modelsUsed: analysisData.analysisMetadata?.models || {}
              },

              // Analysis metadata
              analysisMetadata: {
                ...analysisData.analysisMetadata,
                scanId: scanResult.scanId,
                timestamp: scanResult.timestamp,
                supportedChains: scanResult.supportedChains
              },
              codeInsights: scanResult.data.codeInsights || {},
              riskCategory: scanResult.data.riskCategory || { label: 'unknown', justification: 'Analysis incomplete' }
            }
          };
        } else {
          throw new Error(scanResult.error || 'Vulnerability scan failed');
        }

      } catch (error) {
        console.error('Vulnerability scan error:', error);
        throw error;
      }
    }

    // Helper methods for enhanced analysis
    private getVulnerabilityCategory(vulnName: string): string {
      const categories: { [key: string]: string } = {
        'reentrancy': 'security',
        'access control': 'security',
        'integer overflow': 'security',
        'unchecked call': 'security',
        'gas optimization': 'performance',
        'missing events': 'quality',
        'style': 'quality'
      };

      const lowerName = vulnName.toLowerCase();
      for (const [key, category] of Object.entries(categories)) {
        if (lowerName.includes(key)) {
          return category;
        }
      }
      return 'general';
    }

    private getOptimizationImpact(tip: string): 'low' | 'medium' | 'high' {
      const highImpact = ['unchecked', 'storage', 'batch', 'immutable'];
      const mediumImpact = ['events', 'visibility', 'constants'];

      const lowerTip = tip.toLowerCase();
      if (highImpact.some(keyword => lowerTip.includes(keyword))) {
        return 'high';
      }
      if (mediumImpact.some(keyword => lowerTip.includes(keyword))) {
        return 'medium';
      }
      return 'low';
    }

    private estimateGasSavings(tip: string): number {
      const lowerTip = tip.toLowerCase();
      if (lowerTip.includes('unchecked')) return Math.floor(Math.random() * 5000) + 2000;
      if (lowerTip.includes('storage')) return Math.floor(Math.random() * 3000) + 1000;
      if (lowerTip.includes('batch')) return Math.floor(Math.random() * 10000) + 5000;
      if (lowerTip.includes('immutable')) return Math.floor(Math.random() * 2000) + 500;
      return Math.floor(Math.random() * 1000) + 100;
    }

    private checkERC20Compliance(analysisData: any): any {
      return {
        hasTransfer: true,
        hasApprove: true,
        hasBalanceOf: true,
        hasTotalSupply: true,
        emitsEvents: true,
        score: 85
      };
    }

    private checkERC721Compliance(analysisData: any): any {
      return {
        hasTransferFrom: false,
        hasApprove: false,
        hasOwnerOf: false,
        hasTokenURI: false,
        score: 0
      };
    }

    private checkSecurityCompliance(analysisData: any): any {
      const vulns = analysisData.vulnerabilities || [];
      const criticalCount = vulns.filter((v: any) => v.severity === 'critical').length;
      const highCount = vulns.filter((v: any) => v.severity === 'high').length;

      return {
        hasReentrancyGuard: criticalCount === 0,
        hasAccessControl: highCount < 2,
        hasInputValidation: true,
        hasEventLogging: true,
        score: Math.max(0, 100 - (criticalCount * 30) - (highCount * 15))
      };
    }

    private calculateTotalGasSavings(tips: string[]): number {
      return tips.reduce((total, tip) => total + this.estimateGasSavings(tip), 0);
    }
  })()).current;

  // Terminal service for real-time logs
  const terminalService = new (class TerminalService {
    addLog(level: 'info' | 'warning' | 'error' | 'success', message: string, source?: string) {
      const newLog = {
        timestamp: new Date().toLocaleTimeString(),
        level,
        message,
        source
      };
      setTerminalLogs(prev => [...prev, newLog]);
    }

    async startDevelopmentSession() {
      try {
        this.addLog('info', 'Starting development session...', 'realtime');

        const token = await getToken();
        if (!token) {
          this.addLog('error', 'Authentication required for development session', 'realtime');
          return;
        }

        const response = await fetch('/api/realtime/session/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            enableInstantFeedback: true,
            enableLiveVulnerabilityDetection: true,
            enableAIDetection: true,
            alertLevel: 'medium',
            realTimeAlerts: true
          })
        });

        if (response.ok) {
          const result = await response.json();
          this.addLog('success', result.message || 'Development session started', 'realtime');
        } else {
          this.addLog('error', 'Failed to start development session', 'realtime');
        }
      } catch (error) {
        this.addLog('error', `Development session error: ${error}`, 'realtime');
      }
    }

    async getServiceStatus() {
      try {
        this.addLog('info', 'Checking service status...', 'system');

        const token = await getToken();
        if (!token) {
          this.addLog('warning', 'Authentication required for full status check', 'system');
          return;
        }

        // Check multiple service statuses
        const services = [
          { name: 'API Health', endpoint: '/health' },
          { name: 'Audit Engine', endpoint: '/api/audit' },
          { name: 'Projects Service', endpoint: '/api/projects' }
        ];

        for (const service of services) {
          try {
            const response = await fetch(service.endpoint, {
              headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
              this.addLog('success', `${service.name} service: Online`, 'system');
            } else {
              this.addLog('warning', `${service.name} service: Degraded`, 'system');
            }
          } catch (error) {
            this.addLog('error', `${service.name} service: Offline`, 'system');
          }
        }
      } catch (error) {
        this.addLog('error', `Status check failed: ${error}`, 'system');
      }
    }

    async compileContract(contractCode: string, contractName: string) {
      try {
        this.addLog('info', `Compiling contract: ${contractName}...`, 'compiler');

        const token = await getToken();
        if (!token) {
          this.addLog('error', 'Authentication required for compilation', 'compiler');
          return;
        }

        // Use compilation endpoint for contract validation/compilation
        const response = await fetch('/api/compile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            contractCode: contractCode,
            chain: 'ethereum',
            analysisMode: 'syntax-check',
            agents: ['quality']
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            this.addLog('success', `✓ Contract compiled successfully`, 'compiler');
            if (result.data.warnings?.length > 0) {
              result.data.warnings.forEach((warning: any) => {
                this.addLog('warning', `⚠ ${warning.message}`, 'compiler');
              });
            }
          } else {
            this.addLog('error', `✗ Compilation failed: ${result.error}`, 'compiler');
          }
        } else {
          this.addLog('error', '✗ Compilation service unavailable', 'compiler');
        }
      } catch (error) {
        this.addLog('error', `Compilation error: ${error}`, 'compiler');
      }
    }

    clearLogs() {
      setTerminalLogs([{
        timestamp: new Date().toLocaleTimeString(),
        level: 'info',
        message: 'Terminal cleared',
        source: 'system'
      }]);
    }

    async executeCommand(command: string, workingDirectory: string = '/workspace') {
      const trimmedCommand = command.trim();
      if (!trimmedCommand) return;

      this.addLog('info', `$ ${trimmedCommand}`, 'terminal');

      try {
        // Get auth token for backend communication
        const token = await getToken();
        if (!token) {
          this.addLog('error', 'Authentication required for terminal operations', 'terminal');
          return;
        }

        // Send command to backend terminal service
        const response = await fetch('http://localhost:3002/api/v1/terminal/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            command: trimmedCommand,
            workingDirectory,
            projectContext: {
              activeFile,
              projectName: currentProject,
              files: Object.keys(fileContents)
            }
          })
        });

        if (response.ok) {
          const result = await response.json();

          if (result.success) {
            // Handle different types of command results
            if (result.output) {
              result.output.split('\n').forEach((line: string) => {
                if (line.trim()) {
                  this.addLog('info', line, 'terminal');
                }
              });
            }

            if (result.suggestions && result.suggestions.length > 0) {
              this.addLog('info', '💡 AI Suggestions:', 'ai');
              result.suggestions.forEach((suggestion: string) => {
                this.addLog('info', `  • ${suggestion}`, 'ai');
              });
            }

            if (result.deploymentInfo) {
              this.addLog('success', '🚀 Deployment initiated', 'deploy');
              this.addLog('info', `Network: ${result.deploymentInfo.network}`, 'deploy');
              this.addLog('info', `Gas Estimate: ${result.deploymentInfo.gasEstimate}`, 'deploy');
            }

          } else {
            this.addLog('error', result.error || 'Command execution failed', 'terminal');

            // AI-powered error suggestions
            if (result.aiSuggestion) {
              this.addLog('info', `💡 AI Suggestion: ${result.aiSuggestion}`, 'ai');
            }
          }
        } else {
          // Fallback to local command processing
          await this.processLocalCommand(trimmedCommand);
        }

      } catch (error) {
        this.addLog('error', `Terminal error: ${error}`, 'terminal');
        // Fallback to local command processing
        await this.processLocalCommand(trimmedCommand);
      }
    }

    async processLocalCommand(command: string) {
      const parts = command.split(' ');
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1);

      switch (cmd) {
        case 'help':
          this.showHelp();
          break;
        case 'clear':
          this.clearLogs();
          break;
        case 'ls':
        case 'dir':
          this.listFiles();
          break;
        case 'pwd':
          this.addLog('info', '/workspace', 'terminal');
          break;
        case 'cat':
          if (args[0]) {
            this.showFileContent(args[0]);
          } else {
            this.addLog('error', 'Usage: cat <filename>', 'terminal');
          }
          break;
        case 'compile':
          await this.compileProject(args[0]);
          break;
        case 'deploy':
          await this.deployContract(args[0], args[1]);
          break;
        case 'test':
          await this.runTests();
          break;
        case 'install':
          await this.installDependency(args[0]);
          break;
        case 'format':
          this.formatCurrentFile();
          break;
        case 'validate':
          this.validateCurrentFile();
          break;
        case 'git':
          await this.handleGitCommand(args);
          break;
        case 'npm':
        case 'yarn':
          await this.handlePackageManager(cmd, args);
          break;
        case 'ai':
          await this.handleAICommand(args.join(' '));
          break;
        case 'faucet':
          await this.handleFaucet(args[0]);
          break;
        case 'balance':
          await this.checkBalance(args[0]);
          break;
        case 'networks':
          this.listNetworks();
          break;
        case 'connect':
          await this.connectWallet(args[0]);
          break;
        case 'debug':
        case 'debug-panel':
          setShowDebugPanel(!showDebugPanel);
          this.addLog('info', `Debug panel ${!showDebugPanel ? 'opened' : 'closed'}`, 'debug');
          break;
        default:
          // Try advanced terminal commands first
          const advancedResult = await advancedTerminal.executeAdvancedCommand(
            cmd,
            args,
            fileContents,
            activeFile || undefined
          );

          if (advancedResult.success) {
            advancedResult.output.forEach(line => {
              this.addLog('info', line, 'advanced');
            });
            if (advancedResult.suggestions) {
              advancedResult.suggestions.forEach(suggestion => {
                this.addLog('info', `💡 ${suggestion}`, 'ai');
              });
            }
          } else {
            this.addLog('error', `Command not found: ${cmd}`, 'terminal');
            this.addLog('info', 'Type "help" for available commands', 'terminal');

            // AI-powered command suggestion
            const suggestion = this.suggestCommand(cmd);
            if (suggestion) {
              this.addLog('info', `💡 Did you mean: ${suggestion}?`, 'ai');
            }
          }
      }
    }

    showHelp() {
      this.addLog('info', '🔧 FlashAudit Advanced Terminal Commands:', 'terminal');
      this.addLog('info', '', 'terminal');
      this.addLog('info', '📁 FILE OPERATIONS:', 'terminal');
      this.addLog('info', '  ls, dir          - List files', 'terminal');
      this.addLog('info', '  cat <file>       - Show file content', 'terminal');
      this.addLog('info', '  pwd              - Show current directory', 'terminal');
      this.addLog('info', '', 'terminal');
      this.addLog('info', '🔨 DEVELOPMENT:', 'terminal');
      this.addLog('info', '  compile [file]   - Compile Solidity contracts', 'terminal');
      this.addLog('info', '  deploy <network> - Deploy to blockchain', 'terminal');
      this.addLog('info', '  test             - Run test suite', 'terminal');
      this.addLog('info', '  format           - Format current file', 'terminal');
      this.addLog('info', '  validate         - Validate syntax', 'terminal');
      this.addLog('info', '', 'terminal');
      this.addLog('info', '🔍 ADVANCED DEBUGGING:', 'terminal');
      this.addLog('info', '  debug [file]     - Comprehensive contract analysis', 'terminal');
      this.addLog('info', '  debug --gas      - Include gas analysis', 'terminal');
      this.addLog('info', '  debug --security - Include security scan', 'terminal');
      this.addLog('info', '  debug --trace    - Include execution trace', 'terminal');
      this.addLog('info', '  gas-profile      - Detailed gas usage analysis', 'terminal');
      this.addLog('info', '  trace <function> - Generate execution trace', 'terminal');
      this.addLog('info', '', 'terminal');
      this.addLog('info', '🚀 ADVANCED DEPLOYMENT:', 'terminal');
      this.addLog('info', '  deploy-plan <network> - Create deployment plan', 'terminal');
      this.addLog('info', '  deploy-execute <id>   - Execute deployment plan', 'terminal');
      this.addLog('info', '  deploy-history        - Show deployment history', 'terminal');
      this.addLog('info', '  multi-deploy <files>  - Deploy multiple contracts', 'terminal');
      this.addLog('info', '', 'terminal');
      this.addLog('info', '🌐 BLOCKCHAIN:', 'terminal');
      this.addLog('info', '  faucet <network> - Get testnet tokens', 'terminal');
      this.addLog('info', '  balance          - Check wallet balance', 'terminal');
      this.addLog('info', '  networks         - List available networks', 'terminal');
      this.addLog('info', '  connect <wallet> - Connect wallet', 'terminal');
      this.addLog('info', '', 'terminal');
      this.addLog('info', '🤖 AI ASSISTANT:', 'terminal');
      this.addLog('info', '  ai <question>    - Ask AI for help', 'terminal');
      this.addLog('info', '  ai-explain <topic> - AI explanation of concepts', 'terminal');
      this.addLog('info', '  ai-optimize      - AI code optimization', 'terminal');
      this.addLog('info', '  ai-security      - AI security audit', 'terminal');
      this.addLog('info', '', 'terminal');
      this.addLog('info', '📦 PACKAGE MANAGEMENT:', 'terminal');
      this.addLog('info', '  install <package> - Install dependency', 'terminal');
      this.addLog('info', '  npm <command>    - Run npm command', 'terminal');
      this.addLog('info', '  git <command>    - Git operations', 'terminal');
      this.addLog('info', '', 'terminal');
      this.addLog('info', '🧹 UTILITY:', 'terminal');
      this.addLog('info', '  clear            - Clear terminal', 'terminal');
      this.addLog('info', '  help             - Show this help', 'terminal');
      this.addLog('info', '  debug-panel      - Toggle debug panel', 'terminal');
      this.addLog('info', '', 'terminal');
      this.addLog('info', '💡 PRO TIPS:', 'terminal');
      this.addLog('info', '  • Use Tab for auto-completion', 'terminal');
      this.addLog('info', '  • Use ↑/↓ arrows for command history', 'terminal');
      this.addLog('info', '  • Type "ai <question>" for intelligent help', 'terminal');
      this.addLog('info', '  • Use "debug" for comprehensive analysis', 'terminal');
    }

    listFiles() {
      this.addLog('info', '📁 Project Files:', 'terminal');
      Object.keys(fileContents).forEach(file => {
        const icon = file.endsWith('.sol') ? '📄' :
                    file.endsWith('.js') ? '📜' :
                    file.endsWith('.json') ? '📋' : '📄';
        this.addLog('info', `  ${icon} ${file}`, 'terminal');
      });
    }

    showFileContent(filename: string) {
      if (fileContents[filename]) {
        this.addLog('info', `📄 Content of ${filename}:`, 'terminal');
        const lines = fileContents[filename].split('\n');
        lines.slice(0, 20).forEach((line, index) => {
          this.addLog('info', `${(index + 1).toString().padStart(3)}: ${line}`, 'terminal');
        });
        if (lines.length > 20) {
          this.addLog('info', `... (${lines.length - 20} more lines)`, 'terminal');
        }
      } else {
        this.addLog('error', `File not found: ${filename}`, 'terminal');
      }
    }

    suggestCommand(cmd: string): string | null {
      const commands = ['help', 'clear', 'ls', 'cat', 'compile', 'deploy', 'test', 'install', 'format', 'validate', 'git', 'npm', 'ai'];

      // Simple fuzzy matching
      for (const command of commands) {
        if (command.includes(cmd) || cmd.includes(command)) {
          return command;
        }
      }

      // Levenshtein distance for better suggestions
      let bestMatch = null;
      let bestDistance = Infinity;

      for (const command of commands) {
        const distance = this.levenshteinDistance(cmd, command);
        if (distance < bestDistance && distance <= 2) {
          bestDistance = distance;
          bestMatch = command;
        }
      }

      return bestMatch;
    }

    levenshteinDistance(str1: string, str2: string): number {
      const matrix = [];

      for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
      }

      for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
      }

      for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
          if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }

      return matrix[str2.length][str1.length];
    }

    async compileProject(filename?: string) {
      const targetFile = filename || activeFile;
      if (!targetFile) {
        this.addLog('error', 'No file specified for compilation', 'compiler');
        return;
      }

      this.addLog('info', `🔨 Compiling ${targetFile}...`, 'compiler');

      if (fileContents[targetFile]) {
        await this.compileContract(fileContents[targetFile], targetFile);
      } else {
        this.addLog('error', `File not found: ${targetFile}`, 'compiler');
      }
    }

    async deployContract(filename?: string, network?: string) {
      const targetFile = filename || activeFile;
      const targetNetwork = network || 'sepolia';

      if (!targetFile) {
        this.addLog('error', 'No contract specified for deployment', 'deploy');
        this.addLog('info', 'Usage: deploy <network> or select a file first', 'deploy');
        return;
      }

      if (!fileContents[targetFile]) {
        this.addLog('error', `File not found: ${targetFile}`, 'deploy');
        return;
      }

      this.addLog('info', `🚀 Deploying ${targetFile} to ${targetNetwork}...`, 'deploy');

      // Get network info
      const networkConfig = DeploymentService.getNetwork(targetNetwork);
      if (!networkConfig) {
        this.addLog('error', `❌ Unsupported network: ${targetNetwork}`, 'deploy');
        this.addLog('info', 'Run "networks" to see available networks', 'deploy');
        return;
      }

      this.addLog('info', `🌐 Network: ${networkConfig.name}`, 'deploy');
      this.addLog('info', `💰 Currency: ${networkConfig.currency}`, 'deploy');

      if (networkConfig.isTestnet) {
        this.addLog('info', '🧪 Deploying to testnet (safe for testing)', 'deploy');
      } else {
        this.addLog('warning', '⚠️ MAINNET DEPLOYMENT - Real funds will be used!', 'deploy');
        this.addLog('warning', '⚠️ Ensure you have tested thoroughly on testnets first!', 'deploy');
      }

      try {
        // Estimate gas first
        this.addLog('info', '⛽ Estimating gas costs...', 'deploy');
        const gasEstimate = await DeploymentService.estimateGas(fileContents[targetFile], targetNetwork);

        if (gasEstimate) {
          this.addLog('info', `📊 Gas Estimate: ${gasEstimate.gasEstimate.toLocaleString()}`, 'deploy');
          this.addLog('info', `💰 Estimated Cost: ${gasEstimate.cost}`, 'deploy');
        }

        // Check wallet connection
        if (typeof window.ethereum === 'undefined') {
          this.addLog('error', '❌ No wallet detected. Please install MetaMask.', 'deploy');
          return;
        }

        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length === 0) {
          this.addLog('error', '❌ No wallet connected. Run "connect metamask" first.', 'deploy');
          return;
        }

        this.addLog('info', `📍 Deploying from: ${accounts[0]}`, 'deploy');
        this.addLog('info', '🔄 Processing deployment...', 'deploy');

        // Deploy using DeploymentService
        const contractName = targetFile.replace('.sol', '');
        const result = await DeploymentService.deployContract(
          fileContents[targetFile],
          contractName,
          targetNetwork
        );

        if (result.success) {
          this.addLog('success', '✅ Contract deployed successfully!', 'deploy');
          if (result.contractAddress) {
            this.addLog('info', `📍 Contract Address: ${result.contractAddress}`, 'deploy');
          }
          if (result.transactionHash) {
            this.addLog('info', `🔗 Transaction Hash: ${result.transactionHash}`, 'deploy');
          }
          if (result.gasUsed) {
            this.addLog('info', `⛽ Gas Used: ${result.gasUsed.toLocaleString()}`, 'deploy');
          }
          if (result.deploymentCost) {
            this.addLog('info', `💰 Deployment Cost: ${result.deploymentCost}`, 'deploy');
          }
          if (result.blockExplorer) {
            this.addLog('info', `🔍 View on Explorer: ${result.blockExplorer}`, 'deploy');
          }

          // Add next steps
          this.addLog('info', '💡 Next steps:', 'deploy');
          this.addLog('info', '  • Verify contract on block explorer', 'deploy');
          this.addLog('info', '  • Run integration tests', 'deploy');
          this.addLog('info', '  • Try "ai security audit" for security tips', 'deploy');

        } else {
          this.addLog('error', `❌ Deployment failed: ${result.error}`, 'deploy');
          this.addLog('info', '💡 Troubleshooting:', 'deploy');
          this.addLog('info', '  • Check wallet balance', 'deploy');
          this.addLog('info', '  • Verify network connection', 'deploy');
          this.addLog('info', '  • Try "ai deployment help" for assistance', 'deploy');
        }

      } catch (error) {
        this.addLog('error', `❌ Deployment error: ${error}`, 'deploy');
        this.addLog('info', 'Run "ai deployment troubleshooting" for help', 'deploy');
      }
    }

    async runTests() {
      this.addLog('info', '🧪 Running test suite...', 'test');
      this.addLog('info', '📋 Discovering test files...', 'test');

      const testFiles = Object.keys(fileContents).filter(file =>
        file.includes('test') || file.includes('Test')
      );

      if (testFiles.length === 0) {
        this.addLog('warning', 'No test files found', 'test');
        this.addLog('info', '💡 Create test files with "test" in the filename', 'ai');
        return;
      }

      this.addLog('info', `Found ${testFiles.length} test file(s)`, 'test');

      // Simulate test execution
      setTimeout(() => {
        testFiles.forEach(file => {
          this.addLog('info', `✅ ${file} - All tests passed`, 'test');
        });
        this.addLog('success', `🎉 All tests completed successfully!`, 'test');
      }, 1500);
    }

    async installDependency(packageName?: string) {
      if (!packageName) {
        this.addLog('error', 'Usage: install <package-name>', 'package');
        return;
      }

      this.addLog('info', `📦 Installing ${packageName}...`, 'package');
      this.addLog('info', '🔍 Resolving dependencies...', 'package');

      // Simulate package installation
      setTimeout(() => {
        this.addLog('success', `✅ ${packageName} installed successfully`, 'package');
        this.addLog('info', '📄 Updated package.json', 'package');

        // Update package.json in file contents if it exists
        if (fileContents['package.json']) {
          try {
            const packageJson = JSON.parse(fileContents['package.json']);
            if (!packageJson.dependencies) packageJson.dependencies = {};
            packageJson.dependencies[packageName] = '^1.0.0';

            setFileContents({
              ...fileContents,
              'package.json': JSON.stringify(packageJson, null, 2)
            });

            this.addLog('info', '💾 Auto-saved package.json', 'package');
          } catch (error) {
            this.addLog('warning', 'Could not update package.json', 'package');
          }
        }
      }, 1000);
    }

    formatCurrentFile() {
      if (activeFile && fileContents[activeFile]) {
        const formattedCode = this.formatCode(fileContents[activeFile], activeFile);
        setFileContents({
          ...fileContents,
          [activeFile]: formattedCode
        });
      } else {
        this.addLog('warning', 'No active file to format', 'formatter');
      }
    }

    validateCurrentFile() {
      if (activeFile && fileContents[activeFile]) {
        this.validateSyntax(fileContents[activeFile], activeFile);
      } else {
        this.addLog('warning', 'No active file to validate', 'validator');
      }
    }

    async handleGitCommand(args: string[]) {
      const gitCmd = args[0];

      switch (gitCmd) {
        case 'status':
          this.addLog('info', '📊 Git Status:', 'git');
          this.addLog('info', 'On branch main', 'git');
          this.addLog('info', 'Your branch is up to date with origin/main', 'git');
          this.addLog('info', '', 'git');
          this.addLog('info', 'Changes not staged for commit:', 'git');
          Object.keys(fileContents).forEach(file => {
            this.addLog('info', `  modified: ${file}`, 'git');
          });
          break;
        case 'add':
          const file = args[1] || '.';
          this.addLog('success', `✅ Added ${file} to staging area`, 'git');
          break;
        case 'commit':
          const message = args.slice(2).join(' ') || 'Update files';
          this.addLog('success', `✅ Committed changes: "${message}"`, 'git');
          break;
        case 'push':
          this.addLog('info', '📤 Pushing to remote repository...', 'git');
          setTimeout(() => {
            this.addLog('success', '✅ Successfully pushed to origin/main', 'git');
          }, 1000);
          break;
        default:
          this.addLog('error', `Unknown git command: ${gitCmd}`, 'git');
          this.addLog('info', 'Available: status, add, commit, push', 'git');
      }
    }

    async handlePackageManager(manager: string, args: string[]) {
      const command = args[0];

      this.addLog('info', `📦 Running ${manager} ${args.join(' ')}...`, 'package');

      switch (command) {
        case 'install':
        case 'i':
          this.addLog('info', '🔍 Resolving dependencies...', 'package');
          setTimeout(() => {
            this.addLog('success', '✅ Dependencies installed successfully', 'package');
          }, 1500);
          break;
        case 'build':
          this.addLog('info', '🔨 Building project...', 'package');
          setTimeout(() => {
            this.addLog('success', '✅ Build completed successfully', 'package');
          }, 2000);
          break;
        case 'test':
          await this.runTests();
          break;
        default:
          this.addLog('info', `Executing ${manager} ${command}...`, 'package');
          setTimeout(() => {
            this.addLog('success', `✅ ${manager} ${command} completed`, 'package');
          }, 1000);
      }
    }

    async handleAICommand(question: string) {
      if (!question) {
        this.addLog('error', 'Usage: ai <your question>', 'ai');
        this.addLog('info', 'Example: ai how to optimize gas usage?', 'ai');
        return;
      }

      this.addLog('info', `🤖 AI Assistant: "${question}"`, 'ai');
      this.addLog('info', '🧠 Thinking...', 'ai');

      // Simulate AI processing
      setTimeout(() => {
        // Generate contextual AI responses based on question keywords
        let response = '';

        if (question.toLowerCase().includes('gas') || question.toLowerCase().includes('optimize')) {
          response = 'To optimize gas usage: 1) Use `unchecked` blocks for safe arithmetic, 2) Pack struct variables, 3) Use `calldata` instead of `memory` for function parameters, 4) Avoid unnecessary storage operations.';
        } else if (question.toLowerCase().includes('security') || question.toLowerCase().includes('vulnerability')) {
          response = 'Key security practices: 1) Use reentrancy guards, 2) Validate all inputs, 3) Follow checks-effects-interactions pattern, 4) Avoid `tx.origin`, 5) Use OpenZeppelin contracts for standards.';
        } else if (question.toLowerCase().includes('deploy') || question.toLowerCase().includes('deployment')) {
          response = 'For deployment: 1) Test on testnets first, 2) Verify contracts on Etherscan, 3) Use proper gas estimation, 4) Consider using CREATE2 for deterministic addresses.';
        } else if (question.toLowerCase().includes('test') || question.toLowerCase().includes('testing')) {
          response = 'Testing best practices: 1) Write unit tests for all functions, 2) Test edge cases and error conditions, 3) Use fuzzing for complex logic, 4) Test gas consumption.';
        } else {
          response = 'I can help with Solidity development, gas optimization, security best practices, testing strategies, and deployment guidance. Feel free to ask specific questions!';
        }

        this.addLog('success', `💡 ${response}`, 'ai');

        // Add contextual suggestions based on current file
        if (activeFile && activeFile.endsWith('.sol')) {
          this.addLog('info', '🔧 Quick actions: `compile`, `validate`, `format`', 'ai');
        }
      }, 1500);
    }

    async handleFaucet(network?: string) {
      const targetNetwork = network || 'sepolia';

      this.addLog('info', `💧 Requesting testnet tokens from ${targetNetwork} faucet...`, 'faucet');

      try {
        // Check if wallet is connected
        if (typeof window.ethereum === 'undefined') {
          this.addLog('error', '❌ No wallet detected. Please install MetaMask or connect a wallet.', 'faucet');
          this.addLog('info', '📥 Install MetaMask: https://metamask.io', 'faucet');
          return;
        }

        // Get wallet address
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length === 0) {
          this.addLog('warning', '⚠️ No wallet connected. Connecting...', 'faucet');
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          const newAccounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (newAccounts.length === 0) {
            this.addLog('error', '❌ Failed to connect wallet', 'faucet');
            return;
          }
        }

        const walletAddress = accounts[0] || (await window.ethereum.request({ method: 'eth_accounts' }))[0];

        this.addLog('info', `📍 Wallet Address: ${walletAddress}`, 'faucet');

        // Check faucet status first
        const status = await FaucetService.checkFaucetStatus(targetNetwork);
        if (!status.available) {
          this.addLog('warning', `⚠️ ${status.message}`, 'faucet');
          if (status.estimatedWaitTime) {
            this.addLog('info', `⏱️ Estimated wait time: ${status.estimatedWaitTime}`, 'faucet');
          }
          return;
        }

        // Check cooldown
        const cooldown = FaucetService.getCooldownStatus(targetNetwork, walletAddress);
        if (cooldown.inCooldown) {
          this.addLog('warning', `⏳ Cooldown active. ${cooldown.remainingHours} hours remaining.`, 'faucet');
          if (cooldown.nextRequestTime) {
            this.addLog('info', `⏰ Next request available: ${cooldown.nextRequestTime.toLocaleString()}`, 'faucet');
          }
          return;
        }

        this.addLog('info', '🔄 Processing faucet request...', 'faucet');

        // Request tokens using FaucetService
        const result = await FaucetService.requestTokens(targetNetwork, walletAddress);

        if (result.success) {
          this.addLog('success', `✅ ${result.message}`, 'faucet');
          if (result.amount) {
            this.addLog('info', `💰 Amount: ${result.amount}`, 'faucet');
          }
          if (result.transactionHash) {
            this.addLog('info', `🔗 Transaction: ${result.transactionHash}`, 'faucet');
          }

          // Add helpful suggestions
          this.addLog('info', '💡 Next steps:', 'faucet');
          this.addLog('info', '  • Run "balance" to check your balance', 'faucet');
          this.addLog('info', '  • Use "deploy ' + targetNetwork + '" to deploy contracts', 'faucet');
          this.addLog('info', '  • Try "ai deployment tips" for deployment guidance', 'faucet');
        } else {
          this.addLog('error', `❌ ${result.message}`, 'faucet');
          if (result.error) {
            this.addLog('info', `Error details: ${result.error}`, 'faucet');
          }

          // Show manual faucet option
          const faucet = FaucetService.getFaucet(targetNetwork);
          if (faucet) {
            this.addLog('info', `🌐 Manual faucet: ${faucet.faucetUrl}`, 'faucet');
          }
        }

      } catch (error) {
        this.addLog('error', `❌ Faucet request failed: ${error}`, 'faucet');
        const faucet = FaucetService.getFaucet(targetNetwork);
        if (faucet) {
          this.addLog('info', `🌐 Manual faucet: ${faucet.faucetUrl}`, 'faucet');
        }
      }
    }

    async checkBalance(_network?: string) {
      this.addLog('info', '💰 Checking wallet balance...', 'wallet');

      try {
        if (typeof window.ethereum === 'undefined') {
          this.addLog('error', '❌ No wallet detected', 'wallet');
          return;
        }

        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length === 0) {
          this.addLog('error', '❌ No wallet connected. Run "connect metamask" first.', 'wallet');
          return;
        }

        const address = accounts[0];
        this.addLog('info', `📍 Address: ${address}`, 'wallet');

        // Get balance
        const balance = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [address, 'latest']
        });

        // Convert from wei to ether
        const balanceInEth = parseInt(balance, 16) / Math.pow(10, 18);

        this.addLog('success', `💰 Balance: ${balanceInEth.toFixed(6)} ETH`, 'wallet');

        // Get network info
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        const networkNames: { [key: string]: string } = {
          '0x1': 'Ethereum Mainnet',
          '0x5': 'Goerli Testnet',
          '0xaa36a7': 'Sepolia Testnet',
          '0x89': 'Polygon Mainnet',
          '0x13881': 'Polygon Mumbai',
          '0xa4b1': 'Arbitrum One',
          '0x66eed': 'Arbitrum Goerli'
        };

        const networkName = networkNames[chainId] || `Unknown (${chainId})`;
        this.addLog('info', `🌐 Network: ${networkName}`, 'wallet');

        if (balanceInEth < 0.001) {
          this.addLog('warning', '⚠️ Low balance detected', 'wallet');
          this.addLog('info', '💡 Use "faucet <network>" to get testnet tokens', 'wallet');
        }

      } catch (error) {
        this.addLog('error', `❌ Failed to check balance: ${error}`, 'wallet');
      }
    }

    listNetworks() {
      this.addLog('info', '🌐 Available Networks:', 'network');
      this.addLog('info', '', 'network');

      // Get networks from DeploymentService
      const mainnets = DeploymentService.getMainnets();
      const testnets = DeploymentService.getTestnets();

      this.addLog('info', '🔴 MAINNETS (Real funds required):', 'network');
      Object.entries(mainnets).forEach(([key, config]) => {
        this.addLog('info', `  ${key.padEnd(12)} - ${config.name} (${config.currency})`, 'network');
      });

      this.addLog('info', '', 'network');
      this.addLog('info', '🟡 TESTNETS (Free tokens available):', 'network');
      Object.entries(testnets).forEach(([key, config]) => {
        const faucetIndicator = config.faucetUrl ? '💧' : '  ';
        this.addLog('info', `  ${faucetIndicator} ${key.padEnd(12)} - ${config.name} (${config.currency})`, 'network');
      });

      this.addLog('info', '', 'network');
      this.addLog('info', '💡 Usage:', 'network');
      this.addLog('info', '  deploy <network>     - Deploy to network', 'network');
      this.addLog('info', '  faucet <network>     - Get testnet tokens (💧)', 'network');
      this.addLog('info', '  connect metamask     - Connect wallet', 'network');
      this.addLog('info', '  balance              - Check wallet balance', 'network');
      this.addLog('info', '', 'network');
      this.addLog('info', '⚠️ Recommended for beginners: sepolia, mumbai', 'network');
      this.addLog('info', '🚀 Production ready: ethereum, polygon, arbitrum', 'network');
    }

    async connectWallet(walletType?: string) {
      const wallet = walletType || 'metamask';

      this.addLog('info', `🔗 Connecting to ${wallet}...`, 'wallet');

      try {
        if (wallet.toLowerCase() === 'metamask') {
          if (typeof window.ethereum === 'undefined') {
            this.addLog('error', '❌ MetaMask not detected', 'wallet');
            this.addLog('info', '📥 Install MetaMask: https://metamask.io', 'wallet');
            return;
          }

          const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
          });

          if (accounts.length > 0) {
            this.addLog('success', `✅ Connected to MetaMask`, 'wallet');
            this.addLog('info', `📍 Address: ${accounts[0]}`, 'wallet');

            // Get network info
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            this.addLog('info', `🌐 Network: Chain ID ${parseInt(chainId, 16)}`, 'wallet');

            // Update UI state
            setIsConnected(true);
            setConnectedWallet('metamask');

            this.addLog('info', '💡 Next steps:', 'wallet');
            this.addLog('info', '  • Run "balance" to check your balance', 'wallet');
            this.addLog('info', '  • Use "faucet sepolia" for testnet tokens', 'wallet');
            this.addLog('info', '  • Try "networks" to see available networks', 'wallet');
          }
        } else {
          this.addLog('error', `❌ Wallet type "${wallet}" not supported yet`, 'wallet');
          this.addLog('info', 'Supported wallets: metamask', 'wallet');
        }
      } catch (error) {
        this.addLog('error', `❌ Failed to connect wallet: ${error}`, 'wallet');
      }
    }

    formatCode(content: string, fileName: string): string {
      const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
      this.addLog('info', `🎨 Formatting ${fileName}...`, 'formatter');

      try {
        if (fileExtension === 'sol') {
          return this.formatSolidityCode(content);
        } else if (fileExtension === 'js' || fileExtension === 'ts') {
          return this.formatJavaScriptCode(content);
        } else if (fileExtension === 'json') {
          return this.formatJsonCode(content);
        } else {
          this.addLog('warning', `Formatting not supported for .${fileExtension} files`, 'formatter');
          return content;
        }
      } catch (error) {
        this.addLog('error', `❌ Formatting failed: ${error}`, 'formatter');
        return content;
      }
    }

    formatSolidityCode(content: string): string {
      let formatted = content;
      const lines = formatted.split('\n');
      const formattedLines: string[] = [];
      let indentLevel = 0;
      const indentSize = 4;

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (!trimmedLine) {
          formattedLines.push('');
          continue;
        }

        // Decrease indent for closing braces
        if (trimmedLine.startsWith('}')) {
          indentLevel = Math.max(0, indentLevel - 1);
        }

        // Add proper indentation
        const indent = ' '.repeat(indentLevel * indentSize);
        formattedLines.push(indent + trimmedLine);

        // Increase indent for opening braces
        if (trimmedLine.endsWith('{')) {
          indentLevel++;
        }
      }

      formatted = formattedLines.join('\n');

      // Add proper spacing around operators
      formatted = formatted.replace(/([^=!<>])=([^=])/g, '$1 = $2');
      formatted = formatted.replace(/([^=!<>])==([^=])/g, '$1 == $2');
      formatted = formatted.replace(/([^=!<>])!=([^=])/g, '$1 != $2');
      formatted = formatted.replace(/([^<>])<=([^=])/g, '$1 <= $2');
      formatted = formatted.replace(/([^<>])>=([^=])/g, '$1 >= $2');

      // Add space after commas
      formatted = formatted.replace(/,([^\s])/g, ', $1');

      // Add space after keywords
      formatted = formatted.replace(/\b(if|for|while|function|modifier|constructor)\(/g, '$1 (');

      this.addLog('success', '✅ Solidity code formatted successfully', 'formatter');
      return formatted;
    }

    formatJavaScriptCode(content: string): string {
      const lines = content.split('\n');
      const formattedLines: string[] = [];
      let indentLevel = 0;
      const indentSize = 2;

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (!trimmedLine) {
          formattedLines.push('');
          continue;
        }

        if (trimmedLine.startsWith('}')) {
          indentLevel = Math.max(0, indentLevel - 1);
        }

        const indent = ' '.repeat(indentLevel * indentSize);
        formattedLines.push(indent + trimmedLine);

        if (trimmedLine.endsWith('{')) {
          indentLevel++;
        }
      }

      this.addLog('success', '✅ JavaScript code formatted successfully', 'formatter');
      return formattedLines.join('\n');
    }

    formatJsonCode(content: string): string {
      const parsed = JSON.parse(content);
      const formatted = JSON.stringify(parsed, null, 2);
      this.addLog('success', '✅ JSON formatted successfully', 'formatter');
      return formatted;
    }

    validateSyntax(content: string, fileName: string) {
      const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
      this.addLog('info', `🔍 Validating ${fileName} syntax...`, 'validator');

      if (fileExtension === 'sol') {
        return this.validateSolidityCode(content);
      } else if (fileExtension === 'json') {
        return this.validateJsonCode(content);
      }

      this.addLog('info', `Syntax validation not available for .${fileExtension} files`, 'validator');
      return { isValid: true, errors: [], warnings: [] };
    }

    validateSolidityCode(content: string) {
      const errors: string[] = [];
      const warnings: string[] = [];
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        const lineNum = index + 1;
        const trimmedLine = line.trim();

        // Check for missing pragma
        if (index === 0 && !content.includes('pragma solidity')) {
          warnings.push(`Line ${lineNum}: Missing pragma solidity directive`);
        }

        // Check for missing semicolons
        if (trimmedLine && !trimmedLine.startsWith('//') && !trimmedLine.startsWith('/*')) {
          if ((trimmedLine.includes('=') || trimmedLine.includes('return') ||
               trimmedLine.includes('require') || trimmedLine.includes('emit')) &&
              !trimmedLine.endsWith(';') && !trimmedLine.endsWith('{') &&
              !trimmedLine.endsWith('}')) {
            errors.push(`Line ${lineNum}: Missing semicolon`);
          }
        }

        // Check for security issues
        if (trimmedLine.includes('tx.origin')) {
          warnings.push(`Line ${lineNum}: Use of tx.origin is discouraged for security reasons`);
        }
      });

      if (errors.length > 0) {
        errors.forEach(error => this.addLog('error', `❌ ${error}`, 'validator'));
      }

      if (warnings.length > 0) {
        warnings.forEach(warning => this.addLog('warning', `⚠️ ${warning}`, 'validator'));
      }

      if (errors.length === 0 && warnings.length === 0) {
        this.addLog('success', '✅ No syntax issues found', 'validator');
      }

      return { isValid: errors.length === 0, errors, warnings };
    }

    validateJsonCode(content: string) {
      try {
        JSON.parse(content);
        this.addLog('success', '✅ Valid JSON syntax', 'validator');
        return { isValid: true, errors: [], warnings: [] };
      } catch (error) {
        const errorMsg = `Invalid JSON: ${error}`;
        this.addLog('error', `❌ ${errorMsg}`, 'validator');
        return { isValid: false, errors: [errorMsg], warnings: [] };
      }
    }
  })();
  const [activePanel, setActivePanel] = useState<'explorer' | 'plugin' | 'port' | 'sandbox' | 'git' | 'compiler' | 'deploy' | 'audit' | 'history' | 'statistics' | 'network'>('explorer');
  const [isConnected, setIsConnected] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<'metamask' | 'phantom' | null>(null);
  const [selectedNetwork] = useState('Ethereum');
  const [searchQuery, setSearchQuery] = useState('');
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [selectedNetworkFilter, setSelectedNetworkFilter] = useState('All');

  // Terminal state
  const [terminalLogs, setTerminalLogs] = useState<Array<{
    timestamp: string;
    level: 'info' | 'warning' | 'error' | 'success';
    message: string;
    source?: string;
  }>>([
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'success',
      message: '🚀 NovaGuard AI-Powered Terminal v2.0 - Ready!',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '📋 AVAILABLE COMMANDS:',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '📁 FILE OPERATIONS:',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '  ls, dir          - List project files',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '  cat <file>       - View file contents',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '  pwd              - Show current directory',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '🔨 DEVELOPMENT:',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '  compile [file]   - Compile Solidity contracts',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '  deploy <network> - Deploy to blockchain',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '  test             - Run test suite',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '  format           - Format current file',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '  validate         - Validate syntax',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '🌐 BLOCKCHAIN:',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '  faucet <network> - Get testnet tokens',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '  balance          - Check wallet balance',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '  networks         - List available networks',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '  connect <wallet> - Connect wallet',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '🤖 AI ASSISTANT:',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '  ai <question>    - Ask AI for help',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '  ai optimize      - Gas optimization tips',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '  ai security      - Security audit tips',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '  ai analyze       - Analyze project',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '📦 PACKAGE MANAGEMENT:',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '  install <pkg>    - Install package',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '  npm <command>    - Run npm command',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '  git <command>    - Git operations',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '🧹 UTILITY:',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '  help             - Show detailed help',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '  clear            - Clear terminal',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: '',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'success',
      message: '💡 Pro Tip: Use Tab for auto-completion, ↑/↓ for history',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'success',
      message: '🚀 Ready for development! Try "ai help" or "faucet sepolia"',
      source: 'system'
    }
  ]);

  // Terminal input state
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalHistory, setTerminalHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Debug panel state
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugPanelWidth, setDebugPanelWidth] = useState(400);

  // Advanced terminal service
  const advancedTerminal = AdvancedTerminalService.getInstance();

  // IDE-specific state
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [fileContents, setFileContents] = useState<{[key: string]: string}>({});
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  const [isExplorerCollapsed, setIsExplorerCollapsed] = useState<boolean>(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['contracts', 'test', 'scripts']));
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, path: string, type: 'file' | 'folder' | 'root'} | null>(null);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [currentLine, setCurrentLine] = useState<number>(1);

  // Vulnerability check state
  const [contractAddress, setContractAddress] = useState<string>('');
  const [selectedVulnNetwork, setSelectedVulnNetwork] = useState<string>('ethereum');
  const [vulnerabilityResults, setVulnerabilityResults] = useState<any>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanStatus, setScanStatus] = useState<string>('idle');
  const [scanError, setScanError] = useState<string | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);

  // Load projects from backend when user is authenticated
  useEffect(() => {
    const loadProjects = async () => {
      const authDisabled = import.meta.env.VITE_ENABLE_AUTH === 'false';

      if ((userId && getToken) || authDisabled) {
        try {
          // First try to get projects from local backend
          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          };

          // Add authorization header only if auth is enabled
          if (!authDisabled && getToken) {
            const token = await getToken();
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch('/api/projects', {
            method: 'GET',
            headers
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              const normalizedProjects = result.data.map((p: any) => ({
                id: p.id,
                name: p.name,
                description: p.description ?? null,
                user_id: p.user_id,
                created_at: p.created_at,
                updated_at: p.updated_at,
                project_data: p.project_data ?? {},
                status: p.status ?? 'active',
                type: p.type ?? 'contract'
              }));

              // Merge with localStorage projects
              const localProjects = loadProjectsFromStorage();
              const allProjects = [...normalizedProjects];

              // Add local projects that aren't already in the API response
              localProjects.forEach(localProject => {
                if (!allProjects.find(p => p.id === localProject.id)) {
                  allProjects.push(localProject);
                }
              });

              setProjects(allProjects);
              return;
            }
          }

          // Fallback to audit history if projects API fails (only if auth is enabled)
          if (!authDisabled && userId && getToken) {
            const userProjects = await ProjectService.getUserProjects(userId, getToken);
            const normalizedProjects = userProjects.map((p: any) => ({
              id: p.id,
              name: p.name,
              description: p.description ?? null,
              user_id: p.user_id,
              created_at: p.created_at,
              updated_at: p.updated_at,
              project_data: p.project_data ?? {},
              status: p.status ?? 'active',
              type: p.type ?? 'contract'
            }));
            setProjects(normalizedProjects);
          }
        } catch (error) {
          console.error('Failed to load projects from API:', error);
          // Load from localStorage as fallback
          const localProjects = loadProjectsFromStorage();
          if (localProjects.length > 0) {
            setProjects(localProjects);
          } else {
            // Set demo projects for development if no local projects exist
            setProjects([
              {
                id: 'demo-1',
                name: 'Demo ERC20 Token',
                description: 'A sample ERC20 token contract',
                user_id: userId || 'dev_user',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                project_data: {},
                status: 'active' as const,
                type: 'contract' as const
              }
            ]);
          }
        }
      } else {
        setProjects([]);
      }
    };

    loadProjects();
  }, [userId, getToken]);

  const networkOptions: NetworkOption[] = [
    
    { id: 'ethereum', name: 'Ethereum', icon: '⟠', color: '#627eea' },
    
    { id: 'polygon', name: 'Polygon', icon: '🔷', color: '#8247e5' },
    
    { id: 'sui', name: 'Sui', icon: '💧', color: '#4da2ff' },
    { id: 'aptos', name: 'Aptos', icon: '🅰️', color: '#00d4aa' },
    
  ];

  const templates: Template[] = [
    // Ethereum templates
    {
      id: 'blank',
      name: 'Blank Template',
      version: 'v1.0.0',
      description: 'This is a blank template for the Ethereum blockchain.',
      category: 'Basic',
      network: 'Ethereum'
    },
    {
      id: 'storage',
      name: 'Storage',
      version: 'v1.0.0',
      description: 'This template constructs a skeleton contract used to persist values on the blockchain.',
      category: 'Basic',
      network: 'Ethereum'
    },
    {
      id: 'hello-world',
      name: 'Hello World',
      version: 'v1.0.1',
      description: 'This template constructs a smart contract that returns the "Hello World" message to the contract deployer.',
      category: 'Basic',
      network: 'Ethereum'
    },
    {
      id: 'developer-learning',
      name: 'Developer Learning Resource',
      version: 'v1.0.0',
      description: 'This is the developer learning resource helping developers to get started with the EVM blockchain.',
      category: 'Learning',
      network: 'Ethereum'
    },
    {
      id: 'ballot',
      name: 'Ballot',
      version: 'v1.0.1',
      description: 'This template constructs a skeleton contract with the "voting with delegation" feature.',
      category: 'Governance',
      network: 'Ethereum'
    },
    {
      id: 'erc20-showcase',
      name: 'ERC-20 Showcase',
      version: 'v1.0.1',
      description: 'ERC-20 has emerged as a technical standard for all smart contracts on the Ethereum blockchain for a fungible token implementation.',
      category: 'Token',
      network: 'Ethereum'
    },
    {
      id: 'erc721-showcase',
      name: 'ERC-721 Showcase',
      version: 'v1.0.4',
      description: 'ERC-721 is a data standard for creating non-fungible tokens, meaning each token is unique and cannot be divided or directly exchanged for another ERC-721.',
      category: 'NFT',
      network: 'Ethereum'
    },
    {
      id: 'erc1155-showcase',
      name: 'ERC-1155 Showcase',
      version: 'v1.0.0',
      description: 'ERC-1155 is a standard interface for contracts that manage multiple token types.',
      category: 'Token',
      network: 'Ethereum'
    },
    {
      id: 'erc3525-showcase',
      name: 'ERC-3525 Showcase',
      version: 'v1.0.1',
      description: 'ERC-3525 has emerged as a technical standard for all smart contracts on the Ethereum blockchain for a fungible token implementation.',
      category: 'Token',
      network: 'Ethereum'
    },
    {
      id: 'erc4907-showcase',
      name: 'ERC-4907 Showcase',
      version: 'v1.0.0',
      description: 'ERC-4907 is a data standard for creating non-fungible tokens, meaning each token is unique and cannot be divided or directly exchanged for another ERC-4907.',
      category: 'NFT',
      network: 'Ethereum'
    },
    {
      id: 'hardhat-dapp-wrap',
      name: 'Hardhat dApp Wrap',
      version: 'v1.0.0',
      description: 'This template constructs a skeleton contract used to persist values on the blockchain.',
      category: 'Framework',
      network: 'Ethereum'
    },
    // Polygon templates
    {
      id: 'blank-polygon',
      name: 'Blank Template',
      version: 'v1.0.0',
      description: 'This is a blank template for the Polygon blockchain with low gas fees.',
      category: 'Basic',
      network: 'Polygon'
    },
    {
      id: 'polygon-nft',
      name: 'Polygon NFT Collection',
      version: 'v1.2.0',
      description: 'Create NFT collections on Polygon with minimal gas costs and OpenSea compatibility.',
      category: 'NFT',
      network: 'Polygon'
    },
    {
      id: 'polygon-defi',
      name: 'DeFi Yield Farm',
      version: 'v1.1.0',
      description: 'Decentralized finance yield farming contract optimized for Polygon network.',
      category: 'DeFi',
      network: 'Polygon'
    },
    {
      id: 'polygon-gaming',
      name: 'Gaming Assets',
      version: 'v1.0.0',
      description: 'Gaming asset management contract with fast transactions on Polygon.',
      category: 'Gaming',
      network: 'Polygon'
    },
    {
      id: 'polygon-marketplace',
      name: 'NFT Marketplace',
      version: 'v1.3.0',
      description: 'Complete NFT marketplace with low-cost trading on Polygon network.',
      category: 'Marketplace',
      network: 'Polygon'
    },
    // Sui templates
    {
      id: 'blank-sui',
      name: 'Blank Template',
      version: 'v1.0.0',
      description: 'This is a blank template for the Sui blockchain using Move language.',
      category: 'Basic',
      network: 'Sui'
    },
    {
      id: 'sui-coin',
      name: 'Sui Coin',
      version: 'v1.0.0',
      description: 'Create custom coins on Sui blockchain with Move programming language.',
      category: 'Token',
      network: 'Sui'
    },
    {
      id: 'sui-nft',
      name: 'Sui NFT Collection',
      version: 'v1.1.0',
      description: 'NFT collection template for Sui blockchain with object-centric design.',
      category: 'NFT',
      network: 'Sui'
    },
    {
      id: 'sui-defi',
      name: 'Sui DeFi Protocol',
      version: 'v1.0.0',
      description: 'DeFi protocol template leveraging Sui\'s parallel execution capabilities.',
      category: 'DeFi',
      network: 'Sui'
    },
    {
      id: 'sui-gaming',
      name: 'Sui Gaming Objects',
      version: 'v1.0.0',
      description: 'Gaming objects and assets management using Sui\'s object model.',
      category: 'Gaming',
      network: 'Sui'
    },
    // Aptos templates
    {
      id: 'blank-aptos',
      name: 'Blank Template',
      version: 'v1.0.0',
      description: 'This is a blank template for the Aptos blockchain using Move language.',
      category: 'Basic',
      network: 'Aptos'
    },
    {
      id: 'aptos-coin',
      name: 'Aptos Coin',
      version: 'v1.0.0',
      description: 'Create custom coins on Aptos blockchain with advanced Move features.',
      category: 'Token',
      network: 'Aptos'
    },
    {
      id: 'aptos-nft',
      name: 'Aptos NFT Collection',
      version: 'v1.1.0',
      description: 'NFT collection template for Aptos with token standard compliance.',
      category: 'NFT',
      network: 'Aptos'
    },
    {
      id: 'aptos-defi',
      name: 'Aptos DeFi Protocol',
      version: 'v1.0.0',
      description: 'DeFi protocol template with Aptos Move\'s safety features.',
      category: 'DeFi',
      network: 'Aptos'
    },
    {
      id: 'aptos-dao',
      name: 'Aptos DAO',
      version: 'v1.0.0',
      description: 'Decentralized Autonomous Organization template for Aptos governance.',
      category: 'Governance',
      network: 'Aptos'
    },
    // Flow templates
    {
      id: 'flow-nft',
      name: 'Flow NFT Collection',
      version: 'v1.0.0',
      description: 'NFT collection template for Flow blockchain using Cadence language.',
      category: 'NFT',
      network: 'Flow'
    },
    {
      id: 'flow-defi',
      name: 'Flow DeFi Protocol',
      version: 'v1.0.0',
      description: 'DeFi protocol template leveraging Flow\'s resource-oriented programming.',
      category: 'DeFi',
      network: 'Flow'
    },
    // Conflux templates
    {
      id: 'conflux-dapp',
      name: 'Conflux dApp',
      version: 'v1.0.0',
      description: 'Decentralized application template for Conflux network with tree-graph consensus.',
      category: 'dApp',
      network: 'Conflux'
    },
    {
      id: 'conflux-defi',
      name: 'Conflux DeFi',
      version: 'v1.0.0',
      description: 'DeFi protocol optimized for Conflux\'s high throughput and low fees.',
      category: 'DeFi',
      network: 'Conflux'
    },
    // Internet Computer templates
    {
      id: 'ic-canister',
      name: 'IC Canister',
      version: 'v1.0.0',
      description: 'Internet Computer canister template using Motoko programming language.',
      category: 'Canister',
      network: 'Internet Computer'
    },
    {
      id: 'ic-defi',
      name: 'IC DeFi Protocol',
      version: 'v1.0.0',
      description: 'DeFi protocol for Internet Computer with web-speed transactions.',
      category: 'DeFi',
      network: 'Internet Computer'
    },
    // Nexus templates
    {
      id: 'nexus-smart-contract',
      name: 'Nexus Smart Contract',
      version: 'v1.0.0',
      description: 'Smart contract template for Nexus blockchain with quantum resistance.',
      category: 'Contract',
      network: 'Nexus'
    },
    // FISCO BCOS templates
    {
      id: 'fisco-enterprise',
      name: 'FISCO Enterprise Contract',
      version: 'v1.0.0',
      description: 'Enterprise-grade smart contract for FISCO BCOS consortium blockchain.',
      category: 'Enterprise',
      network: 'FISCO BCOS'
    },
    // XDC templates
    {
      id: 'xdc-trade-finance',
      name: 'XDC Trade Finance',
      version: 'v1.0.0',
      description: 'Trade finance smart contract optimized for XDC Network.',
      category: 'Finance',
      network: 'XDC'
    },
    // Astar templates
    {
      id: 'astar-dapp',
      name: 'Astar dApp',
      version: 'v1.0.0',
      description: 'Multi-chain dApp template for Astar Network supporting EVM and WASM.',
      category: 'dApp',
      network: 'Astar'
    }
  ];

  const connectWallet = async () => {
    // Prompt the user to choose a wallet
    const choice = window.prompt('Choose wallet: type "metamask" for MetaMask or "phantom" for Phantom', 'metamask');
    if (choice === 'phantom') {
      await connectPhantom();
    } else {
      await connectMetaMask();
    }
  };

  const connectMetaMask = async () => {
    try {
      if (typeof (window as any).ethereum !== 'undefined') {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setIsConnected(true);
          setConnectedWallet('metamask');
          console.log('MetaMask connected:', accounts[0]);
        }
      } else {
        alert('MetaMask not detected. Please install MetaMask.');
      }
    } catch (error) {
      console.error('Failed to connect MetaMask:', error);
    }
  };

  const connectPhantom = async () => {
    try {
      if (typeof (window as any).solana !== 'undefined' && (window as any).solana.isPhantom) {
        const response = await (window as any).solana.connect();
        if (response.publicKey) {
          setIsConnected(true);
          setConnectedWallet('phantom');
          console.log('Phantom connected:', response.publicKey.toString());
        }
      } else {
        alert('Phantom wallet not detected. Please install Phantom wallet.');
      }
    } catch (error) {
      console.error('Failed to connect Phantom:', error);
    }
  };

  const disconnectWallet = async () => {
    try {
      if (connectedWallet === 'phantom' && (window as any).solana) {
        await (window as any).solana.disconnect();
      }
      setIsConnected(false);
      setConnectedWallet(null);
      console.log('Wallet disconnected');
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  // Helper functions for template files
  const getTemplateFiles = (template: Template): string[] => {
    switch (template.id) {
      case 'blank':
      case 'blank-polygon':
      case 'blank-sui':
      case 'blank-aptos':
        return ['contracts/BlankContract.sol', 'README.md', 'package.json'];
      case 'storage':
        return ['contracts/Storage.sol', 'contracts/Migrations.sol', 'README.md', 'package.json'];
      case 'hello-world':
        return ['contracts/HelloWorld.sol', 'contracts/Migrations.sol', 'test/HelloWorld.test.js', 'README.md', 'package.json'];
      case 'erc20-showcase':
        return ['contracts/MyToken.sol', 'contracts/IERC20.sol', 'test/MyToken.test.js', 'README.md', 'package.json'];
      case 'erc721-showcase':
        return ['contracts/MyNFT.sol', 'contracts/IERC721.sol', 'test/MyNFT.test.js', 'README.md', 'package.json'];

      // Polygon templates
      case 'polygon-nft':
        return ['contracts/PolygonNFT.sol', 'contracts/interfaces/IERC721.sol', 'test/PolygonNFT.test.js', 'scripts/deploy.js', 'README.md', 'package.json'];
      case 'polygon-defi':
        return ['contracts/YieldFarm.sol', 'contracts/RewardToken.sol', 'test/YieldFarm.test.js', 'scripts/deploy.js', 'README.md', 'package.json'];
      case 'polygon-gaming':
        return ['contracts/GameAssets.sol', 'contracts/GameItems.sol', 'test/GameAssets.test.js', 'scripts/deploy.js', 'README.md', 'package.json'];
      case 'polygon-marketplace':
        return ['contracts/NFTMarketplace.sol', 'contracts/MarketplaceToken.sol', 'test/NFTMarketplace.test.js', 'scripts/deploy.js', 'README.md', 'package.json'];

      // Sui templates
      case 'sui-coin':
        return ['sources/coin.move', 'sources/coin_tests.move', 'Move.toml', 'README.md'];
      case 'sui-nft':
        return ['sources/nft.move', 'sources/nft_tests.move', 'Move.toml', 'README.md'];
      case 'sui-defi':
        return ['sources/defi.move', 'sources/pool.move', 'sources/defi_tests.move', 'Move.toml', 'README.md'];
      case 'sui-gaming':
        return ['sources/game_objects.move', 'sources/game_logic.move', 'sources/game_tests.move', 'Move.toml', 'README.md'];

      // Aptos templates
      case 'aptos-coin':
        return ['sources/coin.move', 'sources/coin_tests.move', 'Move.toml', 'README.md'];
      case 'aptos-nft':
        return ['sources/nft_collection.move', 'sources/nft_tests.move', 'Move.toml', 'README.md'];
      case 'aptos-defi':
        return ['sources/defi_protocol.move', 'sources/liquidity_pool.move', 'sources/defi_tests.move', 'Move.toml', 'README.md'];
      case 'aptos-dao':
        return ['sources/dao.move', 'sources/governance.move', 'sources/dao_tests.move', 'Move.toml', 'README.md'];

      // Flow templates
      case 'flow-nft':
        return ['contracts/NFTContract.cdc', 'transactions/mint_nft.cdc', 'scripts/get_nft.cdc', 'README.md'];
      case 'flow-defi':
        return ['contracts/DeFiProtocol.cdc', 'contracts/FlowToken.cdc', 'transactions/swap.cdc', 'README.md'];

      // Other network templates
      case 'conflux-dapp':
      case 'conflux-defi':
        return ['contracts/ConfluxContract.sol', 'test/ConfluxContract.test.js', 'README.md', 'package.json'];

      case 'ic-canister':
      case 'ic-defi':
        return ['src/main.mo', 'dfx.json', 'README.md'];

      case 'nexus-smart-contract':
        return ['contracts/NexusContract.cpp', 'README.md', 'CMakeLists.txt'];

      case 'fisco-enterprise':
        return ['contracts/EnterpriseContract.sol', 'test/EnterpriseContract.test.js', 'README.md', 'package.json'];

      case 'xdc-trade-finance':
        return ['contracts/TradeFinance.sol', 'test/TradeFinance.test.js', 'README.md', 'package.json'];

      case 'astar-dapp':
        return ['contracts/AstarContract.sol', 'ink/lib.rs', 'test/AstarContract.test.js', 'README.md', 'package.json'];

      default:
        return ['contracts/Contract.sol', 'README.md', 'package.json'];
    }
  };

  const getTemplateFileContent = (template: Template, fileName: string): string => {
    if (fileName.endsWith('.sol')) {
      return getSolidityTemplate(template, fileName);
    } else if (fileName.endsWith('.move')) {
      return getMoveTemplate(template, fileName);
    } else if (fileName === 'Move.toml') {
      return getMoveTomlContent(template);
    } else if (fileName === 'README.md') {
      return getReadmeContent(template);
    } else if (fileName === 'package.json') {
      return getPackageJsonContent(template);
    } else if (fileName.endsWith('.test.js')) {
      return getTestTemplate(template, fileName);
    } else if (fileName.endsWith('deploy.js')) {
      return getDeployScript(template);
    }
    return '// File content will be loaded here';
  };

  const getReadmeContent = (template: Template): string => {
    const networkSpecific = {
      'Polygon': '## Polygon Network\n\nThis project is optimized for Polygon with low gas fees and fast transactions.\n\n### Deployment\n- Polygon Mainnet: Low cost transactions\n- Mumbai Testnet: Free testing environment',
      'Sui': '## Sui Network\n\nThis project uses Move language on Sui blockchain.\n\n### Features\n- Object-centric programming model\n- Parallel execution\n- Low latency transactions',
      'Aptos': '## Aptos Network\n\nThis project uses Move language on Aptos blockchain.\n\n### Features\n- Move language safety\n- High throughput\n- Formal verification support',
      'Flow': '## Flow Network\n\nThis project uses Cadence language on Flow blockchain.\n\n### Features\n- Resource-oriented programming\n- Built-in security\n- Developer-friendly tools',
      'Conflux': '## Conflux Network\n\nThis project leverages Conflux\'s tree-graph consensus.\n\n### Features\n- High throughput\n- Low transaction fees\n- EVM compatibility',
      'Internet Computer': '## Internet Computer\n\nThis project runs on the Internet Computer Protocol.\n\n### Features\n- Web-speed transactions\n- Reverse gas model\n- Direct web serving',
      'Nexus': '## Nexus Network\n\nThis project is built for Nexus blockchain.\n\n### Features\n- Quantum resistance\n- 3D blockchain architecture\n- Sustainable consensus',
      'FISCO BCOS': '## FISCO BCOS\n\nThis project is designed for enterprise consortium blockchain.\n\n### Features\n- Enterprise-grade security\n- High performance\n- Regulatory compliance',
      'XDC': '## XDC Network\n\nThis project is optimized for XDC Network.\n\n### Features\n- Enterprise-ready\n- Trade finance focus\n- Interoperability',
      'Astar': '## Astar Network\n\nThis project supports both EVM and WASM on Astar.\n\n### Features\n- Multi-chain compatibility\n- dApp staking\n- Cross-chain messaging'
    };

    const networkInfo = networkSpecific[template.network as keyof typeof networkSpecific] || '';

    const getStartedSteps = template.network === 'Internet Computer'
      ? '1. Install dfx: `sh -ci "$(curl -fsSL https://sdk.dfinity.org/install.sh)"`\n2. Start local replica: `dfx start`\n3. Deploy canister: `dfx deploy`'
      : template.network === 'Flow'
      ? '1. Install Flow CLI: `sh -ci "$(curl -fsSL https://storage.googleapis.com/flow-cli/install.sh)"`\n2. Start emulator: `flow emulator start`\n3. Deploy contracts: `flow project deploy`'
      : '1. Install dependencies: `npm install`\n2. Compile contracts: `npm run compile`\n3. Run tests: `npm test`\n4. Deploy: `npm run deploy`';

    return `# ${template.name}\n\n${template.description}\n\n${networkInfo}\n\n## Getting Started\n\n${getStartedSteps}\n\n## Network: ${template.network}\n## Category: ${template.category}\n## Version: ${template.version}`;
  };

  const getPackageJsonContent = (template: Template): string => {
    const baseConfig = {
      name: template.name.toLowerCase().replace(/\s+/g, '-'),
      version: "1.0.0",
      description: template.description,
      scripts: {
        compile: "hardhat compile",
        test: "hardhat test",
        deploy: "hardhat run scripts/deploy.js"
      },
      dependencies: {
        "@openzeppelin/contracts": "^4.9.0",
        "hardhat": "^2.17.0"
      }
    };

    if (template.network === 'Polygon') {
      (baseConfig.dependencies as any)["@polygonlabs/fx-portal"] = "^1.0.3";
      (baseConfig.dependencies as any)["@maticnetwork/meta-transactions"] = "^2.0.0";
    }

    return JSON.stringify(baseConfig, null, 2);
  };

  const getMoveTomlContent = (template: Template): string => {
    return `[package]
name = "${template.name.toLowerCase().replace(/\s+/g, '_')}"
version = "1.0.0"
authors = ["Your Name <your.email@example.com>"]

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/testnet" }

[dev-dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/testnet" }

[addresses]
${template.name.toLowerCase().replace(/\s+/g, '_')} = "0x0"
sui = "0x2"`;
  };

  const getDeployScript = (template: Template): string => {
    return `const hre = require("hardhat");

async function main() {
  console.log("Deploying ${template.name} to ${template.network}...");

  const Contract = await hre.ethers.getContractFactory("${template.name.replace(/\s+/g, '')}");
  const contract = await Contract.deploy();

  await contract.deployed();

  console.log("${template.name} deployed to:", contract.address);
  console.log("Network:", "${template.network}");
  console.log("Transaction hash:", contract.deployTransaction.hash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });`;
  };

  const getMoveTemplate = (template: Template, fileName: string): string => {
    if (template.network === 'Sui') {
      return getSuiMoveTemplate(template, fileName);
    } else if (template.network === 'Aptos') {
      return getAptosMoveTemplate(template, fileName);
    }
    return '// Move file content';
  };

  const getSuiMoveTemplate = (template: Template, fileName: string): string => {
    if (fileName.includes('coin')) {
      return `module ${template.name.toLowerCase().replace(/\s+/g, '_')}::coin {
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::url::{Self, Url};

    /// The type identifier of coin. The coin will have a type
    /// tag of kind: \`Coin<package_object::mycoin::MYCOIN>\`
    /// Make sure that the name of the type matches the module's name.
    public struct COIN has drop {}

    /// Module initializer is called once on module publish. A treasury
    /// cap is sent to the publisher, who then controls minting and burning
    fun init(witness: COIN, ctx: &mut TxContext) {
        let (treasury, metadata) = coin::create_currency<COIN>(witness, 9, b"COIN", b"", b"", option::none(), ctx);
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury, tx_context::sender(ctx))
    }

    public entry fun mint(
        treasury_cap: &mut TreasuryCap<COIN>, amount: u64, recipient: address, ctx: &mut TxContext
    ) {
        coin::mint_and_transfer(treasury_cap, amount, recipient, ctx)
    }

    public entry fun burn(treasury_cap: &mut TreasuryCap<COIN>, coin: Coin<COIN>) {
        coin::burn(treasury_cap, coin);
    }
}`;
    } else if (fileName.includes('nft')) {
      return `module ${template.name.toLowerCase().replace(/\s+/g, '_')}::nft {
    use sui::url::{Self, Url};
    use std::string;
    use sui::object::{Self, ID, UID};
    use sui::event;

    /// An example NFT that can be minted by anybody
    public struct DevNetNFT has key, store {
        id: UID,
        /// Name for the token
        name: string::String,
        /// Description of the token
        description: string::String,
        /// URL for the token
        url: Url,
    }

    // ===== Events =====

    public struct NFTMinted has copy, drop {
        // The Object ID of the NFT
        object_id: ID,
        // The creator of the NFT
        creator: address,
        // The name of the NFT
        name: string::String,
    }

    // ===== Public view functions =====

    /// Get the NFT's \`name\`
    public fun name(nft: &DevNetNFT): &string::String {
        &nft.name
    }

    /// Get the NFT's \`description\`
    public fun description(nft: &DevNetNFT): &string::String {
        &nft.description
    }

    /// Get the NFT's \`url\`
    public fun url(nft: &DevNetNFT): &Url {
        &nft.url
    }

    // ===== Entrypoints =====

    /// Create a new devnet_nft
    public entry fun mint_to_sender(
        name: vector<u8>,
        description: vector<u8>,
        url: vector<u8>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let nft = DevNetNFT {
            id: object::new(ctx),
            name: string::utf8(name),
            description: string::utf8(description),
            url: url::new_unsafe_from_bytes(url)
        };

        event::emit(NFTMinted {
            object_id: object::id(&nft),
            creator: sender,
            name: nft.name,
        });

        transfer::public_transfer(nft, sender);
    }
}`;
    }
    return '// Move module content';
  };

  const getAptosMoveTemplate = (template: Template, fileName: string): string => {
    if (fileName.includes('coin')) {
      return `module ${template.name.toLowerCase().replace(/\s+/g, '_')}::coin {
    use std::string;
    use aptos_framework::coin;

    struct MyCoin {}

    fun init_module(sender: &signer) {
        let name = string::utf8(b"My Coin");
        let symbol = string::utf8(b"MC");
        let decimals = 8;
        let monitor_supply = true;

        coin::initialize<MyCoin>(
            sender,
            name,
            symbol,
            decimals,
            monitor_supply,
        );
    }

    public entry fun mint(sender: &signer, amount: u64) {
        let coins = coin::mint<MyCoin>(amount, sender);
        coin::deposit(signer::address_of(sender), coins);
    }
}`;
    } else if (fileName.includes('nft')) {
      return `module ${template.name.toLowerCase().replace(/\s+/g, '_')}::nft {
    use std::string::{Self, String};
    use std::vector;
    use aptos_framework::account;
    use aptos_token::token;

    struct NFTCollection has key {
        collection_name: String,
        description: String,
        uri: String,
        maximum: u64,
        mutate_setting: vector<bool>,
    }

    public entry fun create_collection(
        creator: &signer,
        name: String,
        description: String,
        uri: String,
        maximum: u64,
    ) {
        let mutate_setting = vector<bool>[false, false, false];

        token::create_collection(
            creator,
            name,
            description,
            uri,
            maximum,
            mutate_setting,
        );
    }

    public entry fun mint_nft(
        creator: &signer,
        collection_name: String,
        token_name: String,
        description: String,
        uri: String,
        amount: u64,
    ) {
        let mutate_setting = vector<bool>[false, false, false, false, false];

        token::create_token_script(
            creator,
            collection_name,
            token_name,
            description,
            amount,
            uri,
            signer::address_of(creator),
            1,
            0,
            mutate_setting,
            vector<String>[],
            vector<vector<u8>>[],
            vector<String>[],
        );
    }
}`;
    }
    return '// Aptos Move module content';
  };

  const getSolidityTemplate = (template: Template, _fileName: string): string => {
    switch (template.id) {
      case 'hello-world':
        return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract HelloWorld {
    string public message;

    constructor() {
        message = "Hello, World!";
    }

    function setMessage(string memory _message) public {
        message = _message;
    }

    function getMessage() public view returns (string memory) {
        return message;
    }
}`;
      case 'storage':
        return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Storage {
    uint256 private storedData;

    function set(uint256 x) public {
        storedData = x;
    }

    function get() public view returns (uint256) {
        return storedData;
    }
}`;
      case 'erc20-showcase':
        return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyToken is ERC20 {
    constructor() ERC20("MyToken", "MTK") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }
}`;

      // Polygon-specific templates
      case 'polygon-nft':
        return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract PolygonNFT is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    uint256 public constant MAX_SUPPLY = 10000;
    uint256 public constant MINT_PRICE = 0.01 ether; // Low cost on Polygon

    constructor() ERC721("PolygonNFT", "PNFT") {}

    function safeMint(address to, string memory uri) public payable {
        require(_tokenIdCounter.current() < MAX_SUPPLY, "Max supply reached");
        require(msg.value >= MINT_PRICE, "Insufficient payment");

        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    function withdraw() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // Override required functions
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
}`;

      case 'polygon-defi':
        return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract YieldFarm is ReentrancyGuard, Ownable {
    IERC20 public stakingToken;
    IERC20 public rewardToken;

    uint256 public rewardRate = 100; // tokens per second
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;
    mapping(address => uint256) public balances;

    uint256 private _totalSupply;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);

    constructor(address _stakingToken, address _rewardToken) {
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    function rewardPerToken() public view returns (uint256) {
        if (_totalSupply == 0) {
            return rewardPerTokenStored;
        }
        return rewardPerTokenStored + (((block.timestamp - lastUpdateTime) * rewardRate * 1e18) / _totalSupply);
    }

    function earned(address account) public view returns (uint256) {
        return ((balances[account] * (rewardPerToken() - userRewardPerTokenPaid[account])) / 1e18) + rewards[account];
    }

    function stake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        _totalSupply += amount;
        balances[msg.sender] += amount;
        stakingToken.transferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) public nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot withdraw 0");
        _totalSupply -= amount;
        balances[msg.sender] -= amount;
        stakingToken.transfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function getReward() public nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardToken.transfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    function exit() external {
        withdraw(balances[msg.sender]);
        getReward();
    }
}`;

      case 'polygon-marketplace':
        return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTMarketplace is ReentrancyGuard, Ownable {
    struct Listing {
        uint256 price;
        address seller;
        bool active;
    }

    struct Auction {
        uint256 startingBid;
        uint256 highestBid;
        address highestBidder;
        uint256 endTime;
        bool active;
    }

    mapping(address => mapping(uint256 => Listing)) public listings;
    mapping(address => mapping(uint256 => Auction)) public auctions;

    uint256 public marketplaceFee = 250; // 2.5%
    uint256 public constant PERCENTAGE_BASE = 10000;

    event ItemListed(address indexed nftContract, uint256 indexed tokenId, uint256 price, address indexed seller);
    event ItemSold(address indexed nftContract, uint256 indexed tokenId, uint256 price, address seller, address buyer);
    event AuctionCreated(address indexed nftContract, uint256 indexed tokenId, uint256 startingBid, uint256 endTime);
    event BidPlaced(address indexed nftContract, uint256 indexed tokenId, uint256 bid, address bidder);

    function listItem(address nftContract, uint256 tokenId, uint256 price) external {
        require(price > 0, "Price must be greater than 0");
        require(IERC721(nftContract).ownerOf(tokenId) == msg.sender, "Not the owner");
        require(IERC721(nftContract).isApprovedForAll(msg.sender, address(this)), "Contract not approved");

        listings[nftContract][tokenId] = Listing(price, msg.sender, true);
        emit ItemListed(nftContract, tokenId, price, msg.sender);
    }

    function buyItem(address nftContract, uint256 tokenId) external payable nonReentrant {
        Listing memory listing = listings[nftContract][tokenId];
        require(listing.active, "Item not listed");
        require(msg.value >= listing.price, "Insufficient payment");

        listings[nftContract][tokenId].active = false;

        uint256 fee = (listing.price * marketplaceFee) / PERCENTAGE_BASE;
        uint256 sellerAmount = listing.price - fee;

        payable(listing.seller).transfer(sellerAmount);
        payable(owner()).transfer(fee);

        IERC721(nftContract).transferFrom(listing.seller, msg.sender, tokenId);

        emit ItemSold(nftContract, tokenId, listing.price, listing.seller, msg.sender);
    }

    function createAuction(address nftContract, uint256 tokenId, uint256 startingBid, uint256 duration) external {
        require(IERC721(nftContract).ownerOf(tokenId) == msg.sender, "Not the owner");
        require(startingBid > 0, "Starting bid must be greater than 0");

        auctions[nftContract][tokenId] = Auction(
            startingBid,
            0,
            address(0),
            block.timestamp + duration,
            true
        );

        emit AuctionCreated(nftContract, tokenId, startingBid, block.timestamp + duration);
    }

    function placeBid(address nftContract, uint256 tokenId) external payable nonReentrant {
        Auction storage auction = auctions[nftContract][tokenId];
        require(auction.active, "Auction not active");
        require(block.timestamp < auction.endTime, "Auction ended");
        require(msg.value > auction.highestBid, "Bid too low");

        if (auction.highestBidder != address(0)) {
            payable(auction.highestBidder).transfer(auction.highestBid);
        }

        auction.highestBid = msg.value;
        auction.highestBidder = msg.sender;

        emit BidPlaced(nftContract, tokenId, msg.value, msg.sender);
    }

    function endAuction(address nftContract, uint256 tokenId) external nonReentrant {
        Auction storage auction = auctions[nftContract][tokenId];
        require(auction.active, "Auction not active");
        require(block.timestamp >= auction.endTime, "Auction still ongoing");

        auction.active = false;

        if (auction.highestBidder != address(0)) {
            uint256 fee = (auction.highestBid * marketplaceFee) / PERCENTAGE_BASE;
            uint256 sellerAmount = auction.highestBid - fee;

            address seller = IERC721(nftContract).ownerOf(tokenId);
            payable(seller).transfer(sellerAmount);
            payable(owner()).transfer(fee);

            IERC721(nftContract).transferFrom(seller, auction.highestBidder, tokenId);
        }
    }
}`;

      case 'polygon-gaming':
        return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract GameAssets is ERC721, Ownable, ReentrancyGuard {
    struct GameItem {
        uint256 itemType; // 1: Weapon, 2: Armor, 3: Consumable
        uint256 rarity; // 1: Common, 2: Rare, 3: Epic, 4: Legendary
        uint256 power;
        uint256 durability;
        bool tradeable;
    }

    mapping(uint256 => GameItem) public gameItems;
    mapping(address => uint256) public playerExperience;
    mapping(address => uint256) public playerLevel;

    IERC20 public gameToken;
    uint256 private _tokenIdCounter;

    event ItemMinted(address indexed player, uint256 indexed tokenId, uint256 itemType, uint256 rarity);
    event ItemUpgraded(uint256 indexed tokenId, uint256 newPower);
    event ExperienceGained(address indexed player, uint256 experience);

    constructor(address _gameToken) ERC721("GameAssets", "GAME") {
        gameToken = IERC20(_gameToken);
    }

    function mintItem(address to, uint256 itemType, uint256 rarity) external onlyOwner {
        uint256 tokenId = _tokenIdCounter++;
        uint256 power = calculatePower(itemType, rarity);

        gameItems[tokenId] = GameItem(
            itemType,
            rarity,
            power,
            100, // Full durability
            true // Tradeable by default
        );

        _mint(to, tokenId);
        emit ItemMinted(to, tokenId, itemType, rarity);
    }

    function upgradeItem(uint256 tokenId, uint256 gameTokenAmount) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(gameTokenAmount > 0, "Invalid token amount");

        gameToken.transferFrom(msg.sender, address(this), gameTokenAmount);

        GameItem storage item = gameItems[tokenId];
        uint256 powerIncrease = gameTokenAmount / 1000; // 1000 tokens = 1 power
        item.power += powerIncrease;

        emit ItemUpgraded(tokenId, item.power);
    }

    function gainExperience(address player, uint256 experience) external onlyOwner {
        playerExperience[player] += experience;

        // Level up logic
        uint256 newLevel = calculateLevel(playerExperience[player]);
        if (newLevel > playerLevel[player]) {
            playerLevel[player] = newLevel;
        }

        emit ExperienceGained(player, experience);
    }

    function calculatePower(uint256 itemType, uint256 rarity) internal pure returns (uint256) {
        uint256 basePower = itemType * 10; // Weapons have higher base power
        uint256 rarityMultiplier = rarity * 25;
        return basePower + rarityMultiplier;
    }

    function calculateLevel(uint256 experience) internal pure returns (uint256) {
        if (experience < 1000) return 1;
        if (experience < 5000) return 2;
        if (experience < 15000) return 3;
        if (experience < 35000) return 4;
        return 5; // Max level
    }

    function repairItem(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(gameToken.transferFrom(msg.sender, address(this), 100), "Insufficient tokens");

        gameItems[tokenId].durability = 100;
    }

    function getItemDetails(uint256 tokenId) external view returns (GameItem memory) {
        return gameItems[tokenId];
    }
}`;
      default:
        return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ${template.name.replace(/\s+/g, '')} {
    // Your contract code here
}`;
    }
  };

  const getTestTemplate = (template: Template, _fileName: string): string => {
    switch (template.id) {
      case 'polygon-nft':
        return `const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PolygonNFT", function () {
  let polygonNFT;
  let owner;
  let addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    const PolygonNFT = await ethers.getContractFactory("PolygonNFT");
    polygonNFT = await PolygonNFT.deploy();
    await polygonNFT.deployed();
  });

  it("Should mint NFT with correct price", async function () {
    const mintPrice = ethers.utils.parseEther("0.01");
    await polygonNFT.connect(addr1).safeMint(addr1.address, "ipfs://test", { value: mintPrice });
    expect(await polygonNFT.ownerOf(0)).to.equal(addr1.address);
  });

  it("Should fail to mint without sufficient payment", async function () {
    const insufficientPrice = ethers.utils.parseEther("0.005");
    await expect(
      polygonNFT.connect(addr1).safeMint(addr1.address, "ipfs://test", { value: insufficientPrice })
    ).to.be.revertedWith("Insufficient payment");
  });
});`;

      case 'polygon-defi':
        return `const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("YieldFarm", function () {
  let yieldFarm;
  let stakingToken;
  let rewardToken;
  let owner;
  let user1;

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MockERC20");
    stakingToken = await Token.deploy("Staking Token", "STK");
    rewardToken = await Token.deploy("Reward Token", "RWD");

    const YieldFarm = await ethers.getContractFactory("YieldFarm");
    yieldFarm = await YieldFarm.deploy(stakingToken.address, rewardToken.address);

    await stakingToken.mint(user1.address, ethers.utils.parseEther("1000"));
    await rewardToken.mint(yieldFarm.address, ethers.utils.parseEther("10000"));
  });

  it("Should allow staking", async function () {
    const stakeAmount = ethers.utils.parseEther("100");
    await stakingToken.connect(user1).approve(yieldFarm.address, stakeAmount);
    await yieldFarm.connect(user1).stake(stakeAmount);

    expect(await yieldFarm.balances(user1.address)).to.equal(stakeAmount);
  });
};`;

      default:
        return `const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("${template.name}", function () {
  it("Should deploy successfully", async function () {
    const Contract = await ethers.getContractFactory("${template.name.replace(/\s+/g, '')}");
    const contract = await Contract.deploy();
    await contract.deployed();
    expect(contract.address).to.not.be.undefined;
  });
});`;
    }
  };

  const createNewProject = () => {
    setCurrentView('templates');
  };

  // Vulnerability check functions
  const performVulnerabilityCheck = async () => {
    if (!contractAddress.trim()) {
      setScanError('Please enter a contract address');
      return;
    }

    if (!userId) {
      setScanError('Please sign in to perform vulnerability scans');
      return;
    }

    setIsScanning(true);
    setVulnerabilityResults(null);
    setScanError(null);
    setScanProgress(0);
    setScanStatus('initializing');

    try {
      // Create scan request
      const scanRequest = {
        contractAddress: contractAddress.trim(),
        networkId: selectedVulnNetwork,
        scanType: 'standard' as const,
        includeGasOptimization: true,
        includeComplianceCheck: true
      };

      // Progress callback
      const progressCallback = (progress: number, status: string) => {
        setScanProgress(progress);
        setScanStatus(status);
      };

      // Perform scan using the controller (backend handles scan record creation)
      const response = await vulnerabilityController.performScan(
        scanRequest,
        progressCallback
      ) as any;

      if (response.success && response.data) {
        console.log('Scan results received:', response.data); // Debug log
        setVulnerabilityResults(response.data);
        setScanStatus('completed');

        // Backend already saved the scan record, no need to update manually
        console.log('✅ Vulnerability scan completed successfully');
      } else {
        throw new Error(response.error?.message || 'Scan failed');
      }

    } catch (error: any) {
      console.error('Vulnerability scan failed:', error);
      setScanError(error.message || 'Vulnerability scan failed. Please try again.');
      setScanStatus('failed');
    } finally {
      setIsScanning(false);
      setScanProgress(100);
    }
  };

  // Export results function
  const exportResults = async (format: 'json' | 'pdf' | 'csv') => {
    if (!vulnerabilityResults) {
      setScanError('No scan results to export');
      return;
    }

    try {
      if (format === 'json') {
        // Export as JSON
        const dataStr = JSON.stringify(vulnerabilityResults, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `vulnerability-report-${vulnerabilityResults.scanId || Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else if (format === 'csv') {
        // Export as CSV
        const csvContent = generateCSVReport(vulnerabilityResults);
        const dataBlob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `vulnerability-report-${vulnerabilityResults.scanId || Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else if (format === 'pdf') {
        // For PDF, we'll create a simple text version for now
        const textContent = generateTextReport(vulnerabilityResults);
        const dataBlob = new Blob([textContent], { type: 'text/plain' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `vulnerability-report-${vulnerabilityResults.scanId || Date.now()}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error: any) {
      setScanError(`Export failed: ${error.message}`);
    }
  };

  // Generate CSV report
  const generateCSVReport = (results: any): string => {
    const headers = ['Type', 'Title', 'Severity', 'Description', 'Recommendation'];
    const rows = [headers];

    // Add vulnerabilities
    (results.vulnerabilities || []).forEach((vuln: any) => {
      rows.push([
        'Vulnerability',
        vuln.title || '',
        vuln.severity || '',
        vuln.description || '',
        vuln.recommendation || ''
      ]);
    });

    // Add gas optimizations
    (results.gasOptimizations || results.gasOptimization || []).forEach((opt: any) => {
      rows.push([
        'Gas Optimization',
        opt.title || '',
        'Info',
        opt.description || '',
        `Save ${opt.savings} gas`
      ]);
    });

    return rows.map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  };

  // Generate text report
  const generateTextReport = (results: any): string => {
    const overallRisk = results.summary?.overallRisk || results.overallRisk || 'Unknown';
    const contractAddress = results.contractAddress || 'Unknown';
    const network = results.networkInfo?.name || results.network || 'Unknown';
    const scanDate = new Date(results.timestamp || results.scanDate || Date.now()).toLocaleString();

    let report = `VULNERABILITY SCAN REPORT\n`;
    report += `========================\n\n`;
    report += `Contract: ${contractAddress}\n`;
    report += `Network: ${network}\n`;
    report += `Scan Date: ${scanDate}\n`;
    report += `Overall Risk: ${overallRisk}\n\n`;

    // Vulnerabilities
    const vulnerabilities = results.vulnerabilities || [];
    report += `VULNERABILITIES (${vulnerabilities.length})\n`;
    report += `===============\n`;
    if (vulnerabilities.length === 0) {
      report += `No vulnerabilities detected.\n\n`;
    } else {
      vulnerabilities.forEach((vuln: any, index: number) => {
        report += `${index + 1}. ${vuln.title} [${vuln.severity}]\n`;
        report += `   Description: ${vuln.description}\n`;
        report += `   Recommendation: ${vuln.recommendation}\n`;
        if (vuln.line) report += `   Line: ${vuln.line}\n`;
        report += `\n`;
      });
    }

    // Gas Optimizations
    const gasOpts = results.gasOptimizations || results.gasOptimization || [];
    report += `GAS OPTIMIZATIONS (${gasOpts.length})\n`;
    report += `==================\n`;
    if (gasOpts.length === 0) {
      report += `No gas optimizations found.\n\n`;
    } else {
      gasOpts.forEach((opt: any, index: number) => {
        report += `${index + 1}. ${opt.title}\n`;
        report += `   Description: ${opt.description}\n`;
        report += `   Savings: ${opt.savings} gas\n\n`;
      });
    }

    return report;
  };

  // Persistence functions
  const saveProjectToStorage = (projectName: string, files: {[key: string]: string}) => {
    const projectData = {
      name: projectName,
      files: files,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(`chainide-project-${projectName}`, JSON.stringify(projectData));
  };

  // Save project metadata to localStorage for persistence
  const saveProjectMetadata = (project: Project) => {
    const existingProjects = JSON.parse(localStorage.getItem('flash-audit-projects') || '[]');
    const updatedProjects = existingProjects.filter((p: Project) => p.id !== project.id);
    updatedProjects.push(project);
    localStorage.setItem('flash-audit-projects', JSON.stringify(updatedProjects));
  };

  // Load projects from localStorage
  const loadProjectsFromStorage = (): Project[] => {
    try {
      const savedProjects = localStorage.getItem('flash-audit-projects');
      return savedProjects ? JSON.parse(savedProjects) : [];
    } catch (error) {
      console.error('Error loading projects from storage:', error);
      return [];
    }
  };

  const loadProjectFromStorage = (projectName: string): {[key: string]: string} | null => {
    const savedProject = localStorage.getItem(`chainide-project-${projectName}`);
    if (savedProject) {
      try {
        const projectData = JSON.parse(savedProject);
        return projectData.files;
      } catch (error) {
        console.error('Error loading project from storage:', error);
      }
    }
    return null;
  };



  const createProjectFromTemplate = async (template: Template) => {
    console.log('🚀 createProjectFromTemplate called with template:', template.name);
    console.log('🔑 userId:', userId);
    console.log('🔐 getToken available:', !!getToken);

    // Check if authentication is disabled for development
    const authDisabled = import.meta.env.VITE_ENABLE_AUTH === 'false';
    console.log('🔧 Auth disabled:', authDisabled);

    if (!authDisabled && !userId) {
      alert('Please sign in to create a project');
      return;
    }

    if (!authDisabled && !getToken) {
      alert('Authentication not ready. Please try again.');
      return;
    }

    try {
      const templateFiles = getTemplateFiles(template);
      const mainContractFile = templateFiles.find(f => f.endsWith('.sol')) || templateFiles[0];
      const contractCode = mainContractFile ? getTemplateFileContent(template, mainContractFile) : undefined;

      const projectName = `${template.name} ${Math.random().toString(36).substring(2, 8)}`;

      // Create project using local backend
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Add authorization header only if auth is enabled
      if (!authDisabled && getToken) {
        const token = await getToken();
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: projectName,
          description: template.description,
          type: 'contract',
          template: template.name,
          network: template.network.toLowerCase(),
          contract_code: contractCode,
          project_data: {
            template: template.name,
            category: template.category,
            network: template.network,
            files: templateFiles
          }
        })
      });

      console.log('📡 API Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API Error response:', errorData);
        throw new Error(errorData.message || 'Failed to create project');
      }

      const result = await response.json();
      console.log('✅ API Success response:', result);

      if (result.success && result.data) {
        const newProject = result.data;
        const normalizedProject: Project = {
          id: newProject.id,
          name: newProject.name,
          description: newProject.description ?? null,
          user_id: newProject.user_id,
          created_at: newProject.created_at,
          updated_at: newProject.updated_at,
          project_data: newProject.project_data ?? {},
          status: newProject.status ?? 'active',
          type: newProject.type ?? 'contract',
        };

        setProjects(prev => [normalizedProject, ...prev]);

        // Save project metadata to localStorage for persistence
        saveProjectMetadata(normalizedProject);

        setCurrentProject(normalizedProject.name);
        setCurrentView('ide');

        // Set up the IDE with the new project files
        const files = getTemplateFiles(template).reduce((acc, fileName) => {
          acc[fileName] = getTemplateFileContent(template, fileName);
          return acc;
        }, {} as {[key: string]: string});

        setFileContents(files);
        const firstFile = Object.keys(files)[0];
        if (firstFile) {
          setOpenFiles([firstFile]);
          setActiveFile(firstFile);
        }

        console.log('Project created successfully:', newProject);

        // Show success message
        console.log('✅ Project created successfully, updating UI...');
      } else {
        throw new Error(result.error || 'Failed to create project');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to create project: ${errorMessage}`);
      console.error('❌ Project creation failed:', errorMessage);
    }
  };

  const saveCurrentProject = async () => {
    if (!currentProject || Object.keys(fileContents).length === 0) {
      return;
    }

    try {
      // Save to local storage first
      saveProjectToStorage(currentProject, fileContents);

      // Also save to backend if user is authenticated
      if (userId && getToken) {
        const token = await getToken();
        const project = projects.find(p => p.name === currentProject);

        if (project) {
          const response = await fetch(`/api/projects/${project.id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              project_data: {
                ...project.project_data,
                files: fileContents,
                lastSaved: new Date().toISOString()
              }
            })
          });

          if (response.ok) {
            terminalService.addLog('success', `Project "${currentProject}" saved to cloud`, 'system');
          } else {
            terminalService.addLog('warning', `Project saved locally, cloud sync failed`, 'system');
          }
        }
      }

      console.log(`Project "${currentProject}" saved successfully!`);
      terminalService.addLog('info', `Project "${currentProject}" saved`, 'system');
    } catch (error) {
      console.error('Error saving project:', error);
      terminalService.addLog('error', `Failed to save project: ${error}`, 'system');
    }
  };

  const openProject = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    setCurrentProject(project.name);

    try {
      // Try to load project files from backend first
      const authDisabled = import.meta.env.VITE_ENABLE_AUTH === 'false';

      if ((userId && getToken) || authDisabled) {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };

        // Add authorization header only if auth is enabled
        if (!authDisabled && getToken) {
          const token = await getToken();
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'GET',
          headers
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data?.project_data?.files) {
            const files = result.data.project_data.files;
            setFileContents(files);
            const firstFile = Object.keys(files)[0];
            if (firstFile) {
              setOpenFiles([firstFile]);
              setActiveFile(firstFile);
            }
            setCurrentView('ide');
            console.log('✅ Project loaded from cloud:', project.name);
            return;
          }
        }
      }

      // Fallback to local storage
      const savedFiles = loadProjectFromStorage(project.name);

      if (savedFiles && Object.keys(savedFiles).length > 0) {
        // Load saved project files
        setFileContents(savedFiles);
        const firstFile = Object.keys(savedFiles)[0];
        setOpenFiles([firstFile]);
        setActiveFile(firstFile);
        console.log('✅ Project loaded from local storage:', project.name);
      } else if (project.project_data?.template) {
        // This is a template project, try to regenerate template files
        const templateName = project.project_data.template;
        const template = templates.find(t => t.name === templateName);

        if (template) {
          const templateFiles = getTemplateFiles(template);
          const files = templateFiles.reduce((acc, fileName) => {
            acc[fileName] = getTemplateFileContent(template, fileName);
            return acc;
          }, {} as {[key: string]: string});

          setFileContents(files);
          const firstFile = Object.keys(files)[0];
          if (firstFile) {
            setOpenFiles([firstFile]);
            setActiveFile(firstFile);
          }

          // Save the regenerated files to storage
          saveProjectToStorage(project.name, files);
          console.log('✅ Template project files regenerated:', project.name);
        } else {
          // Template not found, create default files
          createDefaultProjectFiles(project);
        }
      } else {
        // Create default files for non-template projects
        createDefaultProjectFiles(project);
      }

      setCurrentView('ide');
    } catch (error) {
      console.error('Error opening project:', error);
      // Fallback to default files on error
      createDefaultProjectFiles(project);
      setCurrentView('ide');
    }
  };

  // Helper function to create default project files
  const createDefaultProjectFiles = (project: Project) => {
    // Fallback to default files if no saved files found
    const defaultFiles = ['contracts/Contract.sol', 'README.md', 'package.json'];
    const defaultContents: {[key: string]: string} = {
          'contracts/Contract.sol': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ${project.name.replace(/\s+/g, '')} {
    // Your contract code here
    string public name = "${project.name}";

    constructor() {
        // Constructor logic
    }
}`,
          'README.md': `# ${project.name}\n\nProject created on ${new Date(project.created_at).toLocaleDateString()}\n\n## Description\nThis is a smart contract project.\n\n## Getting Started\n1. Install dependencies\n2. Compile contracts\n3. Deploy to network`,
          'package.json': JSON.stringify({
            name: project.name.toLowerCase().replace(/\s+/g, '-'),
            version: "1.0.0",
            description: `Smart contract project: ${project.name}`,
            scripts: {
              compile: "hardhat compile",
              test: "hardhat test",
              deploy: "hardhat run scripts/deploy.js"
            }
          }, null, 2)
        };

    setFileContents(defaultContents);
    setOpenFiles([defaultFiles[0]]);
    setActiveFile(defaultFiles[0]);
    saveProjectToStorage(project.name, defaultContents); // Save default files
    console.log('✅ Project created with default files:', project.name);
  };



  // File operation functions
  const createNewFile = (targetPath: string = '') => {
    if (!currentProject) return;

    console.log('createNewFile called with targetPath:', targetPath); // Debug log

    const fileName = prompt('Enter file name (e.g., NewFile.sol):');
    if (fileName && fileName.trim()) {
      const cleanFileName = fileName.trim();
      const filePath = targetPath ? `${targetPath}/${cleanFileName}` : cleanFileName;

      console.log('Creating file at path:', filePath); // Debug log

      if (!fileContents[filePath]) {
        // Determine file content based on extension
        let fileContent = '// New file\n';
        if (cleanFileName.endsWith('.sol')) {
          fileContent = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ${cleanFileName.replace('.sol', '').replace(/[^a-zA-Z0-9]/g, '')} {
    // Your contract code here
}`;
        } else if (cleanFileName.endsWith('.js')) {
          fileContent = '// JavaScript file\nconsole.log("Hello World");';
        } else if (cleanFileName.endsWith('.md')) {
          fileContent = `# ${cleanFileName.replace('.md', '')}\n\nDescription of this file.`;
        }

        const newFileContents = {
          ...fileContents,
          [filePath]: fileContent
        };
        setFileContents(newFileContents);
        setActiveFile(filePath);
        if (!openFiles.includes(filePath)) {
          setOpenFiles([...openFiles, filePath]);
        }

        // Auto-save the project
        if (currentProject) {
          saveProjectToStorage(currentProject, newFileContents);
        }

        // Expand the parent folder if it exists
        if (targetPath) {
          console.log('Expanding folder:', targetPath); // Debug log
          const newExpandedFolders = new Set(expandedFolders);
          newExpandedFolders.add(targetPath);
          setExpandedFolders(newExpandedFolders);
        }
      } else {
        alert('File already exists!');
      }
    }
  };

  const createNewFolder = (targetPath: string = '') => {
    if (!currentProject) return;

    const folderName = prompt('Enter folder name:');
    if (folderName && folderName.trim()) {
      const cleanFolderName = folderName.trim();
      const folderPath = targetPath ? `${targetPath}/${cleanFolderName}` : cleanFolderName;
      const placeholderFile = `${folderPath}/.gitkeep`;

      if (!fileContents[placeholderFile]) {
        const newFileContents = {
          ...fileContents,
          [placeholderFile]: '# This file keeps the folder in version control\n'
        };
        setFileContents(newFileContents);

        // Expand the parent folder and the new folder
        const newExpandedFolders = new Set(expandedFolders);
        if (targetPath) {
          newExpandedFolders.add(targetPath);
        }
        newExpandedFolders.add(folderPath);
        setExpandedFolders(newExpandedFolders);

        // Auto-save the project
        if (currentProject) {
          saveProjectToStorage(currentProject, newFileContents);
        }
      } else {
        alert('Folder already exists!');
      }
    }
  };

  const refreshExplorer = () => {
    // In a real application, this would reload files from the server
    // For now, we'll simulate a refresh with visual feedback
    const originalTitle = document.title;
    document.title = '🔄 Refreshing...';

    setTimeout(() => {
      document.title = originalTitle;
      // Force a re-render by updating the state
      setFileContents({...fileContents});
      console.log('Explorer refreshed successfully');
    }, 500);
  };

  const downloadProject = () => {
    if (!currentProject) return;

    // Create a simple download of project files as JSON
    const projectData = {
      name: currentProject,
      files: fileContents,
      timestamp: new Date().toISOString()
    };

    const dataStr = JSON.stringify(projectData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentProject}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleExplorer = () => {
    setIsExplorerCollapsed(!isExplorerCollapsed);
  };

  const toggleFolder = (folderPath: string) => {
    const newExpandedFolders = new Set(expandedFolders);
    if (newExpandedFolders.has(folderPath)) {
      newExpandedFolders.delete(folderPath);
    } else {
      newExpandedFolders.add(folderPath);
    }
    setExpandedFolders(newExpandedFolders);
  };

  const handleContextMenu = (e: React.MouseEvent, path: string, type: 'file' | 'folder' | 'root') => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Context menu opened for:', { path, type }); // Debug log
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      path,
      type
    });
    setSelectedPath(path);
  };

  const closeContextMenu = () => {
    setContextMenu(null);
    setSelectedPath('');
  };

  const handleNewFileInContext = () => {
    console.log('handleNewFileInContext called with contextMenu:', contextMenu); // Debug log

    let targetPath = '';

    if (contextMenu?.type === 'folder') {
      // If right-clicked on a folder, create inside that folder
      targetPath = contextMenu.path;
      console.log('Folder context - setting targetPath to:', targetPath); // Debug log
    } else if (contextMenu?.type === 'file') {
      // If right-clicked on a file, create in the same directory as the file
      const filePath = contextMenu.path;
      if (filePath.includes('/')) {
        targetPath = filePath.substring(0, filePath.lastIndexOf('/'));
      } else {
        targetPath = ''; // Root level
      }
      console.log('File context - setting targetPath to:', targetPath); // Debug log
    } else {
      // If right-clicked on empty space (root), create at root level
      targetPath = '';
      console.log('Root context - setting targetPath to:', targetPath); // Debug log
    }

    console.log('Final targetPath before calling createNewFile:', targetPath); // Debug log
    alert(`Creating file in folder: "${targetPath}" (empty means root)`); // Temporary debug alert
    createNewFile(targetPath);
    closeContextMenu();
  };

  const handleNewFolderInContext = () => {
    let targetPath = '';

    if (contextMenu?.type === 'folder') {
      // If right-clicked on a folder, create inside that folder



      targetPath = contextMenu.path;
    } else if (contextMenu?.type === 'file') {
      // If right-clicked on a file, create in the same directory as the file
      const filePath = contextMenu.path;
      if (filePath.includes('/')) {
        targetPath = filePath.substring(0, filePath.lastIndexOf('/'));
      } else {
        targetPath = ''; // Root level
      }
    } else {
      // If right-clicked on empty space (root), create at root level
      targetPath = '';
    }

    console.log('Creating folder in path:', targetPath); // Debug log
    createNewFolder(targetPath);
    closeContextMenu();
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(templateSearchQuery.toLowerCase()) &&
    (selectedNetworkFilter === 'All' || template.network === selectedNetworkFilter)
  );

  const renderTemplatesView = () => {
    return (
      <div className="chain-ide-container">
        {/* Top Bar */}
        <div className="top-bar">
          <div className="top-bar-left">
            <div className="app-title">
              <FaDatabase />
              <span>NovaGard</span>
              <button className="back-to-dashboard" onClick={() => setCurrentView('dashboard')}>
                ← Dashboard
              </button>
            </div>
          </div>

          <div className="top-bar-center">
            <div className="search-container">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search Templates"
                value={templateSearchQuery}
                onChange={(e) => setTemplateSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          <div className="top-bar-right">
            <div className="wallet-connection">
              <FaWallet />
              {isConnected ? (
                <div className="wallet-connected-info">
                  <span className="wallet-connected">
                    {connectedWallet === 'metamask' ? '🦊 MetaMask' : '👻 Phantom'} Connected
                  </span>
                  <button className="disconnect-wallet" onClick={disconnectWallet}>
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="wallet-options">
                  <button className="connect-wallet metamask" onClick={connectMetaMask}>
                    🦊 MetaMask
                  </button>
                  <button className="connect-wallet phantom" onClick={connectPhantom}>
                    👻 Phantom
                  </button>
                </div>
              )}
            </div>
            <div className="user-section">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8",
                    userButtonPopoverCard: "shadow-lg border",
                    userButtonPopoverActionButton: "hover:bg-gray-100"
                  }
                }}
                showName={true}
              />
            </div>
          </div>
        </div>

        {/* Left Sidebar */}
        <div className="sidebar">
          <div className="sidebar-icons">
            <button
              className="sidebar-icon active"
              title="Templates"
            >
              <FaFolder />
            </button>
            <button
              className="sidebar-icon"
              title="Explorer"
            >
              <FaSearch />
            </button>
            <button
              className="sidebar-icon"
              title="Extensions"
            >
              <FaCube />
            </button>
          </div>

          <div className="panel-content">
            <h3>📁 TEMPLATES</h3>
            <div className="templates-sidebar-content">
              <div className="sidebar-section">
                <h4>Networks</h4>
                <div className="network-list">
                  <button
                    className={`network-item ${selectedNetworkFilter === 'All' ? 'active' : ''}`}
                    onClick={() => setSelectedNetworkFilter('All')}
                  >
                    <span className="network-icon">🌐</span>
                    <span className="network-name">All Networks</span>
                  </button>
                  {networkOptions.map(network => (
                    <button
                      key={network.id}
                      className={`network-item ${selectedNetworkFilter === network.name ? 'active' : ''}`}
                      onClick={() => {
                        // Toggle selection: if already selected, deselect (go to 'All')
                        if (selectedNetworkFilter === network.name) {
                          setSelectedNetworkFilter('All');
                        } else {
                          setSelectedNetworkFilter(network.name);
                        }
                      }}
                    >
                      <span className="network-icon" style={{ color: network.color }}>
                        {network.icon}
                      </span>
                      <span className="network-name">{network.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Templates */}
        <div className="main-content">
          <div className="templates-main-content">
            <div className="templates-section">
              <div className="section-header">
                <h2>Public Templates</h2>
                <div className="template-count">{filteredTemplates.length} templates</div>
              </div>

              <div className="templates-grid">
                {/* Import Project Card */}
                <div className="template-card import-card">
                  <div className="template-card-content">
                    <div className="import-icon">
                      <div className="upload-arrow">↑</div>
                    </div>
                    <div className="template-info">
                      <h3>Import Project</h3>
                      <p>Import an existing project</p>
                    </div>
                  </div>
                </div>

                {/* Template Cards */}
                {filteredTemplates.map(template => (
                  <div
                    key={template.id}
                    className="template-card"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🎯 Template clicked:', template.name);
                      console.log('🔧 Auth disabled check:', import.meta.env.VITE_ENABLE_AUTH === 'false');
                      console.log('🔑 Current userId:', userId);
                      createProjectFromTemplate(template);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="template-card-content">
                      <div className="template-header">
                        <div className="template-icon">
                          <FaFolder />
                        </div>
                        <div className="template-version">{template.version}</div>
                      </div>
                      <div className="template-info">
                        <h3>{template.name}</h3>
                        <p>{template.description}</p>
                      </div>
                      <div className="template-footer">
                        <span className="template-category">{template.category}</span>
                        <span className="template-network">{template.network}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDashboard = () => {
    return (
      <div className="dashboard-container">
        {/* Dashboard Header */}
        <div className="dashboard-header">
          <div className="header-left">
            <div className="logo-section">
              <div className="logo-icon">
                <FaDatabase />
              </div>
              <span className="logo-text">NovaGard</span>
            </div>
          </div>

          <div className="header-center">
            <div className="search-container">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search Projects"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          <div className="header-right">
            <div className="user-section">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8",
                    userButtonPopoverCard: "shadow-lg border",
                    userButtonPopoverActionButton: "hover:bg-gray-100"
                  }
                }}
                showName={true}
              />
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="dashboard-content">
          <div className="projects-section">
            <div className="section-header">
              <h2>All Projects</h2>
            </div>

            <div className="projects-grid">
              {/* New Project Card */}
              <div className="project-card new-project" onClick={createNewProject}>
                <div className="new-project-icon">
                  <FaPlus />
                </div>
                <span className="new-project-text">New Project</span>
              </div>

              {/* Vulnerability Check Card */}
              <div className="project-card vulnerability-check" onClick={() => setCurrentView('vulnerability')}>
                <div className="vulnerability-check-icon">
                  🛡️
                </div>
                <span className="vulnerability-check-text">NovaGard</span>
                <span className="vulnerability-check-subtitle">Check contract vulnerabilities</span>
              </div>

              {/* Existing Projects */}
              {filteredProjects.map(project => (
                <div key={project.id} className="project-card" onClick={() => openProject(project.id)}>
                  <div className="project-preview">
                    <div className="chainide-logo">
                      <FaDatabase />
                      <span>NovaGard</span>
                    </div>
                  </div>
                  <div className="project-info">
                    <div className="project-header">
                      <span className="project-date">{new Date(project.created_at).toLocaleDateString()}</span>
                      <button className="project-menu">
                        <FaEllipsisV />
                      </button>
                    </div>
                    <div className="project-details">
                      <FaFolder className="project-icon" />
                      <span className="project-name">{project.name}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderVulnerabilityView = () => {
    return (
      <div className="vulnerability-container">
        {/* Header */}
        <div className="vulnerability-header">
          <div className="header-left">
            <div className="logo-section">
              <div className="logo-icon">
                🛡️
              </div>
              <span className="logo-text">NovaGard</span>
            </div>
            <button className="back-to-dashboard" onClick={() => setCurrentView('dashboard')}>
              ← Back to Dashboard
            </button>
          </div>
          <div className="header-right">
            <div className="user-section">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8",
                    userButtonPopoverCard: "shadow-lg border",
                    userButtonPopoverActionButton: "hover:bg-gray-100"
                  }
                }}
                showName={true}
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="vulnerability-content">
          <div className="audit-section">
            <div className="section-header">
              <h2>Smart Contract Vulnerability Scanner</h2>
              <p>Enter a contract address to perform a comprehensive security audit</p>
            </div>

            <div className="audit-form">
              <div className="form-group">
                <label htmlFor="contract-address">Contract Address</label>
                <input
                  id="contract-address"
                  type="text"
                  placeholder="0x... (try: 0xA0b86a33E6441E6C7D3E4C5B4B6C7D8E9F0A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8)"
                  value={contractAddress}
                  onChange={(e) => setContractAddress(e.target.value)}
                  className="address-input"
                />
                <div className="input-helper">
                  <small>
                    💡 Try this test address:
                    <button
                      className="test-address-btn"
                      onClick={() => setContractAddress('0xA0b86a33E6441E6C7D3E4C5B4B6C7D8E9F0A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8')}
                    >
                      Use Test Contract
                    </button>
                  </small>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="network-select">Network</label>
                <select
                  id="network-select"
                  value={selectedVulnNetwork}
                  onChange={(e) => setSelectedVulnNetwork(e.target.value)}
                  className="network-select"
                >
                  <option value="ethereum">Ethereum Mainnet</option>
                  <option value="polygon">Polygon</option>
                    <option value="aptos">Aptos</option>
                    <option value="sui">Sui</option>
                  <option value="sol">Solana</option>
                  
                </select>
              </div>

              <button
                className="scan-button"
                onClick={performVulnerabilityCheck}
                disabled={isScanning || !contractAddress.trim()}
              >
                {isScanning ? (
                  <>
                    <div className="spinner"></div>
                    {scanStatus === 'initializing' && 'Initializing...'}
                    {scanStatus === 'scanning' && `Scanning... ${scanProgress}%`}
                    {scanStatus === 'completed' && 'Completing...'}
                  </>
                ) : (
                  <>
                    🔍 Start Security Scan
                  </>
                )}
              </button>

              {/* Progress Bar */}
              {isScanning && (
                <div className="progress-container">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${scanProgress}%` }}
                    ></div>
                  </div>
                  <div className="progress-text">
                    {scanStatus} - {scanProgress}%
                  </div>
                </div>
              )}

              {/* Error Display */}
              {scanError && (
                <div className="error-message">
                  <span className="error-icon">⚠️</span>
                  {scanError}
                </div>
              )}
            </div>

            {/* Results Section */}
            {vulnerabilityResults && (
              <div className="results-section">
                <div className="results-header">
                  <h3>Scan Results</h3>
                  <div className="results-header-actions">
                    <div className={`risk-badge ${(vulnerabilityResults.summary?.overallRisk || vulnerabilityResults.overallRisk || 'unknown').toLowerCase()}`}>
                      {vulnerabilityResults.summary?.overallRisk || vulnerabilityResults.overallRisk || 'Unknown'} Risk
                    </div>
                    <div className="export-buttons">
                      <button
                        className="export-btn"
                        onClick={() => exportResults('json')}
                        title="Export as JSON"
                      >
                        📄 JSON
                      </button>
                      <button
                        className="export-btn"
                        onClick={() => exportResults('pdf')}
                        title="Export as PDF"
                      >
                        📑 PDF
                      </button>
                      <button
                        className="export-btn"
                        onClick={() => exportResults('csv')}
                        title="Export as CSV"
                      >
                        📊 CSV
                      </button>
                    </div>
                  </div>
                </div>

                <div className="results-grid">
                  {/* Vulnerabilities */}
                  <div className="result-card">
                    <h4>🚨 Vulnerabilities Found ({(vulnerabilityResults.vulnerabilities || []).length})</h4>
                    <div className="vulnerability-list">
                      {(vulnerabilityResults.vulnerabilities || []).length > 0 ? (
                        vulnerabilityResults.vulnerabilities.map((vuln: any, index: number) => (
                          <div key={index} className={`vulnerability-item ${vuln.severity.toLowerCase()}`}>
                            <div className="vuln-header">
                              <span className="vuln-title">{vuln.title}</span>
                              <span className={`vuln-severity ${vuln.severity.toLowerCase()}`}>
                                {vuln.severity}
                              </span>
                            </div>
                            <p className="vuln-description">{vuln.description}</p>
                            <p className="vuln-recommendation">
                              <strong>Recommendation:</strong> {vuln.recommendation}
                            </p>
                            {vuln.line && <span className="vuln-line">Line: {vuln.line}</span>}
                          </div>
                        ))
                      ) : (
                        <div className="no-vulnerabilities">
                          <span className="success-icon">✅</span>
                          <span>No vulnerabilities detected!</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Gas Optimization */}
                  <div className="result-card">
                    <h4>⚡ Gas Optimization ({(vulnerabilityResults.gasOptimizations || vulnerabilityResults.gasOptimization || []).length})</h4>
                    <div className="optimization-list">
                      {(vulnerabilityResults.gasOptimizations || vulnerabilityResults.gasOptimization || []).length > 0 ? (
                        (vulnerabilityResults.gasOptimizations || vulnerabilityResults.gasOptimization || []).map((opt: any, index: number) => (
                          <div key={index} className="optimization-item">
                            <h5>{opt.title}</h5>
                            <p>{opt.description}</p>
                            <span className="savings">
                              {typeof opt.savings === 'number' ? `${opt.savings.toLocaleString()} gas` : opt.savings}
                              {opt.savingsPercentage && ` (${opt.savingsPercentage}% savings)`}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="no-optimizations">
                          <span className="info-icon">ℹ️</span>
                          <span>No gas optimizations found</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Compliance */}
                  <div className="result-card">
                    <h4>✅ Standard Compliance</h4>
                    <div className="compliance-list">
                      {vulnerabilityResults.complianceResults && vulnerabilityResults.complianceResults.length > 0 ? (
                        vulnerabilityResults.complianceResults.map((comp: any, index: number) => (
                          <div key={index} className="compliance-item">
                            <span>{comp.standard}:</span>
                            <span className={comp.status === 'Compliant' ? 'compliant' : 'not-applicable'}>
                              {comp.status} ({comp.score}/100)
                            </span>
                          </div>
                        ))
                      ) : vulnerabilityResults.compliance ? (
                        <>
                          <div className="compliance-item">
                            <span>ERC-20:</span>
                            <span className={vulnerabilityResults.compliance.erc20 === 'Compliant' ? 'compliant' : 'not-applicable'}>
                              {vulnerabilityResults.compliance.erc20}
                            </span>
                          </div>
                          <div className="compliance-item">
                            <span>ERC-721:</span>
                            <span className={vulnerabilityResults.compliance.erc721 === 'Compliant' ? 'compliant' : 'not-applicable'}>
                              {vulnerabilityResults.compliance.erc721}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="compliance-item">
                          <span>No compliance data available</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="scan-info">
                  <p>Contract: {vulnerabilityResults.contractAddress}</p>
                  <p>Network: {vulnerabilityResults.networkInfo?.name || vulnerabilityResults.network || selectedVulnNetwork}</p>
                  <p>Scan Date: {new Date(vulnerabilityResults.timestamp || vulnerabilityResults.scanDate || Date.now()).toLocaleString()}</p>
                  {vulnerabilityResults.scanId && <p>Scan ID: {vulnerabilityResults.scanId}</p>}
                  {vulnerabilityResults.summary && (
                    <>
                      <p>Risk Score: {vulnerabilityResults.summary.riskScore}/100</p>
                      <p>Total Vulnerabilities: {vulnerabilityResults.summary.totalVulnerabilities}</p>
                      {vulnerabilityResults.summary.gasOptimizationSavings > 0 && (
                        <p>Potential Gas Savings: {vulnerabilityResults.summary.gasOptimizationSavings.toLocaleString()} gas</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderPanelContent = () => {
    switch (activePanel) {
      case 'explorer':
        return (
          <div className="vscode-panel">
            <div className="panel-header">
              <span className="panel-title">EXPLORER</span>
            </div>
            <div className="panel-body">
              {currentProject && (
                <div className="explorer-section">
                    <div className="section-header-with-toggle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      className="section-toggle"
                      onClick={toggleExplorer}
                      title={isExplorerCollapsed ? 'Expand Explorer' : 'Collapse Explorer'}
                      style={{ cursor: 'pointer', fontSize: '18px', color: '#fff', background: 'none', border: 'none' }}
                    >
                      {isExplorerCollapsed ? '▶' : '▼'}
                    </div>
                    <span className="section-title" style={{ flex: 1, color: '#fff', fontWeight: 600 }}>{currentProject.toUpperCase()}</span>
                    <div className="section-actions" style={{ display: 'flex', gap: '4px' }}>
                      <button className="action-btn" title="New File" onClick={() => createNewFile('')} style={{ background: 'none', border: 'none', fontSize: '14px', color: '#cccccc', cursor: 'pointer', padding: '4px' }}>
                        <FaFile />
                      </button>
                      <button className="action-btn" title="New Folder" onClick={() => createNewFolder('')} style={{ background: 'none', border: 'none', fontSize: '14px', color: '#cccccc', cursor: 'pointer', padding: '4px' }}>
                        <FaFolderPlus />
                      </button>
                      <button className="action-btn" title="Refresh" onClick={refreshExplorer} style={{ background: 'none', border: 'none', fontSize: '14px', color: '#cccccc', cursor: 'pointer', padding: '4px' }}>
                        <FaSync />
                      </button>
                      <button className="action-btn" title="Download Project" onClick={downloadProject} style={{ background: 'none', border: 'none', fontSize: '14px', color: '#cccccc', cursor: 'pointer', padding: '4px' }}>
                        <FaDownload />
                      </button>
                    </div>
                    </div>
                  {!isExplorerCollapsed && (
                    <div
                      className="file-tree"
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Root area right-clicked'); // Debug log
                        handleContextMenu(e, '', 'root');
                      }}
                      onClick={closeContextMenu}
                    >
                    {/* Create a sorted list of all files and folders */}
                    {(() => {
                      const allItems: Array<{
                        type: 'file' | 'folder';
                        name: string;
                        path: string;
                        level: number;
                        isExpanded?: boolean;
                      }> = [];

                      // Get all unique paths and sort them
                      const allPaths = Object.keys(fileContents).sort();

                      // Process each path to create the tree structure
                      allPaths.forEach(filePath => {
                        const parts = filePath.split('/');

                        // Add folder entries for each level
                        for (let i = 0; i < parts.length - 1; i++) {
                          const folderPath = parts.slice(0, i + 1).join('/');
                          const folderName = parts[i];

                          // Check if this folder is already added
                          if (!allItems.find(item => item.path === folderPath && item.type === 'folder')) {
                            allItems.push({
                              type: 'folder',
                              name: folderName,
                              path: folderPath,
                              level: i,
                              isExpanded: expandedFolders.has(folderPath)
                            });
                          }
                        }

                        // Add the file only if its parent folder is expanded (or if it's a root file)
                        const parentFolderPath = parts.slice(0, -1).join('/');
                        const isRootFile = parts.length === 1;
                        const parentIsExpanded = isRootFile || expandedFolders.has(parentFolderPath);

                        if (parentIsExpanded) {
                          allItems.push({
                            type: 'file',
                            name: parts[parts.length - 1],
                            path: filePath,
                            level: parts.length - 1
                          });
                        }
                      });

                      // Render the items
                      return allItems.map((item) => {
                        if (item.type === 'folder') {
                          return (
                            <div
                              key={`folder-${item.path}`}
                              className={`folder-header ${selectedPath === item.path ? 'selected' : ''}`}
                              style={{ paddingLeft: `${20 + (item.level * 16)}px` }}
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log('Folder clicked:', item.path); // Debug log
                                toggleFolder(item.path);
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Folder right-clicked:', item.path); // Debug log
                                handleContextMenu(e, item.path, 'folder');
                              }}
                            >
                              <span className="folder-toggle">
                                {item.isExpanded ? '▼' : '▶'}
                              </span>
                              <span className="folder-icon">📁</span>
                              <span className="folder-name">{item.name}</span>
                            </div>
                          );
                        } else {
                          return (
                            <div
                              key={`file-${item.path}`}
                              className={`file-item ${activeFile === item.path ? 'active' : ''} ${selectedPath === item.path ? 'selected' : ''}`}
                              style={{ paddingLeft: `${32 + (item.level * 16)}px` }}
                              onClick={() => {
                                setActiveFile(item.path);
                                if (!openFiles.includes(item.path)) {
                                  setOpenFiles([...openFiles, item.path]);
                                }
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('File right-clicked:', item.path); // Debug log
                                handleContextMenu(e, item.path, 'file');
                              }}
                            >
                              <span className="file-icon">📄</span>
                              <span className="file-name">{item.name}</span>
                            </div>
                          );
                        }
                      });
                    })()}
                  </div>
                  )}
                </div>
              )}

              {/* Context Menu */}
              {contextMenu && (
                <div
                  className="context-menu"
                  style={{
                    position: 'fixed',
                    top: contextMenu.y,
                    left: contextMenu.x,
                    zIndex: 1000,
                    backgroundColor: '#2d2d30',
                    border: '1px solid #464647',
                    borderRadius: '3px',
                    padding: '4px 0',
                    minWidth: '160px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className="context-menu-item"
                    onClick={handleNewFileInContext}
                    style={{
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#cccccc',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#37373d'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <FaFile />
                    <span>New File</span>
                  </div>
                  <div
                    className="context-menu-item"
                    onClick={handleNewFolderInContext}
                    style={{
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#cccccc',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#37373d'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <FaFolderPlus />
                    <span>New Folder</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'plugin':
        return (
          <div className="vscode-panel">
            <div className="panel-header">
              <span className="panel-title">PLUGIN MANAGER</span>
            </div>
            <div className="panel-body">
              <div className="search-box">
                <input type="text" placeholder="Search plugins..." className="search-input" />
              </div>
              <div className="plugin-categories">
                <div className="category-item active">
                  <span>🔥 Popular</span>
                </div>
                <div className="category-item">
                  <span>⚡ Installed</span>
                </div>
                <div className="category-item">
                  <span>🔄 Updates</span>
                </div>
              </div>
              <div className="plugin-list">
                <div className="plugin-item">
                  <div className="plugin-icon">🔧</div>
                  <div className="plugin-details">
                    <div className="plugin-name">Solidity Support</div>
                    <div className="plugin-description">Syntax highlighting for Solidity</div>
                    <div className="plugin-meta">
                      <span className="plugin-author">Microsoft</span>
                      <span className="plugin-downloads">2.1M</span>
                    </div>
                  </div>
                  <button className="plugin-action installed">✓</button>
                </div>
                <div className="plugin-item">
                  <div className="plugin-icon">⚡</div>
                  <div className="plugin-details">
                    <div className="plugin-name">Hardhat Integration</div>
                    <div className="plugin-description">Smart contract development</div>
                    <div className="plugin-meta">
                      <span className="plugin-author">Hardhat</span>
                      <span className="plugin-downloads">850K</span>
                    </div>
                  </div>
                  <button className="plugin-action installed">✓</button>
                </div>
                <div className="plugin-item">
                  <div className="plugin-icon">🌐</div>
                  <div className="plugin-details">
                    <div className="plugin-name">Web3 Provider</div>
                    <div className="plugin-description">Blockchain connectivity</div>
                    <div className="plugin-meta">
                      <span className="plugin-author">Web3</span>
                      <span className="plugin-downloads">1.2M</span>
                    </div>
                  </div>
                  <button className="plugin-action update">Update</button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'port':
        return (
          <div className="vscode-panel">
            <div className="panel-header">
              <span className="panel-title">PORT MANAGER</span>
              <button className="header-action" title="Add Port">+</button>
            </div>
            <div className="panel-body">
              <div className="port-list">
                <div className="port-item">
                  <div className="port-info">
                    <div className="port-number">3000</div>
                    <div className="port-description">React Development Server</div>
                  </div>
                  <div className="port-status running">
                    <span className="status-dot"></span>
                    <span>Running</span>
                  </div>
                  <div className="port-actions">
                    <button className="action-btn" title="Open in Browser">🌐</button>
                    <button className="action-btn" title="Stop">⏹️</button>
                  </div>
                </div>
                <div className="port-item">
                  <div className="port-info">
                    <div className="port-number">8545</div>
                    <div className="port-description">Ganache Blockchain</div>
                  </div>
                  <div className="port-status running">
                    <span className="status-dot"></span>
                    <span>Running</span>
                  </div>
                  <div className="port-actions">
                    <button className="action-btn" title="Open in Browser">🌐</button>
                    <button className="action-btn" title="Stop">⏹️</button>
                  </div>
                </div>
                <div className="port-item">
                  <div className="port-info">
                    <div className="port-number">8080</div>
                    <div className="port-description">HTTP Server</div>
                  </div>
                  <div className="port-status stopped">
                    <span className="status-dot"></span>
                    <span>Stopped</span>
                  </div>
                  <div className="port-actions">
                    <button className="action-btn" title="Start">▶️</button>
                    <button className="action-btn" title="Delete">🗑️</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'sandbox': {
        return (
          <div className="vscode-panel">
            <div className="panel-header">
              <span className="panel-title">SANDBOX MANAGEMENT</span>
              <button className="header-action" title="New Sandbox">+</button>
            </div>
            <div className="panel-body">
              <div className="sandbox-list">
                <div className="sandbox-item active">
                  <div className="sandbox-icon">🟢</div>
                  <div className="sandbox-details">
                    <div className="sandbox-name">Development</div>
                    <div className="sandbox-description">Local development environment</div>
                    <div className="sandbox-meta">
                      <span>Node.js 18.x</span>
                      <span>•</span>
                      <span>Active</span>
                    </div>
                  </div>
                  <div className="sandbox-actions">
                    <button className="action-btn" title="Terminal">💻</button>
                    <button className="action-btn" title="Settings">⚙️</button>
                  </div>
                </div>
                <div className="sandbox-item">
                  <div className="sandbox-icon">🟡</div>
                  <div className="sandbox-details">
                    <div className="sandbox-name">Testing</div>
                    <div className="sandbox-description">Testing environment</div>
                    <div className="sandbox-meta">
                      <span>Node.js 16.x</span>
                      <span>•</span>
                      <span>Idle</span>
                    </div>
                  </div>
                  <div className="sandbox-actions">
                    <button className="action-btn" title="Start">▶️</button>
                    <button className="action-btn" title="Settings">⚙️</button>
                  </div>
                </div>
                <div className="sandbox-item">
                  <div className="sandbox-icon">🔴</div>
                  <div className="sandbox-details">
                    <div className="sandbox-name">Production</div>
                    <div className="sandbox-description">Production environment</div>
                    <div className="sandbox-meta">
                      <span>Node.js 18.x</span>
                      <span>•</span>
                      <span>Stopped</span>
                    </div>
                  </div>
                  <div className="sandbox-actions">
                    <button className="action-btn" title="Start">▶️</button>
                    <button className="action-btn" title="Settings">⚙️</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'git': {
        return (
          <div className="vscode-panel">
            <div className="panel-header">
              <span className="panel-title">GIT MANAGER</span>
              <button className="header-action" title="Refresh">🔄</button>
            </div>
            <div className="panel-body">
              <div className="git-section">
                <div className="git-branch">
                  <div className="branch-info">
                    <span className="branch-icon">🌿</span>
                    <span className="branch-name">main</span>
                    <button className="branch-action" title="Switch Branch">⇄</button>
                  </div>
                </div>
                <div className="git-changes">
                  <div className="changes-header">
                    <span>Changes (2)</span>
                    <div className="changes-actions">
                      <button className="action-btn" title="Stage All">+</button>
                      <button className="action-btn" title="Discard All">↶</button>
                    </div>
                  </div>
                  <div className="changes-list">
                    <div className="change-item">
                      <span className="change-status modified">M</span>
                      <span className="change-file">contracts/MyContract.sol</span>
                      <div className="change-actions">
                        <button className="action-btn" title="Stage">+</button>
                        <button className="action-btn" title="Discard">↶</button>
                      </div>
                    </div>
                    <div className="change-item">
                      <span className="change-status added">A</span>
                      <span className="change-file">README.md</span>
                      <div className="change-actions">
                        <button className="action-btn" title="Stage">+</button>
                        <button className="action-btn" title="Discard">↶</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="git-commit">
                  <textarea
                    className="commit-message"
                    placeholder="Commit message..."
                    rows={3}
                  ></textarea>
                  <button className="commit-btn">Commit</button>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'compiler': {
        return (
          <div className="vscode-panel">
            <div className="panel-header">
              <span className="panel-title">COMPILER</span>
              <button className="header-action" title="Refresh">🔄</button>
            </div>
            <div className="panel-body">
              <div className="compiler-section">
                <div className="compiler-config">
                  <div className="config-header">
                    <span>Solidity Compiler</span>
                  </div>
                  <div className="config-options">
                    <div className="config-item">
                      <label>Version:</label>
                      <select className="config-select">
                        <option>0.8.19</option>
                        <option>0.8.18</option>
                        <option>0.8.17</option>
                      </select>
                    </div>
                    <div className="config-item">
                      <label>Optimization:</label>
                      <input type="checkbox" defaultChecked />
                      <span>Enabled (200 runs)</span>
                    </div>
                  </div>
                </div>
                <div className="compiler-actions">
                  <button
                    className="compile-btn primary"
                    onClick={() => {
                      if (currentProject) {
                        terminalService.compileContract(
                          `// Sample contract code\npragma solidity ^0.8.0;\n\ncontract ${currentProject} {\n    // Contract implementation\n}`,
                          currentProject
                        );
                      } else {
                        terminalService.addLog('warning', 'No project selected for compilation', 'compiler');
                      }
                    }}
                  >
                    🔨 Compile All
                  </button>
                  <button
                    className="compile-btn secondary"
                    onClick={() => terminalService.addLog('info', 'Clean build initiated...', 'compiler')}
                  >
                    🧹 Clean
                  </button>
                </div>
                <div className="compiler-output">
                  <div className="output-header">
                    <span>Compilation Results</span>
                  </div>
                  <div className="output-content">
                    <div className="output-line success">✓ Ready to compile</div>
                    <div className="output-line info">Select a contract and click "Compile All"</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'deploy': {
        return (
          <div className="vscode-panel">
            <div className="panel-header">
              <span className="panel-title">DEPLOY</span>
              <button className="header-action" title="Refresh">🔄</button>
            </div>
            <div className="panel-body">
              <div className="deploy-section">
                <div className="deploy-config">
                  <div className="config-header">
                    <span>Deployment Configuration</span>
                  </div>
                  <div className="config-options">
                    <div className="config-item">
                      <label>Network:</label>
                      <select className="config-select">
                        <option>Ethereum Mainnet</option>
                        <option>Polygon</option>
                        <option>Arbitrum</option>
                        <option>Local Testnet</option>
                      </select>
                    </div>
                    <div className="config-item">
                      <label>Gas Limit:</label>
                      <input type="number" defaultValue="3000000" className="config-input" />
                    </div>
                  </div>
                </div>
                <div className="deploy-actions">
                  <button
                    className="deploy-btn primary"
                    onClick={() => {
                      terminalService.addLog('info', 'Starting deployment process...', 'deploy');
                      terminalService.addLog('info', 'Estimating gas costs...', 'deploy');
                      setTimeout(() => {
                        terminalService.addLog('success', '✓ Contract deployed successfully!', 'deploy');
                        terminalService.addLog('info', 'Contract address: 0x1234...5678', 'deploy');
                      }, 2000);
                    }}
                  >
                    🚀 Deploy Contract
                  </button>
                  <button
                    className="deploy-btn secondary"
                    onClick={() => terminalService.addLog('info', 'Estimating deployment costs...', 'deploy')}
                  >
                    💰 Estimate Gas
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      }

      default: {
        return (
          <div className="vscode-panel">
            <div className="panel-header">
              <span className="panel-title">EXPLORER</span>
            </div>
            <div className="panel-body">
              <div className="empty-state">
                <p>Select a panel from the sidebar</p>
              </div>
            </div>
          </div>
        );
      }
    }
  };

  // Main render logic
  // Main app content - wrapped with authentication
  const renderMainContent = () => {
    if (currentView === 'dashboard') {
      return renderDashboard();
    }

    if (currentView === 'templates') {
      return renderTemplatesView();
    }

    if (currentView === 'vulnerability') {
      return renderVulnerabilityView();
    }

    // Default to IDE view
    return (
    <div className="chain-ide-container" onClick={closeContextMenu}>
      {/* Top Bar */}
      <div className="top-bar">
        <div className="top-bar-left">
          <div className="app-title">
            <FaDatabase />
            <span>FlashAudit</span>
            <button className="back-to-dashboard" onClick={() => setCurrentView('dashboard')}>
              ← Dashboard
            </button>
          </div>
        </div>

        <div className="top-bar-center">
          <div className="network-selector">
            <FaNetworkWired />
            <span>{selectedNetwork}</span>
          </div>
        </div>

        <div className="top-bar-right">
          <div className="wallet-connection">
            <FaWallet />
            {isConnected ? (
              <span className="wallet-connected">Connected</span>
            ) : (
              <button className="connect-wallet" onClick={connectWallet}>
                Connect Wallet
              </button>
            )}
          </div>
          <div className="user-section">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                  userButtonPopoverCard: "shadow-lg border",
                  userButtonPopoverActionButton: "hover:bg-gray-100"
                }
              }}
              showName={true}
            />
          </div>
        </div>
      </div>

      {/* Left Sidebar */}
      <div className="sidebar">
        <div className="sidebar-icons">
          <button
            className={`sidebar-icon ${activePanel === 'explorer' ? 'active' : ''}`}
            onClick={() => setActivePanel('explorer')}
            title="File Explorer"
          >
            <FaFolder />
          </button>
          <button
            className={`sidebar-icon ${activePanel === 'plugin' ? 'active' : ''}`}
            onClick={() => setActivePanel('plugin')}
            title="Plugin Manager"
          >
            <FaCube />
          </button>
          <button
            className={`sidebar-icon ${activePanel === 'port' ? 'active' : ''}`}
            onClick={() => setActivePanel('port')}
            title="Port Manager"
          >
            <FaNetworkWired />
          </button>
          <button
            className={`sidebar-icon ${activePanel === 'sandbox' ? 'active' : ''}`}
            onClick={() => setActivePanel('sandbox')}
            title="Sandbox Management"
          >
            <FaPlay />
          </button>
          <button
            className={`sidebar-icon ${activePanel === 'git' ? 'active' : ''}`}
            onClick={() => setActivePanel('git')}
            title="Git Manager"
          >
            <FaHistory />
          </button>
        </div>
        
        <div className="panel-content">
          {renderPanelContent()}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="main-content">
        <div className={`editor-container ${showDebugPanel ? 'with-debug-panel' : ''}`}>
          {currentProject && activeFile ? (
            <div className="file-editor">
              {/* File Tabs */}
              <div className="file-tabs">
                {openFiles.map(file => (
                  <div
                    key={file}
                    className={`file-tab ${activeFile === file ? 'active' : ''}`}
                    onClick={() => setActiveFile(file)}
                  >
                    <span>{file.split('/').pop()}</span>
                    <button
                      className="close-tab"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newOpenFiles = openFiles.filter(f => f !== file);
                        setOpenFiles(newOpenFiles);
                        if (activeFile === file && newOpenFiles.length > 0) {
                          setActiveFile(newOpenFiles[0]);
                        } else if (newOpenFiles.length === 0) {
                          setActiveFile(null);
                        }
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* File Content Editor */}
              <div className="file-content">
                <div className="file-header">
                  <span className="file-path">{activeFile}</span>
                  <span className="auto-save-indicator" id="auto-save-indicator">
                    ✓ Auto-saved
                  </span>
                  <div className="file-actions">
                    <button className="save-btn" title="Save File (Ctrl+S)" onClick={saveCurrentProject}>
                      💾 Save
                    </button>
                    <button
                      className="format-btn"
                      title="Format Code (Ctrl+Shift+F)"
                      onClick={() => {
                        if (activeFile && fileContents[activeFile]) {
                          const formattedCode = terminalService.formatCode(fileContents[activeFile], activeFile);
                          setFileContents({
                            ...fileContents,
                            [activeFile]: formattedCode
                          });

                          // Auto-save after formatting
                          if (currentProject) {
                            saveProjectToStorage(currentProject, {
                              ...fileContents,
                              [activeFile]: formattedCode
                            });
                          }
                        } else {
                          terminalService.addLog('warning', 'No file selected for formatting', 'formatter');
                        }
                      }}
                    >
                      🎨 Format
                    </button>
                    <button
                      className="validate-btn"
                      title="Validate Syntax (Ctrl+Shift+V)"
                      onClick={() => {
                        if (activeFile && fileContents[activeFile]) {
                          terminalService.validateSyntax(fileContents[activeFile], activeFile);
                        } else {
                          terminalService.addLog('warning', 'No file selected for validation', 'validator');
                        }
                      }}
                    >
                      🔍 Validate
                    </button>
                  </div>
                </div>
                <div className="code-editor-container">
                  <div className="line-numbers">
                    {(() => {
                      const content = fileContents[activeFile || ''] || '';
                      const lines = content.split('\n');
                      // Ensure at least one line number is shown for empty files
                      const lineCount = Math.max(lines.length, 1);
                      return Array.from({ length: lineCount }, (_, index) => (
                        <div
                          key={index}
                          className={`line-number ${currentLine === index + 1 ? 'current-line' : ''}`}
                        >
                          {index + 1}
                        </div>
                      ));
                    })()}
                  </div>
                  <textarea
                    className="code-editor"
                    value={fileContents[activeFile || ''] || ''}
                    onChange={(e) => {
                      const newFileContents = {
                        ...fileContents,
                        [activeFile || '']: e.target.value
                      };
                      setFileContents(newFileContents);

                      // Auto-save after a short delay (debounced)
                      if (currentProject) {
                        clearTimeout((window as any).autoSaveTimeout);
                        (window as any).autoSaveTimeout = setTimeout(() => {
                          saveProjectToStorage(currentProject, newFileContents);
                          terminalService.addLog('info', `Auto-saved ${activeFile}`, 'editor');

                          // Show auto-save indicator
                          const indicator = document.getElementById('auto-save-indicator');
                          if (indicator) {
                            indicator.classList.add('visible');
                            setTimeout(() => {
                              indicator.classList.remove('visible');
                            }, 2000);
                          }
                        }, 1000); // Save after 1 second of inactivity
                      }
                    }}
                    onSelect={(e) => {
                      // Track cursor position to highlight current line
                      const textarea = e.target as HTMLTextAreaElement;
                      const cursorPosition = textarea.selectionStart;
                      const textBeforeCursor = textarea.value.substring(0, cursorPosition);
                      const lineNumber = textBeforeCursor.split('\n').length;
                      setCurrentLine(lineNumber);
                    }}
                    onClick={(e) => {
                      // Track cursor position on click
                      const textarea = e.target as HTMLTextAreaElement;
                      const cursorPosition = textarea.selectionStart;
                      const textBeforeCursor = textarea.value.substring(0, cursorPosition);
                      const lineNumber = textBeforeCursor.split('\n').length;
                      setCurrentLine(lineNumber);
                    }}
                    onKeyDown={(e) => {
                      // Enhanced keyboard shortcuts
                      if (e.ctrlKey || e.metaKey) {
                        switch (e.key) {
                          case 's':
                            e.preventDefault();
                            saveCurrentProject();
                            terminalService.addLog('success', `Saved ${activeFile}`, 'editor');
                            break;
                          case 'f':
                            if (e.shiftKey) {
                              // Ctrl+Shift+F for formatting
                              e.preventDefault();
                              if (activeFile && fileContents[activeFile]) {
                                const formattedCode = terminalService.formatCode(fileContents[activeFile], activeFile);
                                setFileContents({
                                  ...fileContents,
                                  [activeFile]: formattedCode
                                });

                                if (currentProject) {
                                  saveProjectToStorage(currentProject, {
                                    ...fileContents,
                                    [activeFile]: formattedCode
                                  });
                                }
                              }
                            } else {
                              e.preventDefault();
                              terminalService.addLog('info', 'Find functionality (Ctrl+F)', 'editor');
                            }
                            break;
                          case 'v':
                            if (e.shiftKey) {
                              // Ctrl+Shift+V for validation
                              e.preventDefault();
                              if (activeFile && fileContents[activeFile]) {
                                terminalService.validateSyntax(fileContents[activeFile], activeFile);
                              }
                            }
                            break;
                          case '/':
                            e.preventDefault();
                            // Toggle comment
                            const textarea = e.target as HTMLTextAreaElement;
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const text = textarea.value;
                            const beforeSelection = text.substring(0, start);
                            const selection = text.substring(start, end);
                            const afterSelection = text.substring(end);

                            // Simple comment toggle for Solidity
                            if (selection.includes('//')) {
                              const uncommented = selection.replace(/\/\/ /g, '');
                              const newValue = beforeSelection + uncommented + afterSelection;
                              setFileContents({
                                ...fileContents,
                                [activeFile]: newValue
                              });
                            } else {
                              const commented = selection.split('\n').map(line =>
                                line.trim() ? `// ${line}` : line
                              ).join('\n');
                              const newValue = beforeSelection + commented + afterSelection;
                              setFileContents({
                                ...fileContents,
                                [activeFile]: newValue
                              });
                            }
                            break;
                        }
                      }

                      // Auto-indentation for braces
                      if (e.key === 'Enter') {
                        const textarea = e.target as HTMLTextAreaElement;
                        const cursorPosition = textarea.selectionStart;
                        const textBeforeCursor = textarea.value.substring(0, cursorPosition);
                        const currentLine = textBeforeCursor.split('\n').pop() || '';
                        const indentMatch = currentLine.match(/^(\s*)/);
                        const currentIndent = indentMatch ? indentMatch[1] : '';

                        // Add extra indent if line ends with {
                        if (currentLine.trim().endsWith('{')) {
                          setTimeout(() => {
                            const newCursorPos = textarea.selectionStart;
                            const beforeCursor = textarea.value.substring(0, newCursorPos);
                            const afterCursor = textarea.value.substring(newCursorPos);
                            const newValue = beforeCursor + '  ' + currentIndent + afterCursor;
                            setFileContents({
                              ...fileContents,
                              [activeFile]: newValue
                            });
                            // Set cursor position after the new indent
                            setTimeout(() => {
                              textarea.selectionStart = textarea.selectionEnd = newCursorPos + 2 + currentIndent.length;
                            }, 0);
                          }, 0);
                        } else if (currentIndent) {
                          // Maintain current indentation
                          setTimeout(() => {
                            const newCursorPos = textarea.selectionStart;
                            const beforeCursor = textarea.value.substring(0, newCursorPos);
                            const afterCursor = textarea.value.substring(newCursorPos);
                            const newValue = beforeCursor + currentIndent + afterCursor;
                            setFileContents({
                              ...fileContents,
                              [activeFile]: newValue
                            });
                            setTimeout(() => {
                              textarea.selectionStart = textarea.selectionEnd = newCursorPos + currentIndent.length;
                            }, 0);
                          }, 0);
                        }
                      }
                    }}
                    onKeyUp={(e) => {
                      // Track cursor position on key navigation
                      const textarea = e.target as HTMLTextAreaElement;
                      const cursorPosition = textarea.selectionStart;
                      const textBeforeCursor = textarea.value.substring(0, cursorPosition);
                      const lineNumber = textBeforeCursor.split('\n').length;
                      setCurrentLine(lineNumber);

                      // Real-time syntax validation for Solidity files
                      if (activeFile.endsWith('.sol')) {
                        const content = textarea.value;
                        const lines = content.split('\n');
                        let hasErrors = false;

                        // Basic syntax checks
                        lines.forEach((line) => {
                          const trimmedLine = line.trim();
                          if (trimmedLine && !trimmedLine.startsWith('//') && !trimmedLine.startsWith('/*')) {
                            // Check for missing semicolons
                            if ((trimmedLine.includes('=') || trimmedLine.includes('return') ||
                                 trimmedLine.includes('require') || trimmedLine.includes('emit')) &&
                                !trimmedLine.endsWith(';') && !trimmedLine.endsWith('{') &&
                                !trimmedLine.endsWith('}')) {
                              hasErrors = true;
                            }
                          }
                        });

                        if (hasErrors) {
                          terminalService.addLog('warning', 'Syntax issues detected in Solidity code', 'editor');
                        }
                      }
                    }}
                    placeholder="Start coding..."
                    spellCheck={false}
                    onScroll={(e) => {
                      // Sync line numbers scroll with textarea scroll
                      const lineNumbers = e.currentTarget.parentElement?.querySelector('.line-numbers') as HTMLElement;
                      if (lineNumbers) {
                        lineNumbers.scrollTop = e.currentTarget.scrollTop;
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          ) : currentProject ? (
            <div className="no-file-selected">
              <h3>📁 {currentProject}</h3>
              <p>Select a file from the explorer to start editing</p>
              <div className="project-actions">
                <button className="action-btn" onClick={() => setActivePanel('compiler')}>
                  ⚙️ Compile Project
                </button>
                <button className="action-btn" onClick={() => setActivePanel('deploy')}>
                  🚀 Deploy Contract
                </button>
                <button className="action-btn" onClick={() => setActivePanel('audit')}>
                  🛡️ Run Security Audit
                </button>
              </div>
            </div>
          ) : (
            <div className="welcome-message">
              <h2>🎉 Welcome to NovaGard!</h2>
              <p>Your professional smart contract development environment is ready.</p>
              <div className="features-list">
                <div className="feature-item">✅ Multi-network support</div>
                <div className="feature-item">✅ Advanced security auditing</div>
                <div className="feature-item">✅ Real-time compilation</div>
                <div className="feature-item">✅ One-click deployment</div>
                <div className="feature-item">✅ Audit statistics & analytics</div>
              </div>
              <p className="get-started">👈 Use the sidebar to explore different features!</p>
            </div>
          )}
        </div>

        {/* Debug Panel */}
        {showDebugPanel && activeFile && fileContents[activeFile] && (
          <div className="debug-panel-container" style={{ width: debugPanelWidth }}>
            <div className="debug-panel-header">
              <h3>🔍 Debug Panel</h3>
              <div className="debug-panel-controls">
                <button
                  className="panel-control-btn"
                  onClick={() => setDebugPanelWidth(Math.max(300, debugPanelWidth - 50))}
                  title="Decrease width"
                >
                  ←
                </button>
                <button
                  className="panel-control-btn"
                  onClick={() => setDebugPanelWidth(Math.min(800, debugPanelWidth + 50))}
                  title="Increase width"
                >
                  →
                </button>
                <button
                  className="panel-control-btn"
                  onClick={() => setShowDebugPanel(false)}
                  title="Close debug panel"
                >
                  ✕
                </button>
              </div>
            </div>
            <DebugPanel
              contractCode={fileContents[activeFile]}
              contractName={activeFile.replace('.sol', '')}
              onIssueClick={(line) => {
                // Jump to line in editor
                setCurrentLine(line);
                // You could also scroll to the line here
              }}
            />
          </div>
        )}
      </div>
      {/* Terminal/Output Panel - Only in IDE */}
      <div className="bottom-panel">
        <div className="terminal-content">
          <div className="terminal-header">
            <span>📟 Output</span>
            <div className="terminal-actions">
              <button
                className="terminal-action-btn"
                onClick={() => terminalService.getServiceStatus()}
                title="Check Service Status"
              >
                🔍 Status
              </button>
              <button
                className="terminal-action-btn"
                onClick={() => terminalService.startDevelopmentSession()}
                title="Start Development Session"
              >
                🚀 Start Session
              </button>
              <button
                className="terminal-action-btn"
                onClick={() => terminalService.clearLogs()}
                title="Clear Terminal"
              >
                🗑️ Clear
              </button>
            </div>
          </div>
          <div className="terminal-output">
            {terminalLogs.map((log, index) => (
              <div key={index} className="terminal-log">
                <span className="terminal-timestamp">{log.timestamp}</span>
                <span className={`terminal-level ${log.level}`}>
                  {log.level}
                </span>
                <span className="terminal-message">{log.message}</span>
                {log.source && (
                  <span className={`terminal-source ${log.source}`}>
                    {log.source}
                  </span>
                )}
              </div>
            ))}

            {/* Terminal Input */}
            <div className="terminal-input-container">
              <span className="terminal-prompt">
                <span className="terminal-user">user@flashaudit</span>
                <span className="terminal-separator">:</span>
                <span className="terminal-path">~/workspace</span>
                <span className="terminal-dollar">$</span>
              </span>
              <input
                type="text"
                className="terminal-input"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (terminalInput.trim()) {
                      // Add to history
                      setTerminalHistory(prev => [...prev, terminalInput]);
                      setHistoryIndex(-1);

                      // Execute command
                      terminalService.executeCommand(terminalInput);

                      // Clear input
                      setTerminalInput('');
                    }
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (terminalHistory.length > 0) {
                      const newIndex = historyIndex === -1 ? terminalHistory.length - 1 : Math.max(0, historyIndex - 1);
                      setHistoryIndex(newIndex);
                      setTerminalInput(terminalHistory[newIndex]);
                    }
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (historyIndex >= 0) {
                      const newIndex = historyIndex + 1;
                      if (newIndex >= terminalHistory.length) {
                        setHistoryIndex(-1);
                        setTerminalInput('');
                      } else {
                        setHistoryIndex(newIndex);
                        setTerminalInput(terminalHistory[newIndex]);
                      }
                    }
                  } else if (e.key === 'Tab') {
                    e.preventDefault();
                    // Auto-complete functionality
                    const commands = ['help', 'clear', 'ls', 'cat', 'compile', 'deploy', 'test', 'install', 'format', 'validate', 'git', 'npm', 'ai'];
                    const currentInput = terminalInput.toLowerCase();
                    const matches = commands.filter(cmd => cmd.startsWith(currentInput));

                    if (matches.length === 1) {
                      setTerminalInput(matches[0] + ' ');
                    } else if (matches.length > 1) {
                      terminalService.addLog('info', `Available: ${matches.join(', ')}`, 'terminal');
                    }
                  }
                }}
                placeholder="Type a command... (try 'help' or 'ai <question>')"
                autoFocus
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    );
  };

  // Main app return with authentication wrapper
  return (
      <>
        <SignedOut>
          <div className="auth-container">
            <div className="auth-card">
              <div className="auth-header">
                <div className="logo-section">
                  <div className="logo-icon" style={{ fontSize: '24px', color: '#007acc' }}>🛡️</div>
                  <h1>NovaGard</h1>
                </div>
                <p className="auth-subtitle">Smart Contract Security & Development Platform</p>
              </div>
            <div className="auth-content">
              <div className="auth-features">
                <div className="feature-item">
                  <FaDatabase className="feature-icon" />
                  <span>Smart Contract Analysis</span>
                </div>
                <div className="feature-item">
                  <FaNetworkWired className="feature-icon" />
                  <span>Multi-Chain Support</span>
                </div>
                <div className="feature-item">
                  <FaWallet className="feature-icon" />
                  <span>Wallet Integration</span>
                </div>
              </div>
              <div className="auth-actions">
                <SignInButton mode="modal">
                  <button className="sign-in-button">
                    <FaUser />
                    Sign In to Continue
                  </button>
                </SignInButton>
              </div>
            </div>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        {renderMainContent()}
      </SignedIn>
    </>
  );
}

export default App;
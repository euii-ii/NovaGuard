import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import {
  FaFolder,
  FaPlay,
  FaHistory,
  FaNetworkWired,
  FaWallet,
  FaDatabase,
  FaPlus,
  FaSearch,
  FaUser,
  FaEllipsisV,
  FaCube,
  FaFile,
  FaFolderPlus,
  FaSync,
  FaDownload
} from 'react-icons/fa';
import { SignedIn, SignedOut, SignInButton, UserButton, useAuth } from '@clerk/clerk-react';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { ProjectService } from './services/projectService';
import { VulnerabilityService } from './services/vulnerabilityService';


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
  console.log('App component rendering...');

  // Get Clerk authentication with error handling
  let getToken: (() => Promise<string | null>) | undefined;
  let userId: string | null = null;

  try {
    const auth = useAuth();
    getToken = auth.getToken;
    console.log('Clerk auth loaded successfully');
  } catch (error) {
    console.error('Error loading Clerk auth:', error);
  }

  // Initialize Supabase auth integration with Clerk
  try {
    const supabaseAuth = useSupabaseAuth();
    userId = supabaseAuth.userId;
    console.log('Supabase auth initialized:', { userId: userId ? 'Present' : 'None' });
  } catch (error) {
    console.error('Error loading Supabase auth:', error);
  }

  const [currentView, setCurrentView] = useState<'dashboard' | 'templates' | 'ide' | 'vulnerability'>('dashboard');

  // Initialize vulnerability controller
  const vulnerabilityController = useRef(new (class VulnerabilityController {
    async performScan(request: any, progressCallback?: any) {
      try {
        progressCallback?.(10, 'initializing');

        // Get auth token with error handling
        if (!getToken) {
          throw new Error('Authentication not available');
        }

        const token = await getToken();
        if (!token) {
          throw new Error('Authentication required');
        }

        progressCallback?.(20, 'connecting');

        // Prepare the audit request
        const auditRequest = {
          contractAddress: request.contractAddress,
          chain: request.networkId,
          agents: ['security', 'gas-optimization', 'compliance'],
          analysisMode: 'comprehensive',
          includeCrossChain: false
        };

        progressCallback?.(30, 'starting analysis');

        // Call the backend audit API (with fallback for demo)
        let auditResult: any;
        try {
          const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
          const response = await fetch(`${apiUrl}/api/audit/address`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(auditRequest)
          });

          if (!response.ok) {
            throw new Error('API request failed');
          }

          auditResult = await response.json();

          if (!auditResult.success) {
            throw new Error(auditResult.error || 'Audit failed');
          }
        } catch (apiError) {
          console.warn('Backend API not available, using demo data:', apiError);

          // Simulate progress and return demo result
          progressCallback?.(90, 'completing analysis');
          await new Promise(resolve => setTimeout(resolve, 1000));
          progressCallback?.(100, 'complete');

          // Return demo audit result for testing
          return {
            vulnerabilities: [
              {
                name: "Demo Vulnerability",
                affectedLines: "1-10",
                description: "This is a demo vulnerability for testing purposes. Backend API is not available.",
                severity: "medium",
                fixSuggestion: "This is demo data - deploy backend functions to get real analysis."
              }
            ],
            securityScore: 75,
            riskCategory: {
              label: "medium",
              justification: "Demo data - backend not deployed"
            },
            codeInsights: {
              gasOptimizationTips: ["Demo: Backend API not available - upgrade to Blaze plan to deploy functions"],
              antiPatternNotices: ["Demo: This is test data"],
              dangerousUsage: ["Demo: Backend functions not deployed"]
            }
          };
        }

        progressCallback?.(50, 'analyzing');

        // Poll for results (only if we have a real API response)
        if (auditResult && auditResult.auditId) {
          const auditId = auditResult.auditId;
          let attempts = 0;
          const maxAttempts = 30; // 30 seconds timeout

          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;

            const progress = 50 + (attempts / maxAttempts) * 40;
            progressCallback?.(progress, 'analyzing');

            try {
              // Check audit status
              const statusResponse = await fetch(`${apiUrl}/api/audit/results/${auditId}`, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (statusResponse.ok) {
                const statusData = await statusResponse.json();

                if (statusData.success && statusData.data && statusData.data.status === 'completed') {
                  progressCallback?.(100, 'completed');

                  // Transform backend response to frontend format
                  return {
                    success: true,
                    data: {
                      scanId: auditId,
                      contractAddress: request.contractAddress,
                      networkId: request.networkId,
                      vulnerabilities: statusData.data.vulnerabilities || [],
                      gasOptimizations: statusData.data.gasOptimizations || [],
                      securityScore: statusData.data.securityScore || 0,
                      riskLevel: statusData.data.riskCategory?.label || 'Unknown',
                      complianceChecks: statusData.data.complianceChecks || {},
                      summary: {
                        overallRisk: statusData.data.riskCategory?.label || 'Unknown',
                        totalVulnerabilities: (statusData.data.vulnerabilities || []).length,
                        gasOptimizationSavings: statusData.data.gasOptimizations?.reduce((total: number, opt: any) => total + (opt.savings || 0), 0) || 0
                      }
                    }
                  };
                }
              }
            } catch (statusError) {
              console.warn('Status check failed:', statusError);
              // Continue polling
            }
          }

          throw new Error('Analysis timeout - please try again');
        } else {
          // No audit ID, return error
          throw new Error('Invalid audit response');
        }

      } catch (error) {
        console.error('Vulnerability scan error:', error);
        throw error;
      }
    }
  })()).current;

  // Terminal service for real-time logs
  const terminalService = useRef(new (class TerminalService {
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

        const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
        const response = await fetch(`${apiUrl}/api/v1/realtime/session/start`, {
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
          { name: 'ChainIDE', endpoint: '/api/v1/chainide/status' },
          { name: 'Real-time Development', endpoint: '/api/v1/realtime/metrics' },
          { name: 'Collaboration Tools', endpoint: '/api/v1/collaboration/status' }
        ];

        for (const service of services) {
          try {
            const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
            const response = await fetch(`${apiUrl}${service.endpoint}`, {
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

        // Simulate compilation process with real-time validation
        const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
        const response = await fetch(`${apiUrl}/api/v1/realtime/validation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            content: contractCode,
            filePath: `${contractName}.sol`
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
  })()).current;
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
      level: 'info',
      message: 'FlashAudit IDE initialized successfully!',
      source: 'system'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      message: 'Backend services connected.',
      source: 'system'
    }
  ]);

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
      if (userId && getToken) {
        try {
          const userProjects = await ProjectService.getUserProjects(userId, getToken);
          // Ensure all required fields are present for type compatibility
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
        } catch (error) {
          console.error('Failed to load projects, using demo data:', error);
          // Fallback to demo projects when API is not available
          const demoProjects: Project[] = [
            {
              id: 'demo-1',
              name: 'DeFi Token Contract',
              description: 'ERC-20 token with advanced DeFi features',
              user_id: userId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              project_data: { template: 'erc20', network: 'ethereum' },
              status: 'active',
              type: 'contract'
            },
            {
              id: 'demo-2',
              name: 'NFT Marketplace',
              description: 'ERC-721 marketplace with royalty features',
              user_id: userId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              project_data: { template: 'erc721', network: 'polygon' },
              status: 'active',
              type: 'contract'
            },
            {
              id: 'demo-3',
              name: 'Staking Contract',
              description: 'Token staking with rewards distribution',
              user_id: userId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              project_data: { template: 'staking', network: 'arbitrum' },
              status: 'active',
              type: 'contract'
            }
          ];
          setProjects(demoProjects);
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

    let scanRecord: any = null; // Declare scanRecord in the outer scope

    try {
      // Create scan record in Supabase
      scanRecord = await VulnerabilityService.createScan(
        contractAddress.trim(),
        selectedVulnNetwork,
        userId
      );

      if (!scanRecord) {
        throw new Error('Failed to create scan record');
      }

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

      // Perform scan using the controller
      const response = await vulnerabilityController.performScan(
        scanRequest,
        progressCallback
      ) as any;

      if (response.success && response.data) {
        console.log('Scan results received:', response.data); // Debug log
        setVulnerabilityResults(response.data);
        setScanStatus('completed');

        // Save results to Supabase
        await VulnerabilityService.updateScanResults(
          scanRecord.id,
          response.data,
          'completed'
        );
      } else {
        throw new Error(response.error?.message || 'Scan failed');
      }

    } catch (error: any) {
      console.error('Vulnerability scan failed:', error);
      setScanError(error.message || 'Vulnerability scan failed. Please try again.');
      setScanStatus('failed');

      // Update scan record as failed if it exists
      if (scanRecord) {
        await VulnerabilityService.updateScanResults(
          scanRecord.id,
          { error: error.message },
          'failed'
        );
      }
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

    if (!userId) {
      alert('Please sign in to create a project');
      return;
    }

    if (!getToken) {
      alert('Authentication not ready. Please try again.');
      return;
    }

    try {
      const templateFiles = getTemplateFiles(template);
      const mainContractFile = templateFiles.find(f => f.endsWith('.sol')) || templateFiles[0];
      const contractCode = mainContractFile ? getTemplateFileContent(template, mainContractFile) : undefined;

      const projectData = {
        name: `${template.name} ${Math.random().toString(36).substring(2, 8)}`,
        description: template.description,
        template: template.name,
        network: 'ethereum', // Default network
        contract_code: contractCode
      };

      console.log('Creating project with data:', projectData);
      const newProject = await ProjectService.createProject(projectData, userId, getToken);

      if (newProject) {
        const normalizedProject: Project = {
          id: newProject.id,
          name: newProject.name,
          description: newProject.description ?? null,
          user_id: newProject.user_id,
          created_at: newProject.created_at,
          updated_at: newProject.updated_at,
          project_data: {}, // default empty object
          status: 'active', // default status
          type: 'contract', // default type
        };
        setProjects(prev => [normalizedProject, ...prev]);
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
      } else {
        alert('Failed to create project. Please try again.');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      alert(`Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }


  };

  const saveCurrentProject = () => {
    if (currentProject && Object.keys(fileContents).length > 0) {
      saveProjectToStorage(currentProject, fileContents);
      console.log(`Project "${currentProject}" saved successfully!`);
      // You could add a toast notification here
    }
  };

  const openProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setCurrentProject(project.name);

      // Try to load project files from storage first
      const savedFiles = loadProjectFromStorage(project.name);

      if (savedFiles && Object.keys(savedFiles).length > 0) {
        // Load saved project files
        setFileContents(savedFiles);
        const firstFile = Object.keys(savedFiles)[0];
        setOpenFiles([firstFile]);
        setActiveFile(firstFile);
      } else {
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
      }

      setCurrentView('ide');
    }
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
                      console.log('Template clicked:', template.name);
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
              <button className="new-project-btn" onClick={createNewProject} title="Create New Project">
                <FaPlus />
              </button>
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
        <div className="editor-container">
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
                  <div className="file-actions">
                    <button className="save-btn" title="Save File" onClick={saveCurrentProject}>
                      💾 Save
                    </button>
                  </div>
                </div>
                <div className="code-editor-container">
                  <div className="line-numbers">
                    {(() => {
                      const content = fileContents[activeFile] || '';
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
                    value={fileContents[activeFile] || ''}
                    onChange={(e) => {
                      const newFileContents = {
                        ...fileContents,
                        [activeFile]: e.target.value
                      };
                      setFileContents(newFileContents);

                      // Auto-save after a short delay (debounced)
                      if (currentProject) {
                        clearTimeout((window as any).autoSaveTimeout);
                        (window as any).autoSaveTimeout = setTimeout(() => {
                          saveProjectToStorage(currentProject, newFileContents);
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
                    onKeyUp={(e) => {
                      // Track cursor position on key navigation
                      const textarea = e.target as HTMLTextAreaElement;
                      const cursorPosition = textarea.selectionStart;
                      const textBeforeCursor = textarea.value.substring(0, cursorPosition);
                      const lineNumber = textBeforeCursor.split('\n').length;
                      setCurrentLine(lineNumber);
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
              <div
                key={index}
                className={`terminal-line terminal-${log.level}`}
              >
                <span className="terminal-timestamp">[{log.timestamp}]</span>
                {log.source && <span className="terminal-source">[{log.source}]</span>}
                <span className="terminal-message">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    );
  };

  // Main app return - temporarily bypass authentication for demo
  return (
    <>
      {/* Temporarily show main content without authentication for demo */}
      {renderMainContent()}

      <SignedOut>
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <div className="logo-section">
                <FaDatabase className="logo-icon" />
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

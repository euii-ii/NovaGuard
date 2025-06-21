export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
  isOpen?: boolean;
  extension?: string;
}

export interface CompilerResult {
  success: boolean;
  bytecode?: string;
  abi?: any[];
  errors?: string[];
  warnings?: string[];
  gasEstimate?: number;
}

export interface DeploymentResult {
  success: boolean;
  contractAddress?: string;
  transactionHash?: string;
  gasUsed?: number;
  error?: string;
  network?: string;
}

export interface Terminal {
  id: string;
  name: string;
  output: string[];
  isActive: boolean;
}

export interface AuditHistory {
  auditId: string;
  timestamp: string;
  contractAddress?: string;
  riskLevel: string;
  overallScore: number;
  status: string;
}

export interface NetworkInfo {
  name: string;
  chainId: number;
  rpcUrl: string;
  blockExplorer: string;
  isTestnet: boolean;
}

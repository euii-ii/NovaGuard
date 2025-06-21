// Mock implementations for blockchain network calls
const { EventEmitter } = require('events');

/**
 * Mock Web3 Provider for Ethereum-like chains
 */
class MockWeb3Provider extends EventEmitter {
  constructor(chainId = 1) {
    super();
    this.chainId = chainId;
    this.isConnected = true;
    this.accounts = [
      '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5A',
      '0x8ba1f109551bD432803012645Hac136c5C1515A'
    ];
  }

  async request({ method, params = [] }) {
    switch (method) {
      case 'eth_chainId':
        return `0x${this.chainId.toString(16)}`;
      
      case 'eth_accounts':
        return this.accounts;
      
      case 'eth_getBalance':
        return '0x1bc16d674ec80000'; // 2 ETH
      
      case 'eth_getCode':
        const address = params[0];
        if (address === '0x0000000000000000000000000000000000000000') {
          return '0x'; // EOA
        }
        return '0x608060405234801561001057600080fd5b50...'; // Mock contract bytecode
      
      case 'eth_call':
        return '0x0000000000000000000000000000000000000000000000000000000000000001';
      
      case 'eth_getTransactionReceipt':
        return {
          transactionHash: params[0],
          blockNumber: '0x1b4',
          gasUsed: '0x5208',
          status: '0x1'
        };
      
      case 'eth_sendTransaction':
        return '0x' + Math.random().toString(16).substring(2, 66);
      
      case 'eth_estimateGas':
        return '0x5208'; // 21000 gas
      
      case 'eth_gasPrice':
        return '0x4a817c800'; // 20 gwei
      
      case 'net_version':
        return this.chainId.toString();
      
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }

  disconnect() {
    this.isConnected = false;
    this.emit('disconnect');
  }
}

/**
 * Mock Phantom Wallet Provider for Solana
 */
class MockPhantomProvider extends EventEmitter {
  constructor() {
    super();
    this.isPhantom = true;
    this.isConnected = false;
    this.publicKey = null;
  }

  async connect() {
    this.isConnected = true;
    this.publicKey = {
      toString: () => 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
      toBase58: () => 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH'
    };
    this.emit('connect', this.publicKey);
    return { publicKey: this.publicKey };
  }

  async disconnect() {
    this.isConnected = false;
    this.publicKey = null;
    this.emit('disconnect');
  }

  async signTransaction(transaction) {
    return {
      ...transaction,
      signature: new Uint8Array(64).fill(1) // Mock signature
    };
  }

  async signAllTransactions(transactions) {
    return transactions.map(tx => this.signTransaction(tx));
  }

  async signMessage(message) {
    return {
      signature: new Uint8Array(64).fill(1),
      publicKey: this.publicKey
    };
  }
}

/**
 * Mock MetaMask Provider
 */
class MockMetaMaskProvider extends MockWeb3Provider {
  constructor() {
    super(1); // Ethereum mainnet
    this.isMetaMask = true;
    this.selectedAddress = this.accounts[0];
  }

  async enable() {
    return this.accounts;
  }

  async request({ method, params = [] }) {
    switch (method) {
      case 'eth_requestAccounts':
        return this.accounts;
      
      case 'wallet_switchEthereumChain':
        const chainId = parseInt(params[0].chainId, 16);
        this.chainId = chainId;
        this.emit('chainChanged', params[0].chainId);
        return null;
      
      case 'wallet_addEthereumChain':
        // Mock adding a new chain
        return null;
      
      default:
        return super.request({ method, params });
    }
  }
}

/**
 * Mock Ethers.js Provider
 */
class MockEthersProvider {
  constructor(network = 'homestead') {
    this.network = { name: network, chainId: 1 };
    this._isProvider = true;
  }

  async getNetwork() {
    return this.network;
  }

  async getBlockNumber() {
    return 18500000;
  }

  async getBalance(address) {
    return '2000000000000000000'; // 2 ETH
  }

  async getCode(address) {
    if (address === '0x0000000000000000000000000000000000000000') {
      return '0x';
    }
    return '0x608060405234801561001057600080fd5b50...';
  }

  async call(transaction) {
    return '0x0000000000000000000000000000000000000000000000000000000000000001';
  }

  async estimateGas(transaction) {
    return '21000';
  }

  async getGasPrice() {
    return '20000000000'; // 20 gwei
  }

  async getTransaction(hash) {
    return {
      hash,
      blockNumber: 18500000,
      from: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5A',
      to: '0x8ba1f109551bD432803012645Hac136c5C1515A',
      value: '1000000000000000000',
      gasLimit: '21000',
      gasPrice: '20000000000'
    };
  }

  async getTransactionReceipt(hash) {
    return {
      transactionHash: hash,
      blockNumber: 18500000,
      gasUsed: '21000',
      status: 1,
      logs: []
    };
  }

  async sendTransaction(transaction) {
    return {
      hash: '0x' + Math.random().toString(16).substring(2, 66),
      wait: async () => ({
        transactionHash: '0x' + Math.random().toString(16).substring(2, 66),
        blockNumber: 18500000,
        gasUsed: '21000',
        status: 1
      })
    };
  }
}

/**
 * Mock Contract Instance
 */
class MockContract {
  constructor(address, abi, provider) {
    this.address = address;
    this.interface = { fragments: abi };
    this.provider = provider;
    
    // Create mock functions based on ABI
    abi.forEach(item => {
      if (item.type === 'function') {
        this[item.name] = async (...args) => {
          // Mock function responses
          switch (item.name) {
            case 'balanceOf':
              return '1000000000000000000'; // 1 token
            case 'totalSupply':
              return '1000000000000000000000'; // 1000 tokens
            case 'name':
              return 'Mock Token';
            case 'symbol':
              return 'MOCK';
            case 'decimals':
              return 18;
            case 'owner':
              return '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5A';
            default:
              return '0x0000000000000000000000000000000000000000000000000000000000000001';
          }
        };
      }
    });
  }

  async deployed() {
    return this;
  }
}

/**
 * Mock Web3.js Instance
 */
class MockWeb3 {
  constructor(provider) {
    this.currentProvider = provider;
    this.eth = {
      getAccounts: async () => provider.accounts,
      getBalance: async (address) => '2000000000000000000',
      getCode: async (address) => address === '0x0000000000000000000000000000000000000000' ? '0x' : '0x608060405234801561001057600080fd5b50...',
      getBlockNumber: async () => 18500000,
      getGasPrice: async () => '20000000000',
      estimateGas: async () => 21000,
      sendTransaction: async (tx) => ({
        transactionHash: '0x' + Math.random().toString(16).substring(2, 66)
      }),
      Contract: function(abi, address) {
        return new MockContract(address, abi, provider);
      }
    };
    this.utils = {
      toWei: (value, unit) => {
        const multipliers = {
          'ether': '1000000000000000000',
          'gwei': '1000000000',
          'wei': '1'
        };
        return (parseFloat(value) * parseFloat(multipliers[unit] || '1')).toString();
      },
      fromWei: (value, unit) => {
        const divisors = {
          'ether': 1000000000000000000,
          'gwei': 1000000000,
          'wei': 1
        };
        return (parseFloat(value) / (divisors[unit] || 1)).toString();
      },
      isAddress: (address) => /^0x[a-fA-F0-9]{40}$/.test(address)
    };
  }
}

/**
 * Mock Solana Connection
 */
class MockSolanaConnection {
  constructor(endpoint) {
    this.endpoint = endpoint;
  }

  async getAccountInfo(publicKey) {
    return {
      executable: false,
      owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      lamports: 2000000000, // 2 SOL
      data: Buffer.from([]),
      rentEpoch: 361
    };
  }

  async getBalance(publicKey) {
    return 2000000000; // 2 SOL
  }

  async getTokenAccountsByOwner(owner, filter) {
    return {
      value: [
        {
          pubkey: 'TokenAccount1',
          account: {
            data: Buffer.from([]),
            executable: false,
            lamports: 2039280,
            owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
          }
        }
      ]
    };
  }

  async sendTransaction(transaction, signers) {
    return Math.random().toString(36).substring(2, 15);
  }

  async confirmTransaction(signature) {
    return { value: { err: null } };
  }

  async getRecentBlockhash() {
    return {
      blockhash: Math.random().toString(36).substring(2, 15),
      feeCalculator: { lamportsPerSignature: 5000 }
    };
  }
}

/**
 * Mock blockchain network configurations
 */
const mockNetworks = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://mainnet.infura.io/v3/mock',
    blockExplorer: 'https://etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  polygon: {
    chainId: 137,
    name: 'Polygon Mainnet',
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorer: 'https://polygonscan.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }
  },
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    blockExplorer: 'https://arbiscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  optimism: {
    chainId: 10,
    name: 'Optimism',
    rpcUrl: 'https://mainnet.optimism.io',
    blockExplorer: 'https://optimistic.etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  solana: {
    chainId: 101,
    name: 'Solana Mainnet',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    blockExplorer: 'https://explorer.solana.com',
    nativeCurrency: { name: 'SOL', symbol: 'SOL', decimals: 9 }
  }
};

/**
 * Mock contract ABIs
 */
const mockABIs = {
  ERC20: [
    {
      "type": "function",
      "name": "balanceOf",
      "inputs": [{"name": "account", "type": "address"}],
      "outputs": [{"name": "", "type": "uint256"}]
    },
    {
      "type": "function",
      "name": "transfer",
      "inputs": [{"name": "to", "type": "address"}, {"name": "amount", "type": "uint256"}],
      "outputs": [{"name": "", "type": "bool"}]
    },
    {
      "type": "function",
      "name": "totalSupply",
      "inputs": [],
      "outputs": [{"name": "", "type": "uint256"}]
    },
    {
      "type": "function",
      "name": "name",
      "inputs": [],
      "outputs": [{"name": "", "type": "string"}]
    },
    {
      "type": "function",
      "name": "symbol",
      "inputs": [],
      "outputs": [{"name": "", "type": "string"}]
    },
    {
      "type": "function",
      "name": "decimals",
      "inputs": [],
      "outputs": [{"name": "", "type": "uint8"}]
    }
  ],
  UniswapV2Pair: [
    {
      "type": "function",
      "name": "getReserves",
      "inputs": [],
      "outputs": [
        {"name": "reserve0", "type": "uint112"},
        {"name": "reserve1", "type": "uint112"},
        {"name": "blockTimestampLast", "type": "uint32"}
      ]
    },
    {
      "type": "function",
      "name": "swap",
      "inputs": [
        {"name": "amount0Out", "type": "uint256"},
        {"name": "amount1Out", "type": "uint256"},
        {"name": "to", "type": "address"},
        {"name": "data", "type": "bytes"}
      ],
      "outputs": []
    }
  ]
};

/**
 * Setup global mocks for blockchain dependencies
 */
function setupBlockchainMocks() {
  // Mock global window object for browser wallet detection
  if (typeof global !== 'undefined') {
    global.window = global.window || {};
    global.window.ethereum = new MockMetaMaskProvider();
    global.window.solana = new MockPhantomProvider();
  }

  // Mock ethers.js
  jest.mock('ethers', () => ({
    ethers: {
      providers: {
        JsonRpcProvider: jest.fn().mockImplementation((url) => new MockEthersProvider()),
        Web3Provider: jest.fn().mockImplementation((provider) => new MockEthersProvider())
      },
      Contract: jest.fn().mockImplementation((address, abi, provider) => new MockContract(address, abi, provider)),
      utils: {
        parseEther: (value) => (parseFloat(value) * 1e18).toString(),
        formatEther: (value) => (parseFloat(value) / 1e18).toString(),
        isAddress: (address) => /^0x[a-fA-F0-9]{40}$/.test(address)
      }
    }
  }));

  // Mock web3.js
  jest.mock('web3', () => {
    return jest.fn().mockImplementation((provider) => new MockWeb3(provider));
  });

  // Mock @solana/web3.js
  jest.mock('@solana/web3.js', () => ({
    Connection: jest.fn().mockImplementation((endpoint) => new MockSolanaConnection(endpoint)),
    PublicKey: jest.fn().mockImplementation((key) => ({ toString: () => key })),
    Transaction: jest.fn().mockImplementation(() => ({})),
    SystemProgram: {
      transfer: jest.fn().mockReturnValue({})
    }
  }));

  // Mock axios for HTTP requests
  jest.mock('axios', () => ({
    get: jest.fn().mockResolvedValue({ data: { result: 'mocked' } }),
    post: jest.fn().mockResolvedValue({ data: { result: 'mocked' } })
  }));
}

/**
 * Create mock wallet instances
 */
function createMockWallets() {
  return {
    metamask: new MockMetaMaskProvider(),
    phantom: new MockPhantomProvider(),
    web3Provider: new MockWeb3Provider(),
    ethersProvider: new MockEthersProvider(),
    solanaConnection: new MockSolanaConnection('https://api.mainnet-beta.solana.com')
  };
}

/**
 * Generate mock transaction data
 */
function generateMockTransaction(type = 'ethereum') {
  if (type === 'solana') {
    return {
      signature: Math.random().toString(36).substring(2, 15),
      slot: Math.floor(Math.random() * 1000000),
      blockTime: Date.now(),
      meta: { err: null, fee: 5000 }
    };
  }

  return {
    hash: '0x' + Math.random().toString(16).substring(2, 66),
    blockNumber: Math.floor(Math.random() * 1000000),
    from: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5A',
    to: '0x8ba1f109551bD432803012645Hac136c5C1515A',
    value: '1000000000000000000',
    gasLimit: '21000',
    gasPrice: '20000000000',
    gasUsed: '21000',
    status: 1
  };
}

module.exports = {
  MockWeb3Provider,
  MockPhantomProvider,
  MockMetaMaskProvider,
  MockEthersProvider,
  MockContract,
  MockWeb3,
  MockSolanaConnection,
  mockNetworks,
  mockABIs,
  setupBlockchainMocks,
  createMockWallets,
  generateMockTransaction
};
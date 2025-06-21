// Mock for multiChainWeb3Service
module.exports = {
  verifyContract: jest.fn().mockResolvedValue({
    isVerified: true,
    sourceCode: 'contract MockContract { }',
    contractName: 'MockContract',
    compilerVersion: '0.8.19',
    abi: []
  }),
  
  getSupportedChains: jest.fn().mockReturnValue({
    ethereum: { name: 'Ethereum', chainId: 1, type: 'evm', ecosystem: 'ethereum' },
    polygon: { name: 'Polygon', chainId: 137, type: 'evm', ecosystem: 'ethereum' },
    arbitrum: { name: 'Arbitrum', chainId: 42161, type: 'layer2', ecosystem: 'ethereum' }
  }),
  
  getContract: jest.fn().mockResolvedValue({
    address: '0x1234567890123456789012345678901234567890',
    name: 'MockContract',
    abi: [],
    bytecode: '0x608060405234801561001057600080fd5b50...'
  }),

  getContractFromAddress: jest.fn().mockResolvedValue({
    address: '0x1234567890123456789012345678901234567890',
    chain: 'ethereum',
    chainId: 1,
    chainType: 'evm',
    ecosystem: 'ethereum',
    bytecode: '0x608060405234801561001057600080fd5b50',
    balance: '0.0',
    sourceCode: {
      sourceCode: 'contract MockContract { }',
      contractName: 'MockContract',
      compilerVersion: '0.8.19'
    },
    crossChainAnalysis: {
      deployedChains: [],
      potentialBridge: false,
      crossChainRisks: [],
      ecosystems: ['ethereum']
    },
    transactionCount: 100,
    recentActivity: {
      transactions: [],
      lastActivity: new Date().toISOString()
    },
    fetchedAt: new Date().toISOString()
  }),

  monitorEvents: jest.fn().mockResolvedValue([
    {
      address: '0x1234567890123456789012345678901234567890',
      topics: ['0x' + 'a'.repeat(64)],
      data: '0x' + 'b'.repeat(128),
      blockNumber: 18500000,
      transactionHash: '0x' + 'c'.repeat(64)
    }
  ]),

  providers: {
    ethereum: {
      getTransaction: jest.fn().mockResolvedValue({
        hash: '0x' + 'c'.repeat(64),
        to: '0x1234567890123456789012345678901234567890',
        from: '0x' + 'd'.repeat(40),
        value: '1000000000000000000',
        gasLimit: '21000',
        gasPrice: '20000000000'
      })
    }
  }
};
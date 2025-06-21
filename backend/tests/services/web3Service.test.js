// Using Jest's built-in expect instead of chai
const sinon = require('sinon');
const { ethers } = require('ethers');
const axios = require('axios');
const web3Service = require('../../src/services/web3Service');
const logger = require('../../src/utils/logger');
const { mockContracts, testUtils } = require('../setup');

describe('Web3Service', () => {
  let loggerStub;
  let providerStub;
  let originalProviders;

  beforeEach(() => {
    // Stub logger to prevent console output during tests
    loggerStub = sinon.stub(logger, 'error');
    loggerStub = sinon.stub(logger, 'info');
    loggerStub = sinon.stub(logger, 'warn');

    // Store original providers
    originalProviders = web3Service.providers;

    // Create mock provider
    providerStub = {
      getCode: sinon.stub(),
      getBalance: sinon.stub(),
      getTransactionCount: sinon.stub(),
      getBlockNumber: sinon.stub(),
      getTransaction: sinon.stub(),
      getTransactionReceipt: sinon.stub(),
      getBlock: sinon.stub(),
      getNetwork: sinon.stub()
    };

    // Replace providers with mock
    web3Service.providers = {
      ethereum: providerStub,
      polygon: providerStub,
      aptos: providerStub,
      solana: providerStub,
      sui: providerStub,
      sepolia: providerStub,
      mumbai: providerStub
    };
  });

  afterEach(() => {
    sinon.restore();
    // Restore original providers
    web3Service.providers = originalProviders;
  });

  describe('Initialization', () => {
    it('should initialize with supported chains', () => {
      expect(web3Service.supportedChains).toBeInstanceOf(Object);
      expect(web3Service.supportedChains).toHaveProperty('ethereum');
      expect(web3Service.supportedChains).toHaveProperty('polygon');
      expect(web3Service.supportedChains).toHaveProperty('aptos');
      expect(web3Service.supportedChains).toHaveProperty('solana');
      expect(web3Service.supportedChains).toHaveProperty('sui');
    });

    it('should have providers for all supported chains', () => {
      expect(web3Service.providers).toBeInstanceOf(Object);
      Object.keys(web3Service.supportedChains).forEach(chain => {
        expect(web3Service.providers).toHaveProperty(chain);
      });
    });
  });

  describe('fetchContractFromAddress', () => {
    const testAddress = testUtils.randomAddress();
    const testBytecode = '0x608060405234801561001057600080fd5b50';
    const testBalance = ethers.parseEther('1.5');

    beforeEach(() => {
      providerStub.getCode.resolves(testBytecode);
      providerStub.getBalance.resolves(testBalance);
      providerStub.getTransactionCount.resolves(42);
      providerStub.getNetwork.resolves({ chainId: 1, name: 'homestead' });
    });

    it('should fetch contract successfully from Ethereum', async () => {
      const result = await web3Service.fetchContractFromAddress(testAddress, 'ethereum');

      expect(result).toBeInstanceOf(Object);
      expect(result.address).toBe(testAddress);
      expect(result.chain).toBe('ethereum');
      expect(result.chainId).toBe(1);
      expect(result.bytecode).toBe(testBytecode);
      expect(result.fetchedAt).toEqual(expect.any(String));
    });

    it('should fetch contract from different chains', async () => {
      const chains = ['ethereum', 'polygon', 'aptos'];

      for (const chain of chains) {
        const result = await web3Service.fetchContractFromAddress(testAddress, chain);
        expect(result.chain).toBe(chain);
        expect(result.chainId).toBe(web3Service.supportedChains[chain].chainId);
      }
    });

    it('should handle invalid contract address', async () => {
      providerStub.getCode.rejects(new Error('Invalid address'));

      try {
        await web3Service.fetchContractFromAddress('invalid-address', 'ethereum');
        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Invalid address');
      }
    });

    it('should handle unsupported chain', async () => {
      try {
        await web3Service.fetchContractFromAddress(testAddress, 'unsupported-chain');
        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Unsupported chain');
      }
    });

    it('should handle empty bytecode (EOA)', async () => {
      providerStub.getCode.resolves('0x');

      try {
        await web3Service.fetchContractFromAddress(testAddress, 'ethereum');
        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('No contract found');
      }
    });
  });

  describe('getContractDetails', () => {
    const testAddress = testUtils.randomAddress();

    beforeEach(() => {
      providerStub.getBalance.resolves(ethers.parseEther('2.5'));
      providerStub.getTransactionCount.resolves(100);
      providerStub.getBlockNumber.resolves(12345);
      providerStub.getNetwork.resolves({ chainId: 1, name: 'homestead' });
    });

    it('should get contract details successfully', async () => {
      const result = await web3Service.getContractDetails(testAddress, providerStub, 'ethereum');

      expect(result).toBeInstanceOf(Object);
      expect(result.balance).toEqual(expect.any(String));
      expect(result.transactionCount).toBe(100);
      expect(result.network).toBeInstanceOf(Object);
      expect(result.network.chainId).toBe(1);
    });

    it('should handle provider errors gracefully', async () => {
      providerStub.getBalance.rejects(new Error('Provider error'));

      const result = await web3Service.getContractDetails(testAddress, providerStub, 'ethereum');

      expect(result).toBeInstanceOf(Object);
      expect(result.balance).toBe('0');
      expect(result.transactionCount).toBe(0);
    });
  });

  describe('getTransaction', () => {
    const testTxHash = testUtils.randomHash();

    beforeEach(() => {
      providerStub.getTransaction.resolves({
        hash: testTxHash,
        from: testUtils.randomAddress(),
        to: testUtils.randomAddress(),
        value: ethers.parseEther('1.0'),
        gasLimit: 21000,
        gasPrice: ethers.parseUnits('20', 'gwei')
      });

      providerStub.getTransactionReceipt.resolves({
        transactionHash: testTxHash,
        status: 1,
        gasUsed: 21000,
        blockNumber: 12345
      });
    });

    it('should get transaction details successfully', async () => {
      const result = await web3Service.getTransaction(testTxHash, 'ethereum');

      expect(result).toBeInstanceOf(Object);
      expect(result.transaction).toBeInstanceOf(Object);
      expect(result.receipt).toBeInstanceOf(Object);
      expect(result.chain).toBe('ethereum');
      expect(result.fetchedAt).toEqual(expect.any(String));
    });

    it('should handle transaction not found', async () => {
      providerStub.getTransaction.resolves(null);

      try {
        await web3Service.getTransaction('invalid-hash', 'ethereum');
        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Failed to fetch transaction');
      }
    });
  });

  describe('getBlock', () => {
    const testBlockNumber = 12345;

    beforeEach(() => {
      providerStub.getBlock.resolves({
        number: testBlockNumber,
        hash: testUtils.randomHash(),
        timestamp: Math.floor(Date.now() / 1000),
        transactions: [testUtils.randomHash(), testUtils.randomHash()]
      });
    });

    it('should get block information successfully', async () => {
      const result = await web3Service.getBlock(testBlockNumber, 'ethereum');

      expect(result).toBeInstanceOf(Object);
      expect(result.block).toBeInstanceOf(Object);
      expect(result.block.number).toBe(testBlockNumber);
      expect(result.chain).toBe('ethereum');
      expect(result.fetchedAt).toEqual(expect.any(String));
    });

    it('should get latest block', async () => {
      const result = await web3Service.getBlock('latest', 'ethereum');

      expect(result).toBeInstanceOf(Object);
      expect(result.block).toBeInstanceOf(Object);
      expect(result.chain).toBe('ethereum');
    });

    it('should handle block not found', async () => {
      providerStub.getBlock.rejects(new Error('Block not found'));

      try {
        await web3Service.getBlock(999999999, 'ethereum');
        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Failed to fetch block');
      }
    });
  });

  describe('getSupportedChains', () => {
    it('should return list of supported chains', () => {
      const chains = web3Service.getSupportedChains();
      
      expect(chains).toBeInstanceOf(Array);
      expect(chains).toContain('ethereum');
      expect(chains).toContain('polygon');
      expect(chains).toContain('aptos');
      expect(chains).toContain('solana');
      expect(chains).toContain('sui');
    });
  });

  describe('isValidAddress', () => {
    it('should validate correct Ethereum addresses', () => {
      const validAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4Db45';
      expect(web3Service.isValidAddress(validAddress)).toBe(true);
    });

    it('should reject invalid addresses', () => {
      expect(web3Service.isValidAddress('invalid')).toBe(false);
      expect(web3Service.isValidAddress('0x123')).toBe(false);
      expect(web3Service.isValidAddress('')).toBe(false);
      expect(web3Service.isValidAddress(null)).toBe(false);
    });
  });

  describe('getContractSourceCode', () => {
    const testAddress = testUtils.randomAddress();
    let axiosStub;

    beforeEach(() => {
      axiosStub = sinon.stub(axios, 'get');
    });

    afterEach(() => {
      axiosStub.restore();
    });

    it('should fetch source code from Etherscan', async () => {
      const mockResponse = {
        data: {
          status: '1',
          result: [{
            SourceCode: mockContracts.simple,
            ContractName: 'SimpleContract',
            CompilerVersion: 'v0.8.0+commit.c7dfd78e',
            OptimizationUsed: '1',
            Runs: '200',
            ConstructorArguments: '',
            EVMVersion: 'Default',
            Library: '',
            LicenseType: 'MIT',
            Proxy: '0',
            Implementation: '',
            SwarmSource: ''
          }]
        }
      };

      axiosStub.resolves(mockResponse);

      const result = await web3Service.getContractSourceCode(testAddress, 'ethereum');

      expect(result).toBeInstanceOf(Object);
      expect(result.sourceCode).toBe(mockContracts.simple);
      expect(result.contractName).toBe('SimpleContract');
      expect(result.compilerVersion).toBe('v0.8.0+commit.c7dfd78e');
    });

    it('should handle unverified contracts', async () => {
      const mockResponse = {
        data: {
          status: '0',
          result: []
        }
      };

      axiosStub.resolves(mockResponse);

      const result = await web3Service.getContractSourceCode(testAddress, 'ethereum');
      expect(result).toBeNull();
    });

    it('should handle API errors', async () => {
      axiosStub.rejects(new Error('API Error'));

      try {
        await web3Service.getContractSourceCode(testAddress, 'ethereum');
        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Failed to fetch contract source');
      }
    });

    it('should handle timeout errors', async () => {
      axiosStub.rejects(new Error('timeout of 10000ms exceeded'));

      try {
        await web3Service.getContractSourceCode(testAddress, 'ethereum');
        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Failed to fetch contract source');
      }
    });
  });

  describe('Performance and Caching', () => {
    it('should handle concurrent requests efficiently', async () => {
      const addresses = Array.from({ length: 5 }, () => testUtils.randomAddress());

      providerStub.getCode.resolves('0x608060405234801561001057600080fd5b50');
      providerStub.getBalance.resolves(ethers.parseEther('1.0'));
      providerStub.getTransactionCount.resolves(10);
      providerStub.getNetwork.resolves({ chainId: 1, name: 'homestead' });

      const promises = addresses.map(address =>
        web3Service.fetchContractFromAddress(address, 'ethereum')
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toHaveProperty('address');
        expect(result).toHaveProperty('bytecode');
      });
    });

    it('should handle large bytecode efficiently', async () => {
      const largeBytecode = '0x' + 'a'.repeat(50000); // Large contract bytecode

      providerStub.getCode.resolves(largeBytecode);
      providerStub.getBalance.resolves(ethers.parseEther('1.0'));
      providerStub.getTransactionCount.resolves(10);
      providerStub.getNetwork.resolves({ chainId: 1, name: 'homestead' });

      const result = await web3Service.fetchContractFromAddress(testUtils.randomAddress(), 'ethereum');

      expect(result.bytecode).toBe(largeBytecode);
      expect(result.bytecode.length).toBeGreaterThan(50000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero balance contracts', async () => {
      providerStub.getCode.resolves('0x608060405234801561001057600080fd5b50');
      providerStub.getBalance.resolves(0n);
      providerStub.getTransactionCount.resolves(0);
      providerStub.getNetwork.resolves({ chainId: 1, name: 'homestead' });

      const result = await web3Service.fetchContractFromAddress(testUtils.randomAddress(), 'ethereum');

      expect(result.balance).toBe('0');
      expect(result.transactionCount).toBe(0);
    });

    it('should handle contracts with many transactions', async () => {
      providerStub.getCode.resolves('0x608060405234801561001057600080fd5b50');
      providerStub.getBalance.resolves(ethers.parseEther('1.0'));
      providerStub.getTransactionCount.resolves(1000000);
      providerStub.getNetwork.resolves({ chainId: 1, name: 'homestead' });

      const result = await web3Service.fetchContractFromAddress(testUtils.randomAddress(), 'ethereum');

      expect(result.transactionCount).toBe(1000000);
    });

    it('should handle very old blocks', async () => {
      providerStub.getBlock.resolves({
        number: 1,
        hash: testUtils.randomHash(),
        timestamp: 1438269973, // Genesis block timestamp
        transactions: []
      });

      const result = await web3Service.getBlock(1, 'ethereum');

      expect(result.block.number).toBe(1);
      expect(result.block.timestamp).toBe(1438269973);
    });
  });

  describe('Error Handling', () => {
    it('should handle network connectivity issues', async () => {
      providerStub.getCode.rejects(new Error('Network error'));

      try {
        await web3Service.fetchContractFromAddress(testUtils.randomAddress(), 'ethereum');
        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Network error');
      }
    });

    it('should handle rate limiting', async () => {
      providerStub.getCode.rejects(new Error('Rate limit exceeded'));

      try {
        await web3Service.fetchContractFromAddress(testUtils.randomAddress(), 'ethereum');
        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Rate limit exceeded');
      }
    });

    it('should handle malformed responses', async () => {
      providerStub.getCode.resolves('invalid-bytecode');

      try {
        await web3Service.fetchContractFromAddress(testUtils.randomAddress(), 'ethereum');
        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('No contract found');
      }
    });

    it('should handle provider disconnection', async () => {
      providerStub.getCode.rejects(new Error('Provider disconnected'));

      try {
        await web3Service.fetchContractFromAddress(testUtils.randomAddress(), 'ethereum');
        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Provider disconnected');
      }
    });
  });
});

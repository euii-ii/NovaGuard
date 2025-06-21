// Using Jest's built-in expect instead of chai
const sinon = require('sinon');
const realTimeMonitoringService = require('../../src/services/realTimeMonitoringService');
const multiChainWeb3Service = require('../../src/services/multiChainWeb3Service');
const llmService = require('../../src/services/llmService');
const { setupTestEnvironment, cleanupTestEnvironment, testUtils } = require('../setup');

describe('Real-Time Monitoring Service', () => {
  let web3Stub;
  let llmStub;

  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
  });

  beforeEach(() => {
    web3Stub = sinon.stub(multiChainWeb3Service, 'monitorEvents');
    llmStub = sinon.stub(llmService, 'analyzeSecurityVulnerabilities');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Service Initialization', () => {
    it('should initialize with default configuration', async () => {
      await realTimeMonitoringService.initialize();
      
      const status = realTimeMonitoringService.getStatus();
      
      expect(status).toHaveProperty('activeMonitors');
      expect(status).toHaveProperty('totalContracts');
      expect(status).toHaveProperty('alertsGenerated');
      expect(status).toHaveProperty('isMonitoring');
    });

    it('should initialize with custom configuration', async () => {
      const config = {
        monitoringInterval: 5000,
        enableRealTimeAlerts: true,
        enableAnomalyDetection: true,
        maxConcurrentMonitors: 50
      };

      await realTimeMonitoringService.initialize(config);
      
      const status = realTimeMonitoringService.getStatus();
      expect(status).toHaveProperty('configuration');
    });
  });

  describe('Contract Monitoring', () => {
    beforeEach(async () => {
      await realTimeMonitoringService.initialize();
    });

    it('should start monitoring a contract', async () => {
      const contractAddress = testUtils.randomAddress();
      const monitorConfig = {
        chain: 'ethereum',
        events: ['Transfer', 'Approval'],
        alertThresholds: {
          transactionVolume: 1000,
          gasUsage: 500000
        }
      };

      web3Stub.resolves([]);

      const result = await realTimeMonitoringService.startMonitoring(contractAddress, monitorConfig);

      expect(result).toBeInstanceOf(Object);
      expect(result).toHaveProperty('contractAddress', contractAddress);
      expect(result).toHaveProperty('status', 'active');
    });

    it('should stop monitoring a contract', async () => {
      const contractAddress = testUtils.randomAddress();
      
      web3Stub.resolves([]);
      
      const monitor = await realTimeMonitoringService.startMonitoring(contractAddress, {
        chain: 'ethereum',
        events: ['Transfer']
      });

      const result = await realTimeMonitoringService.stopMonitoring(monitor.monitorId);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('monitorId', monitor.monitorId);
    });

    it('should detect suspicious transactions', async () => {
      const contractAddress = testUtils.randomAddress();
      
      const suspiciousEvents = [
        {
          address: contractAddress,
          topics: ['0x' + 'a'.repeat(64)],
          data: '0x' + 'b'.repeat(128),
          blockNumber: 18500000,
          transactionHash: testUtils.randomHash(),
          gasUsed: 1000000, // High gas usage
          value: '1000000000000000000000' // Large value
        }
      ];

      web3Stub.resolves(suspiciousEvents);

      await realTimeMonitoringService.startMonitoring(contractAddress, {
        chain: 'ethereum',
        events: ['Transfer'],
        alertThresholds: {
          gasUsage: 500000,
          value: '100000000000000000000'
        }
      });

      // Wait for monitoring cycle
      await testUtils.wait(100);

      const alerts = realTimeMonitoringService.getActiveAlerts();
      expect(alerts).toBeInstanceOf(Array);
    });
  });

  describe('Anomaly Detection', () => {
    beforeEach(async () => {
      await realTimeMonitoringService.initialize({
        enableAnomalyDetection: true
      });
    });

    it('should detect unusual transaction patterns', async () => {
      const contractAddress = testUtils.randomAddress();
      
      const unusualEvents = Array.from({ length: 100 }, (_, i) => ({
        address: contractAddress,
        topics: ['0x' + 'a'.repeat(64)],
        blockNumber: 18500000 + i,
        transactionHash: testUtils.randomHash(),
        timestamp: Date.now() - (i * 1000)
      }));

      web3Stub.resolves(unusualEvents);

      const anomalies = await realTimeMonitoringService.detectAnomalies(contractAddress, 'ethereum');

      expect(anomalies).toBeInstanceOf(Object);
      expect(anomalies).toHaveProperty('detected');
      expect(anomalies).toHaveProperty('patterns');
    });

    it('should detect MEV attacks', async () => {
      const contractAddress = testUtils.randomAddress();
      
      const mevPattern = [
        {
          address: contractAddress,
          topics: ['0x' + 'a'.repeat(64)],
          blockNumber: 18500000,
          transactionIndex: 0,
          gasPrice: '100000000000', // High gas price
          from: testUtils.randomAddress()
        },
        {
          address: contractAddress,
          topics: ['0x' + 'a'.repeat(64)],
          blockNumber: 18500000,
          transactionIndex: 1,
          gasPrice: '99999999999', // Slightly lower gas price
          from: testUtils.randomAddress()
        }
      ];

      web3Stub.resolves(mevPattern);

      const mevDetection = await realTimeMonitoringService.detectMEVActivity(contractAddress, 'ethereum');

      expect(mevDetection).toHaveProperty('detected');
      expect(mevDetection).toHaveProperty('confidence');
      expect(mevDetection).toHaveProperty('patterns');
    });
  });

  describe('Alert Management', () => {
    beforeEach(async () => {
      await realTimeMonitoringService.initialize();
    });

    it('should generate security alerts', async () => {
      const alertData = {
        contractAddress: testUtils.randomAddress(),
        chain: 'ethereum',
        severity: 'high',
        type: 'suspicious_transaction',
        description: 'Large value transfer detected',
        transactionHash: testUtils.randomHash(),
        blockNumber: 18500000
      };

      const alert = await realTimeMonitoringService.generateAlert(alertData);

      expect(alert).toHaveProperty('alertId');
      expect(alert).toHaveProperty('severity', 'high');
      expect(alert).toHaveProperty('timestamp');
      expect(alert).toHaveProperty('status', 'active');
    });

    it('should acknowledge alerts', async () => {
      const alertData = {
        contractAddress: testUtils.randomAddress(),
        severity: 'medium',
        type: 'anomaly_detected'
      };

      const alert = await realTimeMonitoringService.generateAlert(alertData);
      const result = await realTimeMonitoringService.acknowledgeAlert(alert.alertId, 'user-123');

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('acknowledgedBy', 'user-123');
    });

    it('should resolve alerts', async () => {
      const alertData = {
        contractAddress: testUtils.randomAddress(),
        severity: 'low',
        type: 'gas_optimization'
      };

      const alert = await realTimeMonitoringService.generateAlert(alertData);
      const result = await realTimeMonitoringService.resolveAlert(alert.alertId, 'False positive');

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('resolution', 'False positive');
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(async () => {
      await realTimeMonitoringService.initialize();
    });

    it('should track gas usage patterns', async () => {
      const contractAddress = testUtils.randomAddress();
      
      const gasData = Array.from({ length: 10 }, (_, i) => ({
        transactionHash: testUtils.randomHash(),
        gasUsed: 21000 + (i * 1000),
        gasPrice: '20000000000',
        blockNumber: 18500000 + i
      }));

      const analysis = await realTimeMonitoringService.analyzeGasUsage(contractAddress, gasData);

      expect(analysis).toHaveProperty('averageGasUsed');
      expect(analysis).toHaveProperty('gasEfficiency');
      expect(analysis).toHaveProperty('recommendations');
    });

    it('should monitor contract state changes', async () => {
      const contractAddress = testUtils.randomAddress();
      
      web3Stub.resolves([
        {
          address: contractAddress,
          topics: ['0x' + 'a'.repeat(64)],
          data: '0x' + 'b'.repeat(128),
          blockNumber: 18500000
        }
      ]);

      const stateChanges = await realTimeMonitoringService.monitorStateChanges(contractAddress, 'ethereum');

      expect(stateChanges).toBeInstanceOf(Array);
      if (stateChanges.length > 0) {
        expect(stateChanges[0]).toHaveProperty('blockNumber');
        expect(stateChanges[0]).toHaveProperty('changes');
      }
    });
  });

  describe('Cross-Chain Monitoring', () => {
    beforeEach(async () => {
      await realTimeMonitoringService.initialize();
    });

    it('should monitor contracts across multiple chains', async () => {
      const contractAddress = testUtils.randomAddress();
      const chains = ['ethereum', 'polygon', 'arbitrum'];

      web3Stub.resolves([]);

      const monitors = await Promise.all(
        chains.map(chain => 
          realTimeMonitoringService.startMonitoring(contractAddress, {
            chain,
            events: ['Transfer']
          })
        )
      );

      expect(monitors).toHaveLength(3);
      monitors.forEach(monitor => {
        expect(monitor).toBeInstanceOf(Object);
        expect(monitor).toHaveProperty('status', 'active');
      });
    });

    it('should detect cross-chain arbitrage opportunities', async () => {
      const tokenAddress = testUtils.randomAddress();
      
      const priceData = {
        ethereum: { price: '2000.00', liquidity: '1000000' },
        polygon: { price: '1995.00', liquidity: '500000' },
        arbitrum: { price: '2005.00', liquidity: '750000' }
      };

      const arbitrage = await realTimeMonitoringService.detectArbitrageOpportunities(tokenAddress, priceData);

      expect(arbitrage).toHaveProperty('opportunities');
      expect(arbitrage.opportunities).toBeInstanceOf(Array);
    });
  });
});

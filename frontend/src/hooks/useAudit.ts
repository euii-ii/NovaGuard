import { useState, useCallback } from 'react';
import { apiService } from '../services/api';
import type { AuditResult, ContractAuditRequest, AddressAuditRequest } from '../services/api';

export interface AuditState {
  isLoading: boolean;
  result: AuditResult | null;
  error: string | null;
  progress: number;
}

export interface UseAuditReturn {
  auditState: AuditState;
  auditContract: (request: ContractAuditRequest) => Promise<void>;
  auditContractByAddress: (request: AddressAuditRequest) => Promise<void>;
  multiAgentAnalysis: (contractCode: string, agents?: string[]) => Promise<void>;
  defiEconomicAnalysis: (contractCode: string, protocolType?: string) => Promise<void>;
  startContractMonitoring: (contractAddress: string, chain?: string) => Promise<void>;
  getAuditResults: (auditId: string) => Promise<void>;
  generateReport: (auditId: string, format?: string) => Promise<any>;
  clearAudit: () => void;
  resetError: () => void;
}

export const useAudit = (): UseAuditReturn => {
  const [auditState, setAuditState] = useState<AuditState>({
    isLoading: false,
    result: null,
    error: null,
    progress: 0,
  });

  // Simulate progress updates during audit
  const simulateProgress = useCallback(() => {
    const progressSteps = [10, 25, 40, 60, 80, 95];
    let currentStep = 0;

    const updateProgress = () => {
      if (currentStep < progressSteps.length) {
        setAuditState(prev => ({
          ...prev,
          progress: progressSteps[currentStep],
        }));
        currentStep++;
        setTimeout(updateProgress, 500);
      }
    };

    updateProgress();
  }, []);

  // Audit contract by source code
  const auditContract = useCallback(async (request: ContractAuditRequest) => {
    try {
      setAuditState({
        isLoading: true,
        result: null,
        error: null,
        progress: 0,
      });

      // Start progress simulation
      simulateProgress();

      const result = await apiService.auditContract(request);

      setAuditState({
        isLoading: false,
        result,
        error: null,
        progress: 100,
      });
    } catch (error) {
      setAuditState({
        isLoading: false,
        result: null,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        progress: 0,
      });
    }
  }, [simulateProgress]);

  // Audit contract by address
  const auditContractByAddress = useCallback(async (request: AddressAuditRequest) => {
    try {
      setAuditState({
        isLoading: true,
        result: null,
        error: null,
        progress: 0,
      });

      // Start progress simulation
      simulateProgress();

      const result = await apiService.auditContractByAddress(request);

      setAuditState({
        isLoading: false,
        result,
        error: null,
        progress: 100,
      });
    } catch (error) {
      setAuditState({
        isLoading: false,
        result: null,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        progress: 0,
      });
    }
  }, [simulateProgress]);

  // Clear audit results
  const clearAudit = useCallback(() => {
    setAuditState({
      isLoading: false,
      result: null,
      error: null,
      progress: 0,
    });
  }, []);

  // Reset error state
  const resetError = useCallback(() => {
    setAuditState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  // Multi-agent AI analysis
  const multiAgentAnalysis = useCallback(async (contractCode: string, agents: string[] = ['security', 'quality']) => {
    try {
      setAuditState({
        isLoading: true,
        result: null,
        error: null,
        progress: 0,
      });

      simulateProgress();

      const result = await apiService.multiAgentAnalysis(contractCode, agents);

      setAuditState({
        isLoading: false,
        result,
        error: null,
        progress: 100,
      });
    } catch (error) {
      setAuditState({
        isLoading: false,
        result: null,
        error: error instanceof Error ? error.message : 'Multi-agent analysis failed',
        progress: 0,
      });
    }
  }, [simulateProgress]);

  // DeFi economic analysis
  const defiEconomicAnalysis = useCallback(async (contractCode: string, protocolType?: string) => {
    try {
      setAuditState({
        isLoading: true,
        result: null,
        error: null,
        progress: 0,
      });

      simulateProgress();

      const result = await apiService.defiEconomicAnalysis(contractCode, protocolType);

      setAuditState({
        isLoading: false,
        result,
        error: null,
        progress: 100,
      });
    } catch (error) {
      setAuditState({
        isLoading: false,
        result: null,
        error: error instanceof Error ? error.message : 'DeFi analysis failed',
        progress: 0,
      });
    }
  }, [simulateProgress]);

  // Start contract monitoring
  const startContractMonitoring = useCallback(async (contractAddress: string, chain: string = 'ethereum') => {
    try {
      setAuditState({
        isLoading: true,
        result: null,
        error: null,
        progress: 0,
      });

      const result = await apiService.startContractMonitoring(contractAddress, chain);

      setAuditState({
        isLoading: false,
        result,
        error: null,
        progress: 100,
      });
    } catch (error) {
      setAuditState({
        isLoading: false,
        result: null,
        error: error instanceof Error ? error.message : 'Failed to start monitoring',
        progress: 0,
      });
    }
  }, []);

  // Get audit results by ID
  const getAuditResults = useCallback(async (auditId: string) => {
    try {
      setAuditState({
        isLoading: true,
        result: null,
        error: null,
        progress: 0,
      });

      const result = await apiService.getAuditResults(auditId);

      setAuditState({
        isLoading: false,
        result,
        error: null,
        progress: 100,
      });
    } catch (error) {
      setAuditState({
        isLoading: false,
        result: null,
        error: error instanceof Error ? error.message : 'Failed to get audit results',
        progress: 0,
      });
    }
  }, []);

  // Generate audit report
  const generateReport = useCallback(async (auditId: string, format: string = 'json') => {
    try {
      const report = await apiService.generateAuditReport(auditId, format);
      return report;
    } catch (error) {
      setAuditState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to generate report',
      }));
      throw error;
    }
  }, []);

  return {
    auditState,
    auditContract,
    auditContractByAddress,
    multiAgentAnalysis,
    defiEconomicAnalysis,
    startContractMonitoring,
    getAuditResults,
    generateReport,
    clearAudit,
    resetError,
  };
};

export default useAudit;

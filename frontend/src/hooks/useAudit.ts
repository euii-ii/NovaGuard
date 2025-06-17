import { useState, useCallback } from 'react';
import { apiService, AuditResult, ContractAuditRequest, AddressAuditRequest } from '../services/api';

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

  return {
    auditState,
    auditContract,
    auditContractByAddress,
    clearAudit,
    resetError,
  };
};

export default useAudit;

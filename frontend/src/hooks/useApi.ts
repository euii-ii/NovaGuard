import { useState, useEffect, useCallback } from 'react';
import { apiService, type AuditRequest, type AuditResponse, type HealthResponse } from '../services/apiService';

// Hook for managing API connection status
export const useApiConnection = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);

  const checkConnection = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiService.testConnection();
      setIsConnected(result.connected);
      
      if (result.connected) {
        const health = await apiService.checkHealth();
        setHealthData(health);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setIsConnected(false);
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();
    
    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, [checkConnection]);

  return {
    isConnected,
    isLoading,
    error,
    healthData,
    checkConnection,
  };
};

// Hook for managing audit submissions
export const useAudit = () => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentAudit, setCurrentAudit] = useState<AuditResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitAudit = useCallback(async (auditRequest: AuditRequest) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const result = await apiService.submitAudit(auditRequest);
      setCurrentAudit(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Audit submission failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const checkAuditStatus = useCallback(async (auditId: string) => {
    try {
      const result = await apiService.getAuditStatus(auditId);
      setCurrentAudit(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check audit status';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const getAuditResult = useCallback(async (auditId: string) => {
    try {
      const result = await apiService.getAuditResult(auditId);
      setCurrentAudit(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get audit result';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const performMultiAgentAnalysis = useCallback(async (
    contractCode: string,
    analysisType: 'standard' | 'comprehensive' = 'standard'
  ) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const result = await apiService.performMultiAgentAnalysis(contractCode, analysisType);
      setCurrentAudit(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Multi-agent analysis failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const uploadContract = useCallback(async (file: File) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const result = await apiService.uploadContract(file);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Contract upload failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const clearAudit = useCallback(() => {
    setCurrentAudit(null);
    setError(null);
  }, []);

  return {
    isSubmitting,
    currentAudit,
    error,
    submitAudit,
    checkAuditStatus,
    getAuditResult,
    performMultiAgentAnalysis,
    uploadContract,
    clearAudit,
  };
};

// Hook for managing user audit history
export const useAuditHistory = (userId: string | null) => {
  const [audits, setAudits] = useState<AuditResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);

  const fetchAudits = useCallback(async (limit = 10, offset = 0) => {
    if (!userId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiService.getUserAudits(userId, limit, offset);
      if (result.success) {
        setAudits(result.audits);
        setTotal(result.total);
      } else {
        setError('Failed to fetch audit history');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch audit history';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchAudits();
    }
  }, [userId, fetchAudits]);

  return {
    audits,
    isLoading,
    error,
    total,
    fetchAudits,
  };
};

// Hook for monitoring AI model status
export const useAIModels = () => {
  const [models, setModels] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchModelStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiService.getAIModelStatus();
      if (result.success) {
        setModels(result.models);
      } else {
        setError('Failed to fetch AI model status');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch AI model status';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModelStatus();
    
    // Check model status every 60 seconds
    const interval = setInterval(fetchModelStatus, 60000);
    
    return () => clearInterval(interval);
  }, [fetchModelStatus]);

  return {
    models,
    isLoading,
    error,
    fetchModelStatus,
  };
};

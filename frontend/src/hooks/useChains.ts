import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';

export interface Chain {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  blockExplorer: string;
  nativeCurrency: string;
  type: string;
  ecosystem: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  model: string;
  category: string;
}

export interface UseChainsReturn {
  chains: Record<string, Chain>;
  agents: Agent[];
  isLoading: boolean;
  error: string | null;
  getSupportedChains: () => Promise<void>;
  getAvailableAgents: () => Promise<void>;
  verifyContract: (contractAddress: string, chain: string) => Promise<any>;
  isChainSupported: (chainName: string) => boolean;
  getChainByName: (chainName: string) => Chain | null;
}

export const useChains = (): UseChainsReturn => {
  const [chains, setChains] = useState<Record<string, Chain>>({});
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get supported chains from backend
  const getSupportedChains = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const supportedChains = await apiService.getSupportedChains();
      setChains(supportedChains);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch supported chains');
      console.error('Failed to fetch supported chains:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get available AI agents from backend
  const getAvailableAgents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const availableAgents = await apiService.getAvailableAgents();
      setAgents(availableAgents);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch available agents');
      console.error('Failed to fetch available agents:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Verify contract on blockchain
  const verifyContract = useCallback(async (contractAddress: string, chain: string) => {
    try {
      setError(null);
      const result = await apiService.verifyContract(contractAddress, chain);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Contract verification failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Check if chain is supported
  const isChainSupported = useCallback((chainName: string): boolean => {
    return chainName in chains;
  }, [chains]);

  // Get chain by name
  const getChainByName = useCallback((chainName: string): Chain | null => {
    return chains[chainName] || null;
  }, [chains]);

  // Load chains and agents on mount
  useEffect(() => {
    getSupportedChains();
    getAvailableAgents();
  }, [getSupportedChains, getAvailableAgents]);

  return {
    chains,
    agents,
    isLoading,
    error,
    getSupportedChains,
    getAvailableAgents,
    verifyContract,
    isChainSupported,
    getChainByName,
  };
};

export default useChains;
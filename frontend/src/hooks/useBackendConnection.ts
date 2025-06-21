import { useState, useEffect, useCallback, useRef } from 'react';
import { backendConnectionService, ConnectionTestResult, BackendHealthStatus } from '../services/BackendConnectionService';

export interface BackendConnectionState {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  healthData: BackendHealthStatus | null;
  connectionStats: {
    latency: number;
    uptime: boolean;
    lastChecked: string;
  } | null;
  lastTestResult: ConnectionTestResult | null;
}

export interface UseBackendConnectionReturn extends BackendConnectionState {
  testConnection: () => Promise<void>;
  refreshHealth: () => Promise<void>;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  isMonitoring: boolean;
}

export const useBackendConnection = (
  autoConnect: boolean = true,
  monitoringInterval: number = 30000
): UseBackendConnectionReturn => {
  const [state, setState] = useState<BackendConnectionState>({
    isConnected: false,
    isLoading: false,
    error: null,
    healthData: null,
    connectionStats: null,
    lastTestResult: null
  });

  const [isMonitoring, setIsMonitoring] = useState(false);
  const stopMonitoringRef = useRef<(() => void) | null>(null);

  /**
   * Test backend connection
   */
  const testConnection = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await backendConnectionService.testConnection();
      
      setState(prev => ({
        ...prev,
        isConnected: result.isConnected,
        isLoading: false,
        error: result.error || null,
        healthData: result.healthData || null,
        lastTestResult: result
      }));

      // Also get connection stats
      const stats = await backendConnectionService.getConnectionStats();
      setState(prev => ({
        ...prev,
        connectionStats: stats
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        isConnected: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
        lastTestResult: null
      }));
    }
  }, []);

  /**
   * Refresh health data
   */
  const refreshHealth = useCallback(async () => {
    try {
      const healthData = await backendConnectionService.getHealthStatus();
      setState(prev => ({
        ...prev,
        healthData,
        isConnected: healthData !== null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to refresh health data'
      }));
    }
  }, []);

  /**
   * Start connection monitoring
   */
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;

    setIsMonitoring(true);
    
    const stopFn = backendConnectionService.startConnectionMonitoring(
      (isConnected) => {
        setState(prev => ({
          ...prev,
          isConnected,
          error: isConnected ? null : 'Backend connection lost'
        }));
      },
      monitoringInterval
    );

    stopMonitoringRef.current = stopFn;
  }, [isMonitoring, monitoringInterval]);

  /**
   * Stop connection monitoring
   */
  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) return;

    setIsMonitoring(false);
    
    if (stopMonitoringRef.current) {
      stopMonitoringRef.current();
      stopMonitoringRef.current = null;
    }
  }, [isMonitoring]);

  /**
   * Auto-connect on mount
   */
  useEffect(() => {
    if (autoConnect) {
      testConnection();
    }
  }, [autoConnect, testConnection]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (stopMonitoringRef.current) {
        stopMonitoringRef.current();
      }
    };
  }, []);

  return {
    ...state,
    testConnection,
    refreshHealth,
    startMonitoring,
    stopMonitoring,
    isMonitoring
  };
};

/**
 * Hook for simple backend availability check
 */
export const useBackendAvailability = (checkInterval: number = 60000) => {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkAvailability = async () => {
      try {
        const available = await backendConnectionService.isBackendAvailable();
        setIsAvailable(available);
        setLastChecked(new Date());
      } catch (error) {
        setIsAvailable(false);
        setLastChecked(new Date());
      }
    };

    // Initial check
    checkAvailability();

    // Set up interval
    intervalId = setInterval(checkAvailability, checkInterval);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [checkInterval]);

  return {
    isAvailable,
    lastChecked
  };
};

/**
 * Hook for backend health monitoring
 */
export const useBackendHealth = (refreshInterval: number = 30000) => {
  const [healthData, setHealthData] = useState<BackendHealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshHealth = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const health = await backendConnectionService.getHealthStatus();
      setHealthData(health);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    // Initial fetch
    refreshHealth();

    // Set up interval
    intervalId = setInterval(refreshHealth, refreshInterval);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [refreshHealth, refreshInterval]);

  return {
    healthData,
    isLoading,
    error,
    refreshHealth
  };
};

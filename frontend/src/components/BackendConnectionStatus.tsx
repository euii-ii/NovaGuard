import React, { useState } from 'react';
import { useBackendConnection } from '../hooks/useBackendConnection';
import './BackendConnectionStatus.css';

interface BackendConnectionStatusProps {
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export const BackendConnectionStatus: React.FC<BackendConnectionStatusProps> = ({
  showDetails = false,
  compact = false,
  className = ''
}) => {
  const [showDetailedInfo, setShowDetailedInfo] = useState(false);
  const {
    isConnected,
    isLoading,
    error,
    healthData,
    connectionStats,
    lastTestResult,
    testConnection,
    refreshHealth,
    startMonitoring,
    stopMonitoring,
    isMonitoring
  } = useBackendConnection(true, 30000);

  const getStatusColor = () => {
    if (isLoading) return 'orange';
    return isConnected ? 'green' : 'red';
  };

  const getStatusText = () => {
    if (isLoading) return 'Connecting...';
    return isConnected ? 'Connected' : 'Disconnected';
  };

  const formatLatency = (latency: number) => {
    return `${latency}ms`;
  };

  const formatUptime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  if (compact) {
    return (
      <div className={`backend-status-compact ${className}`}>
        <div 
          className={`status-indicator ${getStatusColor()}`}
          title={`Backend ${getStatusText()}`}
        />
        <span className="status-text">{getStatusText()}</span>
      </div>
    );
  }

  return (
    <div className={`backend-connection-status ${className}`}>
      <div className="status-header">
        <div className="status-main">
          <div className={`status-indicator ${getStatusColor()}`} />
          <span className="status-text">{getStatusText()}</span>
          {connectionStats && (
            <span className="latency">
              ({formatLatency(connectionStats.latency)})
            </span>
          )}
        </div>
        
        <div className="status-actions">
          <button 
            onClick={testConnection}
            disabled={isLoading}
            className="test-btn"
            title="Test Connection"
          >
            🔄
          </button>
          
          <button
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            className={`monitor-btn ${isMonitoring ? 'active' : ''}`}
            title={isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          >
            {isMonitoring ? '⏸️' : '▶️'}
          </button>
          
          {showDetails && (
            <button
              onClick={() => setShowDetailedInfo(!showDetailedInfo)}
              className="details-btn"
              title="Toggle Details"
            >
              ℹ️
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="status-error">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
        </div>
      )}

      {showDetails && showDetailedInfo && (
        <div className="status-details">
          {healthData && (
            <div className="health-info">
              <h4>Backend Health</h4>
              <div className="health-grid">
                <div className="health-item">
                  <label>Version:</label>
                  <span>{healthData.version}</span>
                </div>
                <div className="health-item">
                  <label>Environment:</label>
                  <span>{healthData.environment}</span>
                </div>
                <div className="health-item">
                  <label>Last Updated:</label>
                  <span>{formatUptime(healthData.timestamp)}</span>
                </div>
              </div>
              
              <div className="services-status">
                <h5>Services</h5>
                <div className="service-item">
                  <span>Monitoring:</span>
                  <span className={`service-status ${healthData.services.monitoring.status}`}>
                    {healthData.services.monitoring.status}
                  </span>
                </div>
                <div className="service-item">
                  <span>Analytics:</span>
                  <span className={`service-status ${healthData.services.analytics.status}`}>
                    {healthData.services.analytics.status}
                  </span>
                </div>
              </div>
            </div>
          )}

          {lastTestResult && (
            <div className="test-results">
              <h4>Connection Test Results</h4>
              <div className="test-summary">
                <div className="test-item">
                  <label>Response Time:</label>
                  <span>{formatLatency(lastTestResult.responseTime)}</span>
                </div>
                <div className="test-item">
                  <label>Endpoints Tested:</label>
                  <span>{Object.keys(lastTestResult.endpoints).length}</span>
                </div>
              </div>
              
              <div className="endpoints-status">
                <h5>Endpoint Status</h5>
                {Object.entries(lastTestResult.endpoints).map(([endpoint, result]) => (
                  <div key={endpoint} className="endpoint-item">
                    <span className="endpoint-path">{endpoint}</span>
                    <span className={`endpoint-status ${result.status}`}>
                      {result.status} ({formatLatency(result.responseTime)})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="connection-actions">
            <button onClick={refreshHealth} className="refresh-btn">
              Refresh Health Data
            </button>
            <button onClick={testConnection} className="test-full-btn">
              Run Full Connection Test
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackendConnectionStatus;

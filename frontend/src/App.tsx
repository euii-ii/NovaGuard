import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Import components
import Dashboard from './components/Dashboard';
import ContractAnalyzer from './components/ContractAnalyzer';
import AuditResults from './components/AuditResults';
import BackendIntegration from './components/BackendIntegration';
import BackendConnectionStatus from './components/BackendConnectionStatus';

// Import services and hooks
import { apiService } from './services/api';
import { useAudit } from './hooks/useAudit';
import { useBackendConnection } from './hooks/useBackendConnection';

// Import types
import type { AuditResult } from './services/api';

interface AppState {
  isBackendConnected: boolean;
  backendStatus: any;
  supportedChains: any;
  availableAgents: any;
  connectionError: string | null;
}

function App() {
  // Use the new backend connection hook
  const {
    isConnected: isBackendConnected,
    healthData: backendStatus,
    error: connectionError,
    testConnection,
    startMonitoring,
    stopMonitoring
  } = useBackendConnection(true, 30000);

  const [appState, setAppState] = useState<AppState>({
    isBackendConnected: false,
    backendStatus: null,
    supportedChains: null,
    availableAgents: null,
    connectionError: null,
  });

  const [currentView, setCurrentView] = useState<'dashboard' | 'analyzer' | 'results' | 'integration'>('dashboard');
  const [auditResults, setAuditResults] = useState<AuditResult | null>(null);

  // Update app state when backend connection changes
  useEffect(() => {
    setAppState(prev => ({
      ...prev,
      isBackendConnected,
      backendStatus,
      connectionError
    }));
  }, [isBackendConnected, backendStatus, connectionError]);

  // Initialize additional backend data when connected
  useEffect(() => {
    if (isBackendConnected) {
      initializeBackendData();
    }
  }, [isBackendConnected]);

  const initializeBackendData = async () => {
    try {
      console.log('Loading backend data...');

      // Get supported chains
      const chains = await apiService.getSupportedChains();
      console.log('Supported chains:', chains);

      // Get available AI agents
      const agents = await apiService.getAvailableAgents();
      console.log('Available agents:', agents);

      setAppState(prev => ({
        ...prev,
        supportedChains: chains,
        availableAgents: agents,
      }));

      console.log('Backend data loaded successfully');
    } catch (error) {
      console.error('Failed to load backend data:', error);
    }
  };

  const initializeBackendConnection = async () => {
    await testConnection();
    if (isBackendConnected) {
      await initializeBackendData();
    }
  };

  const handleAuditComplete = (result: AuditResult) => {
    setAuditResults(result);
    setCurrentView('results');
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            backendStatus={appState.backendStatus}
            isConnected={appState.isBackendConnected}
            onNavigate={setCurrentView}
            onRetryConnection={initializeBackendConnection}
          />
        );
      case 'analyzer':
        return (
          <ContractAnalyzer
            supportedChains={appState.supportedChains}
            availableAgents={appState.availableAgents}
            onAuditComplete={handleAuditComplete}
            onBack={() => setCurrentView('dashboard')}
          />
        );
      case 'results':
        return (
          <AuditResults
            results={auditResults}
            onBack={() => setCurrentView('analyzer')}
            onNewAnalysis={() => setCurrentView('analyzer')}
          />
        );
      case 'integration':
        return (
          <BackendIntegration
            connectionStatus={appState}
            onRetryConnection={initializeBackendConnection}
            onBack={() => setCurrentView('dashboard')}
          />
        );
      default:
        return <Navigate to="/dashboard" replace />;
    }
  };

  return (
    <Router>
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <h1 className="app-title">
              🔒 Smart Contract Security Auditor
            </h1>
            <div className="connection-status">
              <BackendConnectionStatus compact={true} />
            </div>
          </div>
          <nav className="app-nav">
            <button
              className={`nav-button ${currentView === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentView('dashboard')}
            >
              Dashboard
            </button>
            <button
              className={`nav-button ${currentView === 'analyzer' ? 'active' : ''}`}
              onClick={() => setCurrentView('analyzer')}
              disabled={!appState.isBackendConnected}
            >
              Contract Analyzer
            </button>
            <button
              className={`nav-button ${currentView === 'integration' ? 'active' : ''}`}
              onClick={() => setCurrentView('integration')}
            >
              Backend Status
            </button>
          </nav>
        </header>

        <main className="app-main">
          {appState.connectionError && !appState.isBackendConnected && (
            <div className="connection-error">
              <div className="error-content">
                <h3>⚠️ Backend Connection Failed</h3>
                <p>{appState.connectionError}</p>
                <button onClick={initializeBackendConnection} className="retry-button">
                  Retry Connection
                </button>
              </div>
            </div>
          )}

          {renderCurrentView()}
        </main>

        <footer className="app-footer">
          <div className="footer-content">
            <p>&copy; 2025 Smart Contract Security Auditor - Multi-Chain AI-Powered Analysis</p>
            <div className="footer-links">
              <span>Version 2.0.0</span>
              <span>•</span>
              <span>
                Chains: {appState.supportedChains ? Object.keys(appState.supportedChains.chains || {}).length : 0}
              </span>
              <span>•</span>
              <span>
                AI Agents: {appState.availableAgents ? appState.availableAgents.availableAgents ? Object.keys(appState.availableAgents.availableAgents).length : 0 : 0}
              </span>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
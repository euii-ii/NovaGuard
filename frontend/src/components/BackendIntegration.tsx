import React, { useState, useEffect } from 'react';
import { useAudit } from '../hooks/useAudit';
import { useChains } from '../hooks/useChains';
import { apiService } from '../services/api';

interface BackendIntegrationProps {
  onAuditComplete?: (result: any) => void;
}

const BackendIntegration: React.FC<BackendIntegrationProps> = ({ onAuditComplete }) => {
  const [contractCode, setContractCode] = useState('');
  const [contractAddress, setContractAddress] = useState('');
  const [selectedChain, setSelectedChain] = useState('ethereum');
  const [analysisType, setAnalysisType] = useState<'code' | 'address' | 'defi' | 'multi-agent'>('code');
  const [selectedAgents, setSelectedAgents] = useState<string[]>(['security', 'quality']);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  const { 
    auditState, 
    auditContract, 
    auditContractByAddress, 
    multiAgentAnalysis, 
    defiEconomicAnalysis,
    clearAudit 
  } = useAudit();

  const { chains, agents, isLoading: chainsLoading, getSupportedChains, getAvailableAgents } = useChains();

  // Check backend connectivity on mount
  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        await apiService.healthCheck();
        setBackendStatus('connected');
      } catch (error) {
        console.warn('Backend not available:', error);
        setBackendStatus('disconnected');
      }
    };

    checkBackendStatus();
  }, []);

  // Handle audit completion
  useEffect(() => {
    if (auditState.result && onAuditComplete) {
      onAuditComplete(auditState.result);
    }
  }, [auditState.result, onAuditComplete]);

  const handleAnalysis = async () => {
    try {
      clearAudit();

      switch (analysisType) {
        case 'code':
          if (!contractCode.trim()) {
            alert('Please enter contract code');
            return;
          }
          await auditContract({
            contractCode: contractCode.trim(),
            options: {
              includeGasOptimization: true,
              includeCodeQuality: true
            }
          });
          break;

        case 'address':
          if (!contractAddress.trim()) {
            alert('Please enter contract address');
            return;
          }
          await auditContractByAddress({
            contractAddress: contractAddress.trim(),
            chain: selectedChain,
            options: {
              includeGasOptimization: true,
              includeCodeQuality: true
            }
          });
          break;

        case 'multi-agent':
          if (!contractCode.trim()) {
            alert('Please enter contract code for multi-agent analysis');
            return;
          }
          await multiAgentAnalysis(contractCode.trim(), selectedAgents);
          break;

        case 'defi':
          if (!contractCode.trim()) {
            alert('Please enter contract code for DeFi analysis');
            return;
          }
          await defiEconomicAnalysis(contractCode.trim());
          break;

        default:
          alert('Please select an analysis type');
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  };

  const getStatusColor = () => {
    switch (backendStatus) {
      case 'connected': return '#10b981';
      case 'disconnected': return '#ef4444';
      default: return '#f59e0b';
    }
  };

  const getStatusText = () => {
    switch (backendStatus) {
      case 'connected': return 'Backend Connected';
      case 'disconnected': return 'Backend Disconnected';
      default: return 'Checking Backend...';
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2>🔗 Backend Integration Status</h2>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          padding: '10px',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <div 
            style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              backgroundColor: getStatusColor() 
            }}
          />
          <span style={{ fontWeight: 'bold' }}>{getStatusText()}</span>
          {backendStatus === 'connected' && (
            <span style={{ color: '#6b7280', fontSize: '14px' }}>
              (API Base URL: {import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'})
            </span>
          )}
        </div>
      </div>

      {backendStatus === 'connected' && (
        <>
          <div style={{ marginBottom: '20px' }}>
            <h3>📊 Available Resources</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={{ padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <h4>🔗 Supported Chains</h4>
                {chainsLoading ? (
                  <p>Loading chains...</p>
                ) : (
                  <div style={{ fontSize: '14px' }}>
                    {Object.keys(chains).length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        {Object.entries(chains).map(([name, chain]) => (
                          <li key={name}>
                            {chain.name} ({chain.type})
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No chains loaded</p>
                    )}
                  </div>
                )}
              </div>

              <div style={{ padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <h4>🤖 Available AI Agents</h4>
                {chainsLoading ? (
                  <p>Loading agents...</p>
                ) : (
                  <div style={{ fontSize: '14px' }}>
                    {agents.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        {agents.map((agent) => (
                          <li key={agent.id}>
                            {agent.name} ({agent.category})
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No agents loaded</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3>🔍 Test Backend Integration</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Analysis Type:
              </label>
              <select 
                value={analysisType} 
                onChange={(e) => setAnalysisType(e.target.value as any)}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  border: '1px solid #d1d5db' 
                }}
              >
                <option value="code">Contract Code Analysis</option>
                <option value="address">Contract Address Analysis</option>
                <option value="multi-agent">Multi-Agent AI Analysis</option>
                <option value="defi">DeFi Economic Analysis</option>
              </select>
            </div>

            {(analysisType === 'code' || analysisType === 'multi-agent' || analysisType === 'defi') && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Contract Code:
                </label>
                <textarea
                  value={contractCode}
                  onChange={(e) => setContractCode(e.target.value)}
                  placeholder="Enter Solidity contract code here..."
                  style={{ 
                    width: '100%', 
                    height: '150px', 
                    padding: '8px', 
                    borderRadius: '4px', 
                    border: '1px solid #d1d5db',
                    fontFamily: 'monospace',
                    fontSize: '14px'
                  }}
                />
              </div>
            )}

            {analysisType === 'address' && (
              <>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Contract Address:
                  </label>
                  <input
                    type="text"
                    value={contractAddress}
                    onChange={(e) => setContractAddress(e.target.value)}
                    placeholder="0x..."
                    style={{ 
                      width: '100%', 
                      padding: '8px', 
                      borderRadius: '4px', 
                      border: '1px solid #d1d5db' 
                    }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Blockchain:
                  </label>
                  <select 
                    value={selectedChain} 
                    onChange={(e) => setSelectedChain(e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '8px', 
                      borderRadius: '4px', 
                      border: '1px solid #d1d5db' 
                    }}
                  >
                    {Object.entries(chains).map(([name, chain]) => (
                      <option key={name} value={name}>
                        {chain.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {analysisType === 'multi-agent' && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Select AI Agents:
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {['security', 'quality', 'defi', 'economics', 'gas'].map((agent) => (
                    <label key={agent} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <input
                        type="checkbox"
                        checked={selectedAgents.includes(agent)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAgents([...selectedAgents, agent]);
                          } else {
                            setSelectedAgents(selectedAgents.filter(a => a !== agent));
                          }
                        }}
                      />
                      {agent}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleAnalysis}
              disabled={auditState.isLoading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: auditState.isLoading ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: auditState.isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {auditState.isLoading ? `Analyzing... (${auditState.progress}%)` : 'Start Analysis'}
            </button>
          </div>

          {auditState.error && (
            <div style={{ 
              padding: '15px', 
              backgroundColor: '#fef2f2', 
              border: '1px solid #fecaca', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h4 style={{ color: '#dc2626', margin: '0 0 10px 0' }}>❌ Error</h4>
              <p style={{ margin: 0, color: '#7f1d1d' }}>{auditState.error}</p>
            </div>
          )}

          {auditState.result && (
            <div style={{ 
              padding: '15px', 
              backgroundColor: '#f0fdf4', 
              border: '1px solid #bbf7d0', 
              borderRadius: '8px' 
            }}>
              <h4 style={{ color: '#16a34a', margin: '0 0 10px 0' }}>✅ Analysis Complete</h4>
              <div style={{ fontSize: '14px', color: '#15803d' }}>
                <p><strong>Audit ID:</strong> {auditState.result.auditId}</p>
                <p><strong>Overall Score:</strong> {auditState.result.overallScore}/100</p>
                <p><strong>Risk Level:</strong> {auditState.result.riskLevel}</p>
                <p><strong>Vulnerabilities Found:</strong> {auditState.result.vulnerabilities?.length || 0}</p>
                <p><strong>Execution Time:</strong> {auditState.result.executionTime}ms</p>
              </div>
            </div>
          )}
        </>
      )}

      {backendStatus === 'disconnected' && (
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#fef2f2', 
          border: '1px solid #fecaca', 
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <h3 style={{ color: '#dc2626' }}>⚠️ Backend Not Available</h3>
          <p style={{ color: '#7f1d1d', marginBottom: '15px' }}>
            The backend server is not running or not accessible. Please ensure:
          </p>
          <ul style={{ textAlign: 'left', color: '#7f1d1d', maxWidth: '400px', margin: '0 auto' }}>
            <li>Backend server is running on port 3001</li>
            <li>CORS is properly configured</li>
            <li>Environment variables are set correctly</li>
            <li>No firewall blocking the connection</li>
          </ul>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '15px',
              padding: '10px 20px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Retry Connection
          </button>
        </div>
      )}
    </div>
  );
};

export default BackendIntegration;
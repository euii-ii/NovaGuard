import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import type { AuditResult } from '../services/api';
import './ContractAnalyzer.css';

interface ContractAnalyzerProps {
  supportedChains: any;
  availableAgents: any;
  onAuditComplete: (result: AuditResult) => void;
  onBack: () => void;
}

interface AnalysisConfig {
  analysisType: 'code' | 'address';
  contractCode: string;
  contractAddress: string;
  chain: string;
  agents: string[];
  enableDeFiAnalysis: boolean;
  enableGasOptimization: boolean;
  enableRealTimeMonitoring: boolean;
}

const ContractAnalyzer: React.FC<ContractAnalyzerProps> = ({
  supportedChains,
  availableAgents,
  onAuditComplete,
  onBack,
}) => {
  const [config, setConfig] = useState<AnalysisConfig>({
    analysisType: 'code',
    contractCode: '',
    contractAddress: '',
    chain: 'ethereum',
    agents: ['security', 'quality'],
    enableDeFiAnalysis: false,
    enableGasOptimization: true,
    enableRealTimeMonitoring: false,
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Sample contract code for testing
  const sampleContract = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleToken {
    mapping(address => uint256) public balances;
    uint256 public totalSupply;
    
    constructor(uint256 _totalSupply) {
        totalSupply = _totalSupply;
        balances[msg.sender] = _totalSupply;
    }
    
    function transfer(address to, uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }
    
    function balanceOf(address account) public view returns (uint256) {
        return balances[account];
    }
}`;

  const handleAnalysisTypeChange = (type: 'code' | 'address') => {
    setConfig(prev => ({ ...prev, analysisType: type }));
    setError(null);
  };

  const handleAgentToggle = (agentId: string) => {
    setConfig(prev => ({
      ...prev,
      agents: prev.agents.includes(agentId)
        ? prev.agents.filter(id => id !== agentId)
        : [...prev.agents, agentId]
    }));
  };

  const loadSampleContract = () => {
    setConfig(prev => ({
      ...prev,
      contractCode: sampleContract,
      analysisType: 'code'
    }));
  };

  const validateInput = (): boolean => {
    if (config.analysisType === 'code') {
      if (!config.contractCode.trim()) {
        setError('Please provide contract code to analyze');
        return false;
      }
    } else {
      if (!config.contractAddress.trim()) {
        setError('Please provide a contract address to analyze');
        return false;
      }
      if (!/^0x[a-fA-F0-9]{40}$/.test(config.contractAddress.trim())) {
        setError('Please provide a valid Ethereum address');
        return false;
      }
    }

    if (config.agents.length === 0) {
      setError('Please select at least one AI agent for analysis');
      return false;
    }

    return true;
  };

  const startAnalysis = async () => {
    if (!validateInput()) return;

    setIsAnalyzing(true);
    setError(null);
    setAnalysisProgress('Initializing analysis...');

    try {
      let result: AuditResult;

      if (config.analysisType === 'code') {
        setAnalysisProgress('Analyzing contract code...');
        result = await apiService.analyzeContract({
          contractCode: config.contractCode,
          chain: config.chain,
          agents: config.agents,
          enableDeFiAnalysis: config.enableDeFiAnalysis,
          enableGasOptimization: config.enableGasOptimization,
        });
      } else {
        setAnalysisProgress('Fetching contract from blockchain...');
        result = await apiService.analyzeContractAddress({
          contractAddress: config.contractAddress,
          chain: config.chain,
          agents: config.agents,
          enableDeFiAnalysis: config.enableDeFiAnalysis,
          enableGasOptimization: config.enableGasOptimization,
        });
      }

      setAnalysisProgress('Analysis complete!');
      onAuditComplete(result);
    } catch (error) {
      console.error('Analysis failed:', error);
      setError(error instanceof Error ? error.message : 'Analysis failed');
      setAnalysisProgress('');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getChainOptions = () => {
    if (!supportedChains?.chains) return [{ id: 'ethereum', name: 'Ethereum' }];
    
    return Object.entries(supportedChains.chains).map(([id, chain]: [string, any]) => ({
      id,
      name: chain.name || id,
    }));
  };

  const getAgentOptions = () => {
    if (!availableAgents?.availableAgents) {
      return [
        { id: 'security', name: 'Security Agent', description: 'Vulnerability detection' },
        { id: 'quality', name: 'Quality Agent', description: 'Code quality analysis' },
      ];
    }

    return Object.entries(availableAgents.availableAgents).map(([id, agent]: [string, any]) => ({
      id,
      name: agent.name || id,
      description: agent.description || 'AI analysis agent',
    }));
  };

  return (
    <div className="contract-analyzer">
      <div className="analyzer-header">
        <button onClick={onBack} className="back-button">
          ← Back to Dashboard
        </button>
        <h2>🔍 Smart Contract Analyzer</h2>
        <p>Analyze smart contracts using AI-powered multi-agent system</p>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div className="analyzer-content">
        {/* Analysis Type Selection */}
        <div className="section">
          <h3>Analysis Type</h3>
          <div className="analysis-type-selector">
            <button
              className={`type-button ${config.analysisType === 'code' ? 'active' : ''}`}
              onClick={() => handleAnalysisTypeChange('code')}
            >
              📝 Contract Code
            </button>
            <button
              className={`type-button ${config.analysisType === 'address' ? 'active' : ''}`}
              onClick={() => handleAnalysisTypeChange('address')}
            >
              🌐 Contract Address
            </button>
          </div>
        </div>

        {/* Input Section */}
        <div className="section">
          <h3>
            {config.analysisType === 'code' ? '📝 Contract Code' : '🌐 Contract Address'}
          </h3>
          
          {config.analysisType === 'code' ? (
            <div className="code-input-section">
              <div className="code-input-header">
                <button onClick={loadSampleContract} className="sample-button">
                  Load Sample Contract
                </button>
              </div>
              <textarea
                className="code-input"
                placeholder="Paste your Solidity contract code here..."
                value={config.contractCode}
                onChange={(e) => setConfig(prev => ({ ...prev, contractCode: e.target.value }))}
                rows={15}
              />
            </div>
          ) : (
            <div className="address-input-section">
              <input
                type="text"
                className="address-input"
                placeholder="0x... (Contract address)"
                value={config.contractAddress}
                onChange={(e) => setConfig(prev => ({ ...prev, contractAddress: e.target.value }))}
              />
            </div>
          )}
        </div>

        {/* Chain Selection */}
        <div className="section">
          <h3>🌐 Blockchain Network</h3>
          <select
            className="chain-selector"
            value={config.chain}
            onChange={(e) => setConfig(prev => ({ ...prev, chain: e.target.value }))}
          >
            {getChainOptions().map(chain => (
              <option key={chain.id} value={chain.id}>
                {chain.name}
              </option>
            ))}
          </select>
        </div>

        {/* AI Agents Selection */}
        <div className="section">
          <h3>🤖 AI Agents</h3>
          <div className="agents-grid">
            {getAgentOptions().map(agent => (
              <div
                key={agent.id}
                className={`agent-card ${config.agents.includes(agent.id) ? 'selected' : ''}`}
                onClick={() => handleAgentToggle(agent.id)}
              >
                <div className="agent-name">{agent.name}</div>
                <div className="agent-description">{agent.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Analysis Options */}
        <div className="section">
          <h3>⚙️ Analysis Options</h3>
          <div className="options-grid">
            <label className="option-item">
              <input
                type="checkbox"
                checked={config.enableDeFiAnalysis}
                onChange={(e) => setConfig(prev => ({ ...prev, enableDeFiAnalysis: e.target.checked }))}
              />
              <span>🏦 DeFi Analysis</span>
            </label>
            <label className="option-item">
              <input
                type="checkbox"
                checked={config.enableGasOptimization}
                onChange={(e) => setConfig(prev => ({ ...prev, enableGasOptimization: e.target.checked }))}
              />
              <span>⛽ Gas Optimization</span>
            </label>
            <label className="option-item">
              <input
                type="checkbox"
                checked={config.enableRealTimeMonitoring}
                onChange={(e) => setConfig(prev => ({ ...prev, enableRealTimeMonitoring: e.target.checked }))}
              />
              <span>📊 Real-time Monitoring</span>
            </label>
          </div>
        </div>

        {/* Analysis Button */}
        <div className="section">
          <button
            className="analyze-button"
            onClick={startAnalysis}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <span className="spinner"></span>
                Analyzing...
              </>
            ) : (
              <>
                🚀 Start Analysis
              </>
            )}
          </button>
          
          {analysisProgress && (
            <div className="progress-message">
              {analysisProgress}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractAnalyzer;

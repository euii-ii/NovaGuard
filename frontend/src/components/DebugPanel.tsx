import React, { useState, useEffect } from 'react';
import { DebuggerService } from '../services/debuggerService';
import type { DebugResult, DebugIssue } from '../services/debuggerService';

interface DebugPanelProps {
  contractCode: string;
  contractName: string;
  onIssueClick: (line: number) => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  contractCode,
  contractName,
  onIssueClick
}) => {
  const [debugResult, setDebugResult] = useState<DebugResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'issues' | 'gas' | 'security' | 'optimizations' | 'trace'>('issues');

  const debugService = DebuggerService.getInstance();

  useEffect(() => {
    if (contractCode && contractName) {
      analyzeContract();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractCode, contractName]);

  const analyzeContract = async () => {
    setIsAnalyzing(true);
    try {
      const result = await debugService.debugContract(contractCode, contractName, {
        enableGasAnalysis: true,
        enableSecurityScan: true,
        enableOptimizations: true,
        enableTracing: true
      });
      setDebugResult(result);
    } catch (error) {
      console.error('Debug analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#f44336';
      case 'high': return '#ff9800';
      case 'medium': return '#ffeb3b';
      case 'low': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📝';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'syntax': return '📝';
      case 'logic': return '🧠';
      case 'security': return '🛡️';
      case 'gas': return '⛽';
      case 'style': return '🎨';
      default: return '📋';
    }
  };

  if (isAnalyzing) {
    return (
      <div className="debug-panel analyzing">
        <div className="analyzing-content">
          <div className="spinner"></div>
          <h3>🔍 Analyzing Contract</h3>
          <p>Running comprehensive analysis...</p>
          <div className="analysis-steps">
            <div className="step active">📝 Syntax Analysis</div>
            <div className="step active">🛡️ Security Scan</div>
            <div className="step active">⛽ Gas Analysis</div>
            <div className="step active">🔧 Optimization Check</div>
          </div>
        </div>
      </div>
    );
  }

  if (!debugResult) {
    return (
      <div className="debug-panel empty">
        <div className="empty-content">
          <h3>🔍 Smart Contract Debugger</h3>
          <p>Select a contract file to start debugging</p>
          <button onClick={analyzeContract} className="analyze-btn">
            Start Analysis
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="debug-panel">
      <div className="debug-header">
        <h3>🔍 Debug Analysis: {contractName}</h3>
        <button onClick={analyzeContract} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      <div className="debug-summary">
        <div className="summary-card">
          <span className="summary-icon">🚨</span>
          <div className="summary-content">
            <div className="summary-number">{debugResult.issues.length}</div>
            <div className="summary-label">Issues</div>
          </div>
        </div>
        <div className="summary-card">
          <span className="summary-icon">⛽</span>
          <div className="summary-content">
            <div className="summary-number">{debugResult.gasAnalysis.totalEstimate.toLocaleString()}</div>
            <div className="summary-label">Gas</div>
          </div>
        </div>
        <div className="summary-card">
          <span className="summary-icon">🛡️</span>
          <div className="summary-content">
            <div className="summary-number">{debugResult.securityReport.score}</div>
            <div className="summary-label">Security</div>
          </div>
        </div>
        <div className="summary-card">
          <span className="summary-icon">🔧</span>
          <div className="summary-content">
            <div className="summary-number">{debugResult.optimizations.length}</div>
            <div className="summary-label">Optimizations</div>
          </div>
        </div>
      </div>

      <div className="debug-tabs">
        <button 
          className={`tab ${activeTab === 'issues' ? 'active' : ''}`}
          onClick={() => setActiveTab('issues')}
        >
          🚨 Issues ({debugResult.issues.length})
        </button>
        <button 
          className={`tab ${activeTab === 'gas' ? 'active' : ''}`}
          onClick={() => setActiveTab('gas')}
        >
          ⛽ Gas Analysis
        </button>
        <button 
          className={`tab ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          🛡️ Security ({debugResult.securityReport.vulnerabilities.length})
        </button>
        <button 
          className={`tab ${activeTab === 'optimizations' ? 'active' : ''}`}
          onClick={() => setActiveTab('optimizations')}
        >
          🔧 Optimizations ({debugResult.optimizations.length})
        </button>
        {debugResult.executionTrace && (
          <button 
            className={`tab ${activeTab === 'trace' ? 'active' : ''}`}
            onClick={() => setActiveTab('trace')}
          >
            📊 Trace
          </button>
        )}
      </div>

      <div className="debug-content">
        {activeTab === 'issues' && (
          <div className="issues-tab">
            {debugResult.issues.length === 0 ? (
              <div className="no-issues">
                <span className="success-icon">✅</span>
                <h4>No Issues Found</h4>
                <p>Your contract looks good!</p>
              </div>
            ) : (
              <div className="issues-list">
                {debugResult.issues.map((issue, index) => (
                  <div 
                    key={index} 
                    className={`issue-item ${issue.severity}`}
                    onClick={() => onIssueClick(issue.line)}
                  >
                    <div className="issue-header">
                      <span className="issue-type">{getTypeIcon(issue.type)}</span>
                      <span className="issue-category">{getCategoryIcon(issue.category)}</span>
                      <span className="issue-title">{issue.message}</span>
                      <span 
                        className="issue-severity"
                        style={{ backgroundColor: getSeverityColor(issue.severity) }}
                      >
                        {issue.severity}
                      </span>
                    </div>
                    <div className="issue-location">
                      Line {issue.line}, Column {issue.column}
                    </div>
                    <div className="issue-suggestion">
                      💡 {issue.suggestion}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'gas' && (
          <div className="gas-tab">
            <div className="gas-overview">
              <h4>⛽ Gas Analysis Overview</h4>
              <div className="gas-stats">
                <div className="gas-stat">
                  <label>Total Estimate:</label>
                  <span>{debugResult.gasAnalysis.totalEstimate.toLocaleString()} gas</span>
                </div>
                <div className="gas-stat">
                  <label>Optimization Potential:</label>
                  <span>{debugResult.gasAnalysis.optimizationPotential.toLocaleString()} gas</span>
                </div>
                <div className="gas-stat">
                  <label>Estimated Cost:</label>
                  <span>${debugResult.gasAnalysis.costInUSD.toFixed(4)} USD</span>
                </div>
              </div>
            </div>

            <div className="function-breakdown">
              <h4>📊 Function Gas Breakdown</h4>
              {Object.entries(debugResult.gasAnalysis.functionBreakdown).map(([func, gas]) => (
                <div key={func} className="function-gas">
                  <span className="function-name">{func}</span>
                  <span className="function-gas-amount">{gas.toLocaleString()} gas</span>
                  <div className="gas-bar">
                    <div 
                      className="gas-fill"
                      style={{ 
                        width: `${(gas / debugResult.gasAnalysis.totalEstimate) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="gas-recommendations">
              <h4>💡 Recommendations</h4>
              {debugResult.gasAnalysis.recommendations.map((rec, index) => (
                <div key={index} className="recommendation">
                  • {rec}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="security-tab">
            <div className="security-overview">
              <h4>🛡️ Security Report</h4>
              <div className="security-score">
                <div className={`score-circle ${debugResult.securityReport.riskLevel}`}>
                  <span className="score-number">{debugResult.securityReport.score}</span>
                  <span className="score-label">/ 100</span>
                </div>
                <div className="risk-level">
                  Risk Level: <span className={`risk ${debugResult.securityReport.riskLevel}`}>
                    {debugResult.securityReport.riskLevel.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {debugResult.securityReport.vulnerabilities.length > 0 && (
              <div className="vulnerabilities">
                <h4>🚨 Vulnerabilities</h4>
                {debugResult.securityReport.vulnerabilities.map((vuln, index) => (
                  <div key={index} className={`vulnerability ${vuln.severity}`}>
                    <div className="vuln-header">
                      <span className="vuln-type">{vuln.type}</span>
                      <span className="vuln-severity">{vuln.severity}</span>
                    </div>
                    <div className="vuln-description">{vuln.description}</div>
                    <div className="vuln-location">
                      Line {vuln.location.line}, Column {vuln.location.column}
                    </div>
                    <div className="vuln-fix">🔧 {vuln.fix}</div>
                    {vuln.cwe && <div className="vuln-cwe">CWE: {vuln.cwe}</div>}
                  </div>
                ))}
              </div>
            )}

            <div className="security-recommendations">
              <h4>💡 Security Recommendations</h4>
              {debugResult.securityReport.recommendations.map((rec, index) => (
                <div key={index} className="recommendation">
                  • {rec}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'optimizations' && (
          <div className="optimizations-tab">
            <h4>🔧 Optimization Suggestions</h4>
            {debugResult.optimizations.length === 0 ? (
              <div className="no-optimizations">
                <span className="success-icon">✅</span>
                <h4>Well Optimized!</h4>
                <p>No obvious optimizations found.</p>
              </div>
            ) : (
              <div className="optimizations-list">
                {debugResult.optimizations.map((opt, index) => (
                  <div key={index} className={`optimization ${opt.impact}`}>
                    <div className="opt-header">
                      <span className="opt-type">{opt.type}</span>
                      <span className="opt-impact">{opt.impact} impact</span>
                    </div>
                    <div className="opt-description">{opt.description}</div>
                    <div className="opt-comparison">
                      <div className="before">
                        <label>Before:</label>
                        <code>{opt.before}</code>
                      </div>
                      <div className="after">
                        <label>After:</label>
                        <code>{opt.after}</code>
                      </div>
                    </div>
                    {opt.savings && (
                      <div className="opt-savings">💰 Savings: {opt.savings}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'trace' && debugResult.executionTrace && (
          <div className="trace-tab">
            <h4>📊 Execution Trace</h4>
            <div className="trace-list">
              {debugResult.executionTrace.map((step, index) => (
                <div key={index} className="trace-step">
                  <div className="step-number">{step.step}</div>
                  <div className="step-opcode">{step.opcode}</div>
                  <div className="step-gas">{step.gas} gas</div>
                  <div className="step-stack">
                    Stack: {step.stack.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

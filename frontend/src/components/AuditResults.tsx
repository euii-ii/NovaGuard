import React from 'react';
import type { AuditResult, Vulnerability } from '../services/api';
import './AuditResults.css';

interface AuditResultsProps {
  result: AuditResult;
  onClose?: () => void;
}

const AuditResults: React.FC<AuditResultsProps> = ({ result, onClose }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      case 'low': return '#65a30d';
      default: return '#6b7280';
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      case 'low': return '#65a30d';
      default: return '#6b7280';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#65a30d';
    if (score >= 60) return '#d97706';
    if (score >= 40) return '#ea580c';
    return '#dc2626';
  };

  return (
    <div className="audit-results-overlay">
      <div className="audit-results-modal">
        <div className="audit-results-header">
          <h2>🛡️ Security Audit Report</h2>
          {onClose && (
            <button className="close-button" onClick={onClose}>
              ✕
            </button>
          )}
        </div>

        <div className="audit-results-content">
          {/* Summary Section */}
          <div className="audit-summary">
            <div className="summary-card">
              <div className="score-section">
                <div className="score-circle" style={{ borderColor: getScoreColor(result.overallScore) }}>
                  <span className="score-number" style={{ color: getScoreColor(result.overallScore) }}>
                    {result.overallScore}
                  </span>
                  <span className="score-label">Security Score</span>
                </div>
                <div className="risk-level" style={{ color: getRiskLevelColor(result.riskLevel) }}>
                  Risk Level: {result.riskLevel}
                </div>
              </div>

              <div className="contract-info">
                <h3>📋 Contract Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="label">Name:</span>
                    <span className="value">{result.contractInfo.name}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Functions:</span>
                    <span className="value">{result.contractInfo.functions}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Lines of Code:</span>
                    <span className="value">{result.contractInfo.linesOfCode}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Complexity:</span>
                    <span className="value">{result.contractInfo.complexity}</span>
                  </div>
                  {result.contractInfo.address && (
                    <div className="info-item">
                      <span className="label">Address:</span>
                      <span className="value address">{result.contractInfo.address}</span>
                    </div>
                  )}
                  {result.contractInfo.chain && (
                    <div className="info-item">
                      <span className="label">Chain:</span>
                      <span className="value">{result.contractInfo.chain}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Vulnerability Counts */}
          <div className="vulnerability-counts">
            <h3>🚨 Vulnerability Summary</h3>
            <div className="counts-grid">
              <div className="count-item critical">
                <span className="count">{result.severityCounts.Critical}</span>
                <span className="label">Critical</span>
              </div>
              <div className="count-item high">
                <span className="count">{result.severityCounts.High}</span>
                <span className="label">High</span>
              </div>
              <div className="count-item medium">
                <span className="count">{result.severityCounts.Medium}</span>
                <span className="label">Medium</span>
              </div>
              <div className="count-item low">
                <span className="count">{result.severityCounts.Low}</span>
                <span className="label">Low</span>
              </div>
            </div>
          </div>

          {/* Vulnerabilities List */}
          {result.vulnerabilities.length > 0 && (
            <div className="vulnerabilities-section">
              <h3>🔍 Detected Vulnerabilities</h3>
              <div className="vulnerabilities-list">
                {result.vulnerabilities.map((vuln: Vulnerability, index: number) => (
                  <div key={index} className="vulnerability-card">
                    <div className="vulnerability-header">
                      <div className="vulnerability-title">
                        <span 
                          className="severity-badge" 
                          style={{ backgroundColor: getSeverityColor(vuln.severity) }}
                        >
                          {vuln.severity}
                        </span>
                        <h4>{vuln.name}</h4>
                      </div>
                      <div className="vulnerability-meta">
                        <span className="category">{vuln.category}</span>
                        <span className="confidence">Confidence: {vuln.confidence}</span>
                      </div>
                    </div>
                    <p className="vulnerability-description">{vuln.description}</p>
                    {vuln.affectedLines.length > 0 && (
                      <div className="affected-lines">
                        <strong>Affected Lines:</strong> {vuln.affectedLines.join(', ')}
                      </div>
                    )}
                    {vuln.codeSnippet && (
                      <div className="code-snippet">
                        <strong>Code:</strong>
                        <pre><code>{vuln.codeSnippet}</code></pre>
                      </div>
                    )}
                    {vuln.recommendation && (
                      <div className="recommendation">
                        <strong>💡 Recommendation:</strong>
                        <p>{vuln.recommendation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div className="recommendations-section">
              <h3>💡 General Recommendations</h3>
              <ul className="recommendations-list">
                {result.recommendations.map((rec: string, index: number) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Summary */}
          <div className="audit-summary-text">
            <h3>📝 Summary</h3>
            <p>{result.summary}</p>
          </div>

          {/* Audit Metadata */}
          <div className="audit-metadata">
            <div className="metadata-item">
              <span className="label">Audit ID:</span>
              <span className="value">{result.auditId}</span>
            </div>
            <div className="metadata-item">
              <span className="label">Execution Time:</span>
              <span className="value">{(result.executionTime / 1000).toFixed(2)}s</span>
            </div>
            <div className="metadata-item">
              <span className="label">Timestamp:</span>
              <span className="value">{new Date(result.timestamp).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="audit-results-footer">
          <button className="download-button">
            📄 Download Report
          </button>
          <button className="share-button">
            🔗 Share Results
          </button>
          {onClose && (
            <button className="close-button-footer" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditResults;

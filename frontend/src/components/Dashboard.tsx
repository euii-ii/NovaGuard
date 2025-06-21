import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import './Dashboard.css';

interface DashboardProps {
  backendStatus: any;
  isConnected: boolean;
  onNavigate: (view: string) => void;
  onRetryConnection: () => void;
}

interface DashboardStats {
  totalAudits: number;
  averageScore: number;
  criticalVulns: number;
  highVulns: number;
  recentAudits: Array<{
    timestamp: string;
    score: number;
  }>;
}

const Dashboard: React.FC<DashboardProps> = ({
  backendStatus,
  isConnected,
  onNavigate,
  onRetryConnection,
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isConnected) {
      loadDashboardStats();
    }
  }, [isConnected]);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const dashboardStats = await apiService.getAuditStatistics();
      setStats(dashboardStats);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FF9800';
    return '#F44336';
  };

  if (!isConnected) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h2>🔒 Smart Contract Security Dashboard</h2>
          <p>Connect to backend to view analytics and start auditing contracts</p>
        </div>

        <div className="connection-prompt">
          <div className="connection-card">
            <h3>⚠️ Backend Not Connected</h3>
            <p>Please ensure the backend server is running on port 3001</p>
            <button onClick={onRetryConnection} className="retry-button">
              Retry Connection
            </button>
          </div>
        </div>

        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="action-grid">
            <button 
              className="action-card disabled"
              disabled
            >
              <span className="action-icon">🔍</span>
              <span className="action-title">Analyze Contract</span>
              <span className="action-desc">Audit smart contract code</span>
            </button>
            <button 
              className="action-card disabled"
              disabled
            >
              <span className="action-icon">🌐</span>
              <span className="action-title">Multi-Chain Analysis</span>
              <span className="action-desc">Cross-chain security audit</span>
            </button>
            <button 
              className="action-card disabled"
              disabled
            >
              <span className="action-icon">🤖</span>
              <span className="action-title">AI Agents</span>
              <span className="action-desc">Multi-agent AI analysis</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>🔒 Smart Contract Security Dashboard</h2>
        <p>AI-powered multi-chain security analysis platform</p>
      </div>

      {/* Backend Status */}
      <div className="status-section">
        <div className="status-card">
          <h3>🟢 Backend Status</h3>
          <div className="status-details">
            <div className="status-item">
              <span>Version:</span>
              <span>{backendStatus?.version || '2.0.0'}</span>
            </div>
            <div className="status-item">
              <span>Environment:</span>
              <span>{backendStatus?.environment || 'development'}</span>
            </div>
            <div className="status-item">
              <span>Monitoring:</span>
              <span className={backendStatus?.services?.monitoring?.status === 'active' ? 'status-active' : 'status-inactive'}>
                {backendStatus?.services?.monitoring?.status || 'inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {loading ? (
        <div className="loading-section">
          <div className="loading-spinner"></div>
          <p>Loading dashboard statistics...</p>
        </div>
      ) : stats ? (
        <div className="stats-section">
          <h3>📊 Analytics Overview</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.totalAudits}</div>
              <div className="stat-label">Total Audits</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: getScoreColor(stats.averageScore) }}>
                {stats.averageScore}
              </div>
              <div className="stat-label">Average Score</div>
            </div>
            <div className="stat-card">
              <div className="stat-value critical">{stats.criticalVulns}</div>
              <div className="stat-label">Critical Issues</div>
            </div>
            <div className="stat-card">
              <div className="stat-value high">{stats.highVulns}</div>
              <div className="stat-label">High Issues</div>
            </div>
          </div>

          {/* Recent Audits */}
          {stats.recentAudits && stats.recentAudits.length > 0 && (
            <div className="recent-audits">
              <h4>Recent Audits</h4>
              <div className="audit-list">
                {stats.recentAudits.map((audit, index) => (
                  <div key={index} className="audit-item">
                    <span className="audit-date">{formatDate(audit.timestamp)}</span>
                    <span 
                      className="audit-score"
                      style={{ color: getScoreColor(audit.score) }}
                    >
                      {audit.score}/100
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>🚀 Quick Actions</h3>
        <div className="action-grid">
          <button 
            className="action-card"
            onClick={() => onNavigate('analyzer')}
          >
            <span className="action-icon">🔍</span>
            <span className="action-title">Analyze Contract</span>
            <span className="action-desc">Audit smart contract code or address</span>
          </button>
          <button 
            className="action-card"
            onClick={() => onNavigate('integration')}
          >
            <span className="action-icon">🔧</span>
            <span className="action-title">Backend Status</span>
            <span className="action-desc">View detailed backend information</span>
          </button>
          <button 
            className="action-card"
            onClick={() => window.open('https://github.com/euii-ii/dao', '_blank')}
          >
            <span className="action-icon">📚</span>
            <span className="action-title">Documentation</span>
            <span className="action-desc">View project documentation</span>
          </button>
        </div>
      </div>

      {/* Features */}
      <div className="features-section">
        <h3>✨ Platform Features</h3>
        <div className="features-grid">
          <div className="feature-card">
            <h4>🤖 Multi-Agent AI</h4>
            <p>Specialized AI agents for security, quality, DeFi, and cross-chain analysis</p>
          </div>
          <div className="feature-card">
            <h4>🌐 Multi-Chain Support</h4>
            <p>Support for Ethereum, Polygon, Sui, Aptos, and Solana blockchains</p>
          </div>
          <div className="feature-card">
            <h4>⚡ Real-Time Analysis</h4>
            <p>Live vulnerability detection and instant feedback during development</p>
          </div>
          <div className="feature-card">
            <h4>📊 Advanced Analytics</h4>
            <p>Comprehensive reporting with gas optimization and code quality insights</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

import React from 'react';
import { useDatabase } from '../hooks/useDatabase';

interface DatabaseStatusProps {
  className?: string;
}

export const DatabaseStatus: React.FC<DatabaseStatusProps> = ({ className = '' }) => {
  const { isInitialized, dbUser, error } = useDatabase();

  const getStatusColor = () => {
    if (error) return '#ef4444'; // red
    if (isInitialized) return '#10b981'; // green
    return '#f59e0b'; // yellow
  };

  const getStatusText = () => {
    if (error) return 'Database Error';
    if (isInitialized) return 'Database Connected';
    return 'Connecting...';
  };

  const getStatusIcon = () => {
    if (error) return '❌';
    if (isInitialized) return '✅';
    return '🔄';
  };

  return (
    <div className={`database-status ${className}`} style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px',
      padding: '8px 12px',
      borderRadius: '6px',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      border: `1px solid ${getStatusColor()}`,
      fontSize: '12px',
      color: '#ffffff'
    }}>
      <span style={{ fontSize: '14px' }}>{getStatusIcon()}</span>
      <span style={{ color: getStatusColor(), fontWeight: '500' }}>
        {getStatusText()}
      </span>
      {dbUser && (
        <span style={{ opacity: 0.8 }}>
          ({dbUser.name})
        </span>
      )}
      {error && (
        <span style={{ 
          fontSize: '10px', 
          opacity: 0.7,
          maxWidth: '200px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {error}
        </span>
      )}
    </div>
  );
};
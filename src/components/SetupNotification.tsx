import React, { useState } from 'react';

export const SetupNotification: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
      color: 'white',
      padding: '16px 20px',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(255, 107, 107, 0.3)',
      maxWidth: '400px',
      zIndex: 10000,
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
      fontSize: '14px',
      border: '1px solid rgba(255, 255, 255, 0.2)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
          🚨 Setup Required
        </div>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '0',
            marginLeft: '12px'
          }}
        >
          ×
        </button>
      </div>
      
      <div style={{ marginBottom: '12px', lineHeight: '1.5' }}>
        <strong>Database tables are missing!</strong>
        <br />
        Please create the required tables in Supabase:
      </div>
      
      <div style={{ marginBottom: '16px' }}>
        <div style={{ marginBottom: '8px' }}>
          <strong>1.</strong> Go to your{' '}
          <a 
            href="https://supabase.com/dashboard" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: '#fff', textDecoration: 'underline' }}
          >
            Supabase Dashboard
          </a>
        </div>
        <div style={{ marginBottom: '8px' }}>
          <strong>2.</strong> Open SQL Editor
        </div>
        <div style={{ marginBottom: '8px' }}>
          <strong>3.</strong> Run the SQL from <code>SETUP_INSTRUCTIONS.md</code>
        </div>
      </div>
      
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        fontFamily: 'monospace'
      }}>
        💡 Check the browser console for detailed error messages
      </div>
    </div>
  );
};

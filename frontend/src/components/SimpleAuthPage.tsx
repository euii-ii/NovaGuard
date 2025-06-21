import React from 'react';
import { SignIn } from '@clerk/clerk-react';

export function SimpleAuthPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '2rem',
        maxWidth: '400px',
        width: '100%'
      }}>
        <h1 style={{ 
          color: '#ffffff', 
          textAlign: 'center', 
          marginBottom: '2rem',
          fontSize: '1.5rem'
        }}>
          Welcome to FlashAudit
        </h1>
        
        <SignIn
          afterSignInUrl="/"
          redirectUrl="/"
          appearance={{
            variables: {
              colorPrimary: '#3b82f6'
            }
          }}
        />
      </div>
    </div>
  );
}

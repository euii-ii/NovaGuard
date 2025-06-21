import React from 'react';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { useSearchParams } from 'react-router-dom';

export function AuthPage() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'signin';
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Navigation Header */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'rgba(15, 15, 35, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '1rem 2rem'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <img 
              src="/src/assets/images.png" 
              alt="FlashAudit Logo" 
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px'
              }}
            />
            <span style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: '#ffffff'
            }}>
              FlashAudit
            </span>
          </div>
          <a 
            href="/index.html" 
            style={{
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: '0.9rem',
              transition: 'color 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#ffffff'}
            onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
          >
            ← Back to Home
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <div style={{
        width: '100%',
        maxWidth: '1200px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '4rem',
        alignItems: 'center',
        marginTop: '4rem'
      }}>
        {/* Left Side - Branding */}
        <div style={{ padding: '2rem' }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 700,
            marginBottom: '1.5rem',
            background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #1d4ed8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1.2
          }}>
            Secure Every Smart Contract
          </h1>
          <p style={{
            fontSize: '1.1rem',
            color: '#94a3b8',
            marginBottom: '2rem',
            lineHeight: 1.6
          }}>
            Join thousands of developers using FlashAudit to secure their Web3 projects with AI-powered vulnerability detection.
          </p>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {[
              { icon: '🔒', text: 'Multi-chain security analysis' },
              { icon: '🤖', text: 'AI-powered vulnerability detection' },
              { icon: '⚡', text: 'Real-time monitoring' },
              { icon: '🌐', text: 'Cross-chain compatibility' }
            ].map((feature, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <span style={{ fontSize: '1.25rem' }}>{feature.icon}</span>
                <span style={{ color: '#ffffff' }}>{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side - Authentication */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          padding: '2rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '500px'
        }}>
          {mode === 'signin' ? (
            <SignIn
              afterSignInUrl="/"
              signUpUrl="/auth?mode=signup"
              appearance={{
                baseTheme: undefined,
                variables: {
                  colorPrimary: '#3b82f6',
                  colorBackground: 'transparent',
                  colorInputBackground: 'rgba(255, 255, 255, 0.05)',
                  colorInputText: '#ffffff',
                  colorText: '#ffffff',
                  colorTextSecondary: '#94a3b8',
                  borderRadius: '8px'
                },
                elements: {
                  rootBox: {
                    width: '100%'
                  },
                  card: {
                    background: 'transparent',
                    boxShadow: 'none',
                    border: 'none'
                  },
                  headerTitle: {
                    color: '#ffffff',
                    fontSize: '1.5rem',
                    fontWeight: 600
                  },
                  headerSubtitle: {
                    color: '#94a3b8'
                  },
                  socialButtonsBlockButton: {
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#ffffff'
                  },
                  formFieldInput: {
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#ffffff'
                  },
                  formButtonPrimary: {
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    border: 'none'
                  }
                }
              }}
            />
          ) : (
            <SignUp
              afterSignUpUrl="/"
              signInUrl="/auth?mode=signin"
              appearance={{
                baseTheme: undefined,
                variables: {
                  colorPrimary: '#3b82f6',
                  colorBackground: 'transparent',
                  colorInputBackground: 'rgba(255, 255, 255, 0.05)',
                  colorInputText: '#ffffff',
                  colorText: '#ffffff',
                  colorTextSecondary: '#94a3b8',
                  borderRadius: '8px'
                },
                elements: {
                  rootBox: {
                    width: '100%'
                  },
                  card: {
                    background: 'transparent',
                    boxShadow: 'none',
                    border: 'none'
                  },
                  headerTitle: {
                    color: '#ffffff',
                    fontSize: '1.5rem',
                    fontWeight: 600
                  },
                  headerSubtitle: {
                    color: '#94a3b8'
                  },
                  socialButtonsBlockButton: {
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#ffffff'
                  },
                  formFieldInput: {
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#ffffff'
                  },
                  formButtonPrimary: {
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    border: 'none'
                  }
                }
              }}
            />
          )}
        </div>
      </div>

      {/* Responsive Design */}
      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
            gap: 2rem !important;
          }
        }
      `}</style>
    </div>
  );
}

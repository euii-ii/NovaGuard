import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import App from './App_simple.tsx'
import { SimpleAuthPage } from './components/SimpleAuthPage'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  console.warn("Missing Clerk Publishable Key. Please set VITE_CLERK_PUBLISHABLE_KEY in your .env file")
  console.warn("To get a key: 1. Go to https://dashboard.clerk.com/ 2. Create an app 3. Copy the publishable key")
}

// For development, we'll allow the app to run even without a proper Clerk key
const isDevelopment = import.meta.env.DEV
const shouldShowClerkSetup = !PUBLISHABLE_KEY || PUBLISHABLE_KEY.includes('placeholder')

// Clerk Setup Instructions Component
function ClerkSetupInstructions() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ maxWidth: '600px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#3b82f6' }}>
          🔐 Clerk Authentication Setup Required
        </h1>
        <p style={{ fontSize: '1.1rem', marginBottom: '2rem', color: '#94a3b8' }}>
          To enable authentication, please set up Clerk:
        </p>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '1.5rem',
          textAlign: 'left',
          marginBottom: '2rem'
        }}>
          <h3 style={{ color: '#ffffff', marginBottom: '1rem' }}>Setup Steps:</h3>
          <ol style={{ color: '#e2e8f0', lineHeight: '1.6' }}>
            <li>Go to <a href="https://dashboard.clerk.com/" target="_blank" style={{ color: '#3b82f6' }}>https://dashboard.clerk.com/</a></li>
            <li>Create a new application</li>
            <li>Copy the publishable key from API Keys section</li>
            <li>Add it to your <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: '4px' }}>.env</code> file:</li>
          </ol>
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '1rem',
            borderRadius: '4px',
            marginTop: '1rem',
            fontFamily: 'monospace',
            fontSize: '0.9rem'
          }}>
            VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            border: 'none',
            borderRadius: '8px',
            color: '#ffffff',
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          Refresh After Setup
        </button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {PUBLISHABLE_KEY && !shouldShowClerkSetup ? (
      <ClerkProvider
        publishableKey={PUBLISHABLE_KEY}
        afterSignOutUrl="/auth"
        signInUrl="/auth"
        signUpUrl="/auth"
      >
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<SimpleAuthPage />} />
            <Route path="/*" element={<App />} />
          </Routes>
        </BrowserRouter>
      </ClerkProvider>
    ) : isDevelopment ? (
      // In development, show the app without authentication for testing
      <BrowserRouter>
        <Routes>
          <Route path="/setup" element={<ClerkSetupInstructions />} />
          <Route path="/*" element={<App />} />
        </Routes>
      </BrowserRouter>
    ) : (
      <ClerkSetupInstructions />
    )}
  </React.StrictMode>
)

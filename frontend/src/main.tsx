import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ClerkProvider } from '@clerk/clerk-react'

// Import your Publishable Key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  console.warn('Missing Clerk Publishable Key - using placeholder for development')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      afterSignOutUrl='/'
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: '#007acc',
          colorBackground: '#ffffff',
          colorInputBackground: '#ffffff',
          colorInputText: '#000000',
          colorText: '#000000',
          colorTextSecondary: '#666666',
          colorShimmer: '#f5f5f5',
          borderRadius: '8px'
        },
        elements: {
          formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
          card: 'bg-white border border-gray-300 shadow-lg',
          headerTitle: 'text-black',
          headerSubtitle: 'text-gray-600',
          socialButtonsBlockButton: 'border-gray-300 hover:bg-gray-50 text-black',
          formFieldInput: 'bg-white border-gray-300 text-black',
          footerActionLink: 'text-blue-600 hover:text-blue-700'
        }
      }}
    >
      <App />
    </ClerkProvider>
  </React.StrictMode>,
)
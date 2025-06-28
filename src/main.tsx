import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ClerkProvider } from '@clerk/clerk-react'

// Import your Publishable Key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Publishable Key')
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
          colorBackground: '#1e1e1e',
          colorInputBackground: '#2d2d30',
          colorInputText: '#cccccc',
          colorText: '#cccccc',
          colorTextSecondary: '#969696',
          colorShimmer: '#3e3e42',
          borderRadius: '8px'
        },
        elements: {
          formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
          card: 'bg-gray-800 border border-gray-700',
          headerTitle: 'text-white',
          headerSubtitle: 'text-gray-300',
          socialButtonsBlockButton: 'border-gray-600 hover:bg-gray-700',
          formFieldInput: 'bg-gray-700 border-gray-600 text-white',
          footerActionLink: 'text-blue-400 hover:text-blue-300'
        }
      }}
    >
      <App />
    </ClerkProvider>
  </React.StrictMode>,
)
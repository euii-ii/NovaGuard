import React from 'react';
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn, useUser, useAuth } from '@clerk/clerk-react';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error('Missing Publishable Key');
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: '#0b48ed',
          colorBackground: '#ffffff',
          colorText: '#000000',
          colorTextSecondary: '#666666',
          colorInputBackground: '#ffffff',
          colorInputText: '#000000',
          borderRadius: '8px'
        },
        elements: {
          formButtonPrimary: {
            backgroundColor: '#0b48ed',
            '&:hover': {
              backgroundColor: '#0a3cce'
            }
          },
          card: {
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb'
          }
        }
      }}
    >
      <SignedIn>
        {children}
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </ClerkProvider>
  );
};

// Export Clerk hooks for use in components
export { useUser, useAuth };
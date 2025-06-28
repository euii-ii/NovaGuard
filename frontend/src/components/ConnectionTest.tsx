import React, { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';

export const ConnectionTest: React.FC = () => {
  const { isSignedIn, user } = useAuth();
  const { supabase, userId } = useSupabaseAuth();
  const [testResult, setTestResult] = useState<string>('');

  useEffect(() => {
    const testConnection = async () => {
      if (!isSignedIn || !userId) {
        setTestResult('❌ Not signed in to Clerk');
        return;
      }

      try {
        setTestResult('🔄 Testing Supabase connection...');
        
        // Test 1: Try to get current user from Supabase
        const { data: { user: supabaseUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          setTestResult(`❌ Supabase auth error: ${userError.message}`);
          return;
        }

        if (!supabaseUser) {
          setTestResult('⚠️ No user in Supabase session');
          return;
        }

        // Test 2: Try to query projects table
        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select('*')
          .limit(1);

        if (projectsError) {
          setTestResult(`❌ Projects query error: ${projectsError.message}`);
          return;
        }

        setTestResult(`✅ Success! Clerk user: ${user?.primaryEmailAddress?.emailAddress}, Supabase user: ${supabaseUser.id}, Projects accessible: ${projects ? 'Yes' : 'No'}`);
        
      } catch (error) {
        setTestResult(`💥 Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    if (isSignedIn) {
      // Wait a bit for the auth to settle
      const timer = setTimeout(testConnection, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSignedIn, userId, supabase, user]);

  if (!isSignedIn) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: '#2d2d30',
      color: '#cccccc',
      padding: '12px',
      borderRadius: '8px',
      border: '1px solid #3e3e42',
      maxWidth: '400px',
      fontSize: '12px',
      zIndex: 9999
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
        🔗 Clerk-Supabase Connection Test
      </div>
      <div>{testResult || '⏳ Initializing...'}</div>
    </div>
  );
};

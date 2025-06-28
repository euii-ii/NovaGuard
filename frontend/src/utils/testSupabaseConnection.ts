import { supabase } from '../lib/supabase';

export async function testSupabaseConnection() {
  try {
    console.log('🔍 Testing Supabase connection...');
    
    // Test 1: Check if we can connect to Supabase
    const { data: healthCheck, error: healthError } = await supabase
      .from('projects')
      .select('count', { count: 'exact', head: true });
    
    if (healthError) {
      console.error('❌ Supabase health check failed:', healthError);
      return {
        success: false,
        error: healthError.message,
        details: 'Failed to connect to Supabase'
      };
    }
    
    console.log('✅ Supabase connection successful');
    
    // Test 2: Check authentication status
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.warn('⚠️ Supabase auth check failed:', authError);
      return {
        success: true,
        authenticated: false,
        error: authError.message,
        details: 'Connected to Supabase but not authenticated'
      };
    }
    
    if (user) {
      console.log('✅ User authenticated in Supabase:', user.id);
      
      // Test 3: Try to query user's projects
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .limit(5);
      
      if (projectsError) {
        console.error('❌ Failed to query projects:', projectsError);
        return {
          success: true,
          authenticated: true,
          user: user,
          error: projectsError.message,
          details: 'Authenticated but failed to query projects'
        };
      }
      
      console.log(`✅ Successfully queried ${projects?.length || 0} projects`);
      
      return {
        success: true,
        authenticated: true,
        user: user,
        projectsCount: projects?.length || 0,
        details: 'Fully connected and authenticated'
      };
    } else {
      console.log('ℹ️ No user authenticated in Supabase');
      return {
        success: true,
        authenticated: false,
        details: 'Connected to Supabase but no user authenticated'
      };
    }
    
  } catch (error) {
    console.error('💥 Unexpected error testing Supabase connection:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Unexpected error occurred'
    };
  }
}

export async function testClerkSupabaseIntegration() {
  try {
    console.log('🔗 Testing Clerk-Supabase integration...');
    
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Failed to get Supabase session:', sessionError);
      return {
        success: false,
        error: sessionError.message,
        details: 'Failed to get Supabase session'
      };
    }
    
    if (!session) {
      console.log('ℹ️ No active Supabase session');
      return {
        success: true,
        hasSession: false,
        details: 'No active Supabase session'
      };
    }
    
    console.log('✅ Active Supabase session found');
    console.log('Session details:', {
      user_id: session.user?.id,
      expires_at: session.expires_at,
      token_type: session.token_type
    });
    
    return {
      success: true,
      hasSession: true,
      session: {
        user_id: session.user?.id,
        expires_at: session.expires_at,
        token_type: session.token_type
      },
      details: 'Active Supabase session with Clerk integration'
    };
    
  } catch (error) {
    console.error('💥 Unexpected error testing Clerk-Supabase integration:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Unexpected error occurred'
    };
  }
}

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { supabase } from '../lib/supabase'

export function useSupabaseAuth() {
  const { getToken, userId, isLoaded, isSignedIn } = useAuth()
  const [isSupabaseReady, setIsSupabaseReady] = useState(false)

  useEffect(() => {
    const setSupabaseAuth = async () => {
      if (!isLoaded) return

      if (isSignedIn && userId) {
        try {
          console.log('🔐 Setting up Supabase auth for user:', userId)

          // Try to get the default JWT token from Clerk
          let token = null
          try {
            // First try to get a Supabase template token
            token = await getToken({ template: 'supabase' })
          } catch (tokenError: any) {
            if (tokenError.message?.includes('No JWT template exists')) {
              console.warn('⚠️ Supabase JWT template not configured in Clerk. Using default JWT token.')

              // Use default Clerk JWT token
              try {
                token = await getToken()
                console.log('✅ Using default Clerk JWT token for backend authentication')
              } catch (defaultTokenError) {
                console.error('❌ Failed to get default Clerk token:', defaultTokenError)
                setIsSupabaseReady(false)
                return
              }
            } else {
              throw tokenError
            }
          }

          if (token) {
            console.log('✅ Got Clerk token for backend authentication')

            // For Clerk tokens, we don't need to set a Supabase session
            // The backend will handle Clerk token validation directly
            // We'll mark as ready so the frontend can make API calls
            setIsSupabaseReady(true)

            // Optionally, try to set Supabase session if it's a Supabase-compatible token
            try {
              const { data, error } = await supabase.auth.setSession({
                access_token: token,
                refresh_token: '', // Clerk handles refresh
              })

              if (error) {
                console.log('ℹ️ Clerk token not compatible with Supabase session (expected for Clerk-only setup)')
              } else {
                console.log('✅ Supabase session also set successfully:', data.session?.user?.id)
              }
            } catch (sessionError) {
              console.log('ℹ️ Using Clerk-only authentication mode')
            }
          } else {
            console.warn('⚠️ No token received from Clerk')
            setIsSupabaseReady(false)
          }
        } catch (error) {
          console.error('💥 Error setting Supabase auth:', error)
          setIsSupabaseReady(false)
        }
      } else {
        // Sign out from Supabase when user signs out from Clerk
        try {
          await supabase.auth.signOut()
          setIsSupabaseReady(false)
        } catch (error) {
          console.error('Error signing out from Supabase:', error)
        }
      }
    }

    setSupabaseAuth()
  }, [getToken, userId, isLoaded, isSignedIn])

  return {
    supabase,
    userId,
    isSupabaseReady,
    isAuthenticated: isSignedIn && !!userId
  }
}

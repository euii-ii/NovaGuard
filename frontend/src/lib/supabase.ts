import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project-id.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database types for Flash Audit
export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  user_role: 'free' | 'premium' | 'enterprise' | 'admin'
  api_key?: string
  created_at: string
  updated_at: string
}

export interface Contract {
  id: string
  user_id: string
  contract_address: string
  contract_code: string
  protocol_type: string
  chain_id: string
  name?: string
  description?: string
  created_at: string
  updated_at: string
}

export interface AuditResult {
  id: string
  contract_id: string
  user_id: string
  audit_type: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  results?: any
  vulnerability_score?: number
  gas_optimization_score?: number
  security_score?: number
  confidence_score?: number
  analysis_duration?: number
  agent_results?: any
  created_at: string
  completed_at?: string
  contracts?: Contract
  vulnerabilities?: Vulnerability[]
}

export interface Vulnerability {
  id: string
  audit_result_id: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  line_number?: number
  code_snippet?: string
  recommendation?: string
  confidence?: number
  created_at: string
}

export interface MonitoringSession {
  id: string
  user_id: string
  contract_address: string
  chain: string
  status: 'active' | 'paused' | 'stopped'
  configuration?: any
  alerts_sent: number
  last_alert_at?: string
  created_at: string
  updated_at: string
}

export interface Workspace {
  id: string
  name: string
  description?: string
  owner_id: string
  settings?: any
  created_at: string
  updated_at: string
}

// Auth helpers
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  if (error) throw error
  return data
}

export const signUp = async (email: string, password: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  })
  if (error) throw error
  return data
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Database helpers
export const getUserProfile = async (userId: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
  return data
}

export const getUserContracts = async (userId: string, limit = 10, offset = 0): Promise<Contract[]> => {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  
  if (error) {
    console.error('Error fetching contracts:', error)
    return []
  }
  return data || []
}

export const getUserAuditResults = async (userId: string, limit = 10, offset = 0): Promise<AuditResult[]> => {
  const { data, error } = await supabase
    .from('audit_results')
    .select(`
      *,
      contracts(name, contract_address, protocol_type),
      vulnerabilities(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  
  if (error) {
    console.error('Error fetching audit results:', error)
    return []
  }
  return data || []
}

export const createContract = async (contractData: Omit<Contract, 'id' | 'created_at' | 'updated_at'>): Promise<Contract | null> => {
  const { data, error } = await supabase
    .from('contracts')
    .insert(contractData)
    .select()
    .single()
  
  if (error) {
    console.error('Error creating contract:', error)
    return null
  }
  return data
}

export const getAuditResult = async (auditId: string): Promise<AuditResult | null> => {
  const { data, error } = await supabase
    .from('audit_results')
    .select(`
      *,
      contracts(*),
      vulnerabilities(*)
    `)
    .eq('id', auditId)
    .single()
  
  if (error) {
    console.error('Error fetching audit result:', error)
    return null
  }
  return data
}

// Real-time subscriptions
export const subscribeToAuditResults = (userId: string, callback: (payload: any) => void) => {
  return supabase
    .channel('audit_results')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'audit_results',
      filter: `user_id=eq.${userId}`
    }, callback)
    .subscribe()
}

export const subscribeToMonitoringAlerts = (userId: string, callback: (payload: any) => void) => {
  return supabase
    .channel('monitoring_sessions')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'monitoring_sessions',
      filter: `user_id=eq.${userId}`
    }, callback)
    .subscribe()
}

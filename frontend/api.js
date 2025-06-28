import { supabase, getCurrentUser, createContract, getUserAuditResults, getAuditResult } from './src/lib/supabase';

// Get auth token for API calls
const getAuthToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
};

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function uploadContract({ contract_address, contract_code,
      protocol_type, chain_id, name, description }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Create contract using Supabase
    const contractData = {
      user_id: user.id,
      contract_address: contract_address || `temp-${Date.now()}`,
      contract_code,
      protocol_type: protocol_type || 'unknown',
      chain_id: chain_id || 'ethereum',
      name: name || 'Unnamed Contract',
      description: description || ''
    };

    const contract = await createContract(contractData);
    if (!contract) {
      throw new Error('Failed to create contract');
    }

    // Start analysis via API
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE_URL}/api/contracts/upload`, {
        method: 'POST',
        headers: { 
        
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
     ,
          'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(contractData)
    });
    
    const result = await res{
      success: false,
      error: error.message
    };
  }
    return {
      success: true,
      contract,
      audit: result.data?.audit
    };
  } catch (error) {
    console.error('Upload contract error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export async function scanContract(contractId) {
  try {
    const token = await getAuthToken();
    try {
    const token = await getAuthToken();
    try {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE_URL}/api/contracts/${contractId}/scan`, {
        method: 'POST',,
      headers: {
        'Authorization': `Bearer ${token}`
      }
          headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return await res.json();
    } catch (error) {
    console.error('Get audit results error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// New Supabase-native functions
export async function getUserContracts(limit = 10, offset = 0) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Get user contracts error:', error);
    return { success: false, error: error.message };
  }
}

export async function getUserAudits(limit = 10, offset = 0) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const audits = await getUserAuditResults(user.id, limit, offset);
    return { success: true, data: audits };
  } catch (error) {
    console.error('Get user audits error:', error);
    return { success: false, error: error.message };
  }
}

export async function performMultiAgentAnalysis(contract_code, analysis_type = 'comprehensive') {
  try {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE_URL}/api/ai/multi-agent-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ contract_code, analysis_type })
    });
    
    return await res.json();
  } catch (error) {
    console.error('Multi-agent analysis error:', error);
    return {
      success: false,
      error: error.message
    };
  }
} catch (error) {
    console.error('Scan contract error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export async function getAuditResults(contractId) {
  try {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE_URL}/api/contracts/${contractId}/results`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return await res.json();
  } catch (error) {
    console.error('Get audit results error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// New Supabase-native functions
export async function getUserContracts(limit = 10, offset = 0) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Get user contracts error:', error);
    return { success: false, error: error.message };
  }
}

export async function getUserAudits(limit = 10, offset = 0) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const audits = await getUserAuditResults(user.id, limit, offset);
    return { success: true, data: audits };
  } catch (error) {
    console.error('Get user audits error:', error);
    return { success: false, error: error.message };
  }
}

export async function performMultiAgentAnalysis(contract_code, analysis_type = 'comprehensive') {
  try {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE_URL}/api/ai/multi-agent-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ contract_code, analysis_type })
    });
    
    return await res.json();
  } catch (error) {
    console.error('Multi-agent analysis error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

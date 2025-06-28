const { supabaseAdmin, supabaseClient } = require('../config/supabase');
const logger = require('../utils/logger');

class SupabaseService {
  constructor() {
    this.admin = supabaseAdmin;
    this.client = supabaseClient;
  }

  // User management
  async createUser(userData) {
    try {
      const { data, error } = await this.admin
        .from('users')
        .insert(userData)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error creating user:', error);
      return { success: false, error: error.message };
    }
  }

  async getUser(userId) {
    try {
      const { data, error } = await this.admin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error getting user:', error);
      return { success: false, error: error.message };
    }
  }

  async updateUser(userId, updates) {
    try {
      const { data, error } = await this.admin
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error updating user:', error);
      return { success: false, error: error.message };
    }
  }

  // Contract management
  async createContract(contractData) {
    try {
      const { data, error } = await this.admin
        .from('contracts')
        .insert(contractData)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error creating contract:', error);
      return { success: false, error: error.message };
    }
  }

  async getContract(contractId) {
    try {
      const { data, error } = await this.admin
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error getting contract:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserContracts(userId, limit = 10, offset = 0) {
    try {
      const { data, error } = await this.admin
        .from('contracts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error getting user contracts:', error);
      return { success: false, error: error.message };
    }
  }

  // Audit results management
  async createAuditResult(auditData) {
    try {
      const { data, error } = await this.admin
        .from('audit_results')
        .insert(auditData)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error creating audit result:', error);
      return { success: false, error: error.message };
    }
  }

  async updateAuditResult(auditId, updates) {
    try {
      const { data, error } = await this.admin
        .from('audit_results')
        .update(updates)
        .eq('id', auditId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error updating audit result:', error);
      return { success: false, error: error.message };
    }
  }

  async getAuditResult(auditId) {
    try {
      const { data, error } = await this.admin
        .from('audit_results')
        .select(`
          *,
          contracts(*),
          vulnerabilities(*)
        `)
        .eq('id', auditId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error getting audit result:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserAuditResults(userId, limit = 10, offset = 0) {
    try {
      const { data, error } = await this.admin
        .from('audit_results')
        .select(`
          *,
          contracts(name, contract_address, protocol_type)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error getting user audit results:', error);
      return { success: false, error: error.message };
    }
  }

  // Vulnerability management
  async createVulnerabilities(vulnerabilities) {
    try {
      const { data, error } = await this.admin
        .from('vulnerabilities')
        .insert(vulnerabilities)
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error creating vulnerabilities:', error);
      return { success: false, error: error.message };
    }
  }

  async getVulnerabilitiesByAudit(auditId) {
    try {
      const { data, error } = await this.admin
        .from('vulnerabilities')
        .select('*')
        .eq('audit_result_id', auditId)
        .order('severity', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error getting vulnerabilities:', error);
      return { success: false, error: error.message };
    }
  }

  // Monitoring sessions management
  async createMonitoringSession(sessionData) {
    try {
      const { data, error } = await this.admin
        .from('monitoring_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error creating monitoring session:', error);
      return { success: false, error: error.message };
    }
  }

  async updateMonitoringSession(sessionId, updates) {
    try {
      const { data, error } = await this.admin
        .from('monitoring_sessions')
        .update(updates)
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error updating monitoring session:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserMonitoringSessions(userId) {
    try {
      const { data, error } = await this.admin
        .from('monitoring_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error getting monitoring sessions:', error);
      return { success: false, error: error.message };
    }
  }

  // Analytics
  async logAnalytics(analyticsData) {
    try {
      const { data, error } = await this.admin
        .from('analytics')
        .insert(analyticsData);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error logging analytics:', error);
      return { success: false, error: error.message };
    }
  }

  async getAnalytics(userId, timeFrame = '30 days') {
    try {
      const { data, error } = await this.admin
        .from('analytics')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', new Date(Date.now() - this.getTimeFrameMs(timeFrame)).toISOString())
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error getting analytics:', error);
      return { success: false, error: error.message };
    }
  }

  // API usage tracking
  async logApiUsage(usageData) {
    try {
      const { data, error } = await this.admin
        .from('api_usage')
        .insert(usageData);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error logging API usage:', error);
      return { success: false, error: error.message };
    }
  }

  async getApiUsage(userId, timeFrame = '30 days') {
    try {
      const { data, error } = await this.admin
        .from('api_usage')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', new Date(Date.now() - this.getTimeFrameMs(timeFrame)).toISOString())
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error getting API usage:', error);
      return { success: false, error: error.message };
    }
  }

  // Workspace management
  async createWorkspace(workspaceData) {
    try {
      const { data, error } = await this.admin
        .from('workspaces')
        .insert(workspaceData)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error creating workspace:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserWorkspaces(userId) {
    try {
      const { data, error } = await this.admin
        .from('workspaces')
        .select(`
          *,
          workspace_members!inner(user_id, role)
        `)
        .eq('workspace_members.user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error getting user workspaces:', error);
      return { success: false, error: error.message };
    }
  }

  // Utility methods
  getTimeFrameMs(timeFrame) {
    const timeFrameMap = {
      '24 hours': 24 * 60 * 60 * 1000,
      '7 days': 7 * 24 * 60 * 60 * 1000,
      '30 days': 30 * 24 * 60 * 60 * 1000,
      '90 days': 90 * 24 * 60 * 60 * 1000,
    };
    return timeFrameMap[timeFrame] || timeFrameMap['30 days'];
  }

  // Real-time subscriptions
  subscribeToAuditResults(userId, callback) {
    return this.client
      .channel('audit_results')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'audit_results',
        filter: `user_id=eq.${userId}`
      }, callback)
      .subscribe();
  }

  subscribeToMonitoringAlerts(userId, callback) {
    return this.client
      .channel('monitoring_sessions')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'monitoring_sessions',
        filter: `user_id=eq.${userId}`
      }, callback)
      .subscribe();
  }
}

module.exports = new SupabaseService();
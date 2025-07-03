// Enhanced Analytics Dashboard Service - migrated from backend
const { withAuth } = require('../middleware/auth');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin;
if (supabaseUrl && supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// CORS headers helper
const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
};

// Analytics Service Class (migrated from backend)
class AnalyticsService {
  constructor() {
    this.timeRanges = ['1h', '24h', '7d', '30d', '90d', '1y'];
  }

  // Get user dashboard analytics (from backend)
  async getUserDashboard(userId, timeRange = '7d') {
    try {
      if (!supabaseAdmin) {
        return { success: false, error: 'Database not configured' };
      }

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '1h':
          startDate.setHours(endDate.getHours() - 1);
          break;
        case '24h':
          startDate.setDate(endDate.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 7);
      }

      // Get audit statistics
      const { data: audits } = await supabaseAdmin
        .from('audit_reports')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Get project statistics
      const { data: projects } = await supabaseAdmin
        .from('projects')
        .select('*')
        .eq('owner_id', userId);

      // Get monitoring sessions
      const { data: monitoringSessions } = await supabaseAdmin
        .from('monitoring_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString());

      // Calculate metrics
      const dashboard = {
        timeRange: timeRange,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        
        // Audit metrics
        audits: {
          total: audits?.length || 0,
          successful: audits?.filter(a => a.audit_report?.security?.score >= 70).length || 0,
          failed: audits?.filter(a => a.audit_report?.security?.score < 70).length || 0,
          averageScore: audits?.length > 0 ? 
            audits.reduce((sum, a) => sum + (a.audit_report?.security?.score || 0), 0) / audits.length : 0,
          riskDistribution: {
            Low: audits?.filter(a => a.risk_level === 'Low').length || 0,
            Medium: audits?.filter(a => a.risk_level === 'Medium').length || 0,
            High: audits?.filter(a => a.risk_level === 'High').length || 0,
            Critical: audits?.filter(a => a.risk_level === 'Critical').length || 0
          },
          vulnerabilities: {
            total: audits?.reduce((sum, a) => sum + (a.vulnerabilities_count || 0), 0) || 0,
            critical: audits?.reduce((sum, a) => sum + (a.audit_report?.security?.criticalCount || 0), 0) || 0,
            high: audits?.reduce((sum, a) => sum + (a.audit_report?.security?.highCount || 0), 0) || 0,
            medium: audits?.reduce((sum, a) => sum + (a.audit_report?.security?.mediumCount || 0), 0) || 0,
            low: audits?.reduce((sum, a) => sum + (a.audit_report?.security?.lowCount || 0), 0) || 0
          }
        },
        
        // Project metrics
        projects: {
          total: projects?.length || 0,
          active: projects?.filter(p => p.status !== 'archived').length || 0,
          byType: {},
          byStatus: {},
          totalContracts: projects?.reduce((sum, p) => sum + (p.contracts?.length || 0), 0) || 0
        },
        
        // Monitoring metrics
        monitoring: {
          activeSessions: monitoringSessions?.filter(s => s.status === 'active').length || 0,
          totalSessions: monitoringSessions?.length || 0,
          contractsMonitored: new Set(monitoringSessions?.map(s => s.contract_address) || []).size,
          alertsTriggered: monitoringSessions?.reduce((sum, s) => sum + (s.alerts_count || 0), 0) || 0
        },
        
        // Performance metrics
        performance: {
          averageAuditTime: audits?.length > 0 ? 
            audits.reduce((sum, a) => sum + (a.execution_time || 0), 0) / audits.length : 0,
          totalAuditTime: audits?.reduce((sum, a) => sum + (a.execution_time || 0), 0) || 0,
          successRate: audits?.length > 0 ? 
            (audits.filter(a => a.audit_report?.security?.score >= 70).length / audits.length) * 100 : 0
        },
        
        generatedAt: new Date().toISOString()
      };

      // Calculate project distribution
      projects?.forEach(project => {
        dashboard.projects.byType[project.type] = (dashboard.projects.byType[project.type] || 0) + 1;
        dashboard.projects.byStatus[project.status] = (dashboard.projects.byStatus[project.status] || 0) + 1;
      });

      return {
        success: true,
        dashboard: dashboard
      };

    } catch (error) {
      console.error('Error getting user dashboard:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Get audit trends (from backend)
  async getAuditTrends(userId, timeRange = '30d', granularity = 'day') {
    try {
      if (!supabaseAdmin) {
        return { success: false, error: 'Database not configured' };
      }

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '24h':
          startDate.setDate(endDate.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      // Get audit data
      const { data: audits } = await supabaseAdmin
        .from('audit_reports')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      // Group data by time period
      const trends = {};
      const format = granularity === 'hour' ? 'YYYY-MM-DD HH:00' : 'YYYY-MM-DD';
      
      audits?.forEach(audit => {
        const date = new Date(audit.created_at);
        let key;
        
        if (granularity === 'hour') {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        }
        
        if (!trends[key]) {
          trends[key] = {
            date: key,
            audits: 0,
            averageScore: 0,
            vulnerabilities: 0,
            scores: []
          };
        }
        
        trends[key].audits++;
        trends[key].vulnerabilities += audit.vulnerabilities_count || 0;
        trends[key].scores.push(audit.audit_report?.security?.score || 0);
      });

      // Calculate averages
      Object.values(trends).forEach(trend => {
        if (trend.scores.length > 0) {
          trend.averageScore = trend.scores.reduce((sum, score) => sum + score, 0) / trend.scores.length;
        }
        delete trend.scores; // Remove raw scores from response
      });

      return {
        success: true,
        trends: Object.values(trends),
        timeRange: timeRange,
        granularity: granularity,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      };

    } catch (error) {
      console.error('Error getting audit trends:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Get vulnerability analysis (from backend)
  async getVulnerabilityAnalysis(userId, timeRange = '30d') {
    try {
      if (!supabaseAdmin) {
        return { success: false, error: 'Database not configured' };
      }

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      // Get audit data with vulnerabilities
      const { data: audits } = await supabaseAdmin
        .from('audit_reports')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Analyze vulnerabilities
      const vulnerabilityStats = {
        total: 0,
        byCategory: {},
        bySeverity: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        },
        topVulnerabilities: {},
        trends: {},
        mostCommon: []
      };

      audits?.forEach(audit => {
        const vulnerabilities = audit.audit_report?.security?.vulnerabilities || [];
        
        vulnerabilities.forEach(vuln => {
          vulnerabilityStats.total++;
          
          // Count by category
          const category = vuln.category || 'other';
          vulnerabilityStats.byCategory[category] = (vulnerabilityStats.byCategory[category] || 0) + 1;
          
          // Count by severity
          const severity = vuln.severity || 'low';
          vulnerabilityStats.bySeverity[severity] = (vulnerabilityStats.bySeverity[severity] || 0) + 1;
          
          // Count specific vulnerabilities
          const vulnName = vuln.name || 'Unknown';
          vulnerabilityStats.topVulnerabilities[vulnName] = (vulnerabilityStats.topVulnerabilities[vulnName] || 0) + 1;
        });
      });

      // Get most common vulnerabilities
      vulnerabilityStats.mostCommon = Object.entries(vulnerabilityStats.topVulnerabilities)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));

      return {
        success: true,
        vulnerabilityAnalysis: vulnerabilityStats,
        timeRange: timeRange,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        totalAudits: audits?.length || 0
      };

    } catch (error) {
      console.error('Error getting vulnerability analysis:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Get system-wide analytics (admin only)
  async getSystemAnalytics(timeRange = '30d') {
    try {
      if (!supabaseAdmin) {
        return { success: false, error: 'Database not configured' };
      }

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      // Get system-wide statistics
      const [
        { count: totalUsers },
        { count: totalAudits },
        { count: totalProjects },
        { count: totalMonitoringSessions }
      ] = await Promise.all([
        supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('audit_reports').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('projects').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('monitoring_sessions').select('*', { count: 'exact', head: true })
      ]);

      // Get recent activity
      const { data: recentAudits } = await supabaseAdmin
        .from('audit_reports')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      const systemAnalytics = {
        overview: {
          totalUsers: totalUsers || 0,
          totalAudits: totalAudits || 0,
          totalProjects: totalProjects || 0,
          totalMonitoringSessions: totalMonitoringSessions || 0,
          activeUsers: new Set(recentAudits?.map(a => a.user_id) || []).size,
          averageAuditsPerUser: totalUsers > 0 ? Math.round((totalAudits || 0) / totalUsers) : 0
        },
        
        activity: {
          auditsInPeriod: recentAudits?.length || 0,
          averageAuditScore: recentAudits?.length > 0 ? 
            recentAudits.reduce((sum, a) => sum + (a.audit_report?.security?.score || 0), 0) / recentAudits.length : 0,
          totalVulnerabilities: recentAudits?.reduce((sum, a) => sum + (a.vulnerabilities_count || 0), 0) || 0
        },
        
        timeRange: timeRange,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        generatedAt: new Date().toISOString()
      };

      return {
        success: true,
        systemAnalytics: systemAnalytics
      };

    } catch (error) {
      console.error('Error getting system analytics:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Serverless function handler
const analyticsHandler = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, email } = req.auth;

  try {
    const analyticsService = new AnalyticsService();
    const { action, timeRange, granularity } = req.query;

    switch (action) {
      case 'dashboard':
        console.log(`Dashboard analytics request from user: ${email} (${userId})`);
        const dashboard = await analyticsService.getUserDashboard(userId, timeRange || '7d');
        
        dashboard.metadata = {
          userId,
          userEmail: email,
          timestamp: new Date().toISOString()
        };
        
        res.status(200).json(dashboard);
        break;

      case 'trends':
        console.log(`Audit trends request from user: ${email} (${userId})`);
        const trends = await analyticsService.getAuditTrends(userId, timeRange || '30d', granularity || 'day');
        
        trends.metadata = {
          userId,
          userEmail: email,
          timestamp: new Date().toISOString()
        };
        
        res.status(200).json(trends);
        break;

      case 'vulnerabilities':
        console.log(`Vulnerability analysis request from user: ${email} (${userId})`);
        const vulnerabilities = await analyticsService.getVulnerabilityAnalysis(userId, timeRange || '30d');
        
        vulnerabilities.metadata = {
          userId,
          userEmail: email,
          timestamp: new Date().toISOString()
        };
        
        res.status(200).json(vulnerabilities);
        break;

      case 'system':
        // Note: In production, add admin role check here
        console.log(`System analytics request from user: ${email} (${userId})`);
        const systemAnalytics = await analyticsService.getSystemAnalytics(timeRange || '30d');
        
        systemAnalytics.metadata = {
          userId,
          userEmail: email,
          timestamp: new Date().toISOString()
        };
        
        res.status(200).json(systemAnalytics);
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action. Supported actions: dashboard, trends, vulnerabilities, system'
        });
    }
  } catch (error) {
    console.error('Analytics service error:', error);
    res.status(500).json({
      success: false,
      error: 'Analytics service failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Export with Clerk authentication middleware
module.exports = withAuth(analyticsHandler);

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AuditRequest {
  contractCode: string;
  chain: string;
  contractAddress?: string;
  analysisMode?: string;
  agents?: string[];
}

interface LLMResponse {
  vulnerabilities: any[];
  securityScore: number;
  riskCategory: {
    label: string;
    justification: string;
  };
  codeInsights: {
    gasOptimizationTips: string[];
    antiPatternNotices: string[];
    dangerousUsage: string[];
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid authentication token')
    }

    const { contractCode, chain, contractAddress, analysisMode = 'comprehensive', agents = ['security', 'quality'] }: AuditRequest = await req.json()

    if (!contractCode) {
      throw new Error('Contract code is required')
    }

    // Generate audit ID
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

    // Log audit request
    const { error: logError } = await supabaseClient
      .from('audit_logs')
      .insert({
        audit_id: auditId,
        user_id: user.id,
        contract_code: contractCode,
        chain: chain || 'ethereum',
        analysis_mode: analysisMode,
        status: 'in_progress'
      })

    if (logError) {
      console.error('Failed to log audit request:', logError)
    }

    // Call OpenRouter API for LLM analysis
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://flash-audit.com',
        'X-Title': 'Flash-Audit'
      },
      body: JSON.stringify({
        model: agents.includes('security') ? 'moonshotai/kimi-dev-72b:free' : 'google/gemma-3n-e4b-it:free',
        messages: [
          {
            role: 'system',
            content: `You are a smart contract security auditor. Analyze the provided Solidity code and return ONLY a JSON response with this exact structure:
{
  "vulnerabilities": [
    {
      "name": "Vulnerability Name",
      "affectedLines": "line numbers",
      "description": "Description of the vulnerability",
      "severity": "high|medium|low",
      "fixSuggestion": "How to fix this issue"
    }
  ],
  "securityScore": 85,
  "riskCategory": {
    "label": "medium",
    "justification": "Explanation of risk level"
  },
  "codeInsights": {
    "gasOptimizationTips": ["Tip 1", "Tip 2"],
    "antiPatternNotices": ["Pattern 1", "Pattern 2"],
    "dangerousUsage": ["Usage 1", "Usage 2"]
  }
}`
          },
          {
            role: 'user',
            content: `Analyze this ${chain} smart contract:\n\n${contractCode}`
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      })
    })

    if (!openRouterResponse.ok) {
      throw new Error(`OpenRouter API error: ${openRouterResponse.statusText}`)
    }

    const llmResult = await openRouterResponse.json()
    let analysisResult: LLMResponse

    try {
      // Parse the LLM response
      const content = llmResult.choices[0]?.message?.content
      if (!content) {
        throw new Error('No content in LLM response')
      }

      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response')
      }

      analysisResult = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Failed to parse LLM response:', parseError)
      // Fallback response
      analysisResult = {
        vulnerabilities: [],
        securityScore: 50,
        riskCategory: {
          label: 'unknown',
          justification: 'Analysis failed to complete'
        },
        codeInsights: {
          gasOptimizationTips: [],
          antiPatternNotices: [],
          dangerousUsage: []
        }
      }
    }

    // Save audit results
    const { error: saveError } = await supabaseClient
      .from('audit_reports')
      .insert({
        audit_id: auditId,
        user_id: user.id,
        contract_code: contractCode,
        audit_report: analysisResult,
        security_score: analysisResult.securityScore,
        risk_level: analysisResult.riskCategory.label,
        vulnerabilities_count: analysisResult.vulnerabilities.length
      })

    if (saveError) {
      console.error('Failed to save audit results:', saveError)
    }

    // Update audit log status
    await supabaseClient
      .from('audit_logs')
      .update({
        status: 'completed',
        result: analysisResult,
        security_score: analysisResult.securityScore,
        risk_level: analysisResult.riskCategory.label,
        vulnerabilities_count: analysisResult.vulnerabilities.length,
        completed_at: new Date().toISOString()
      })
      .eq('audit_id', auditId)

    return new Response(
      JSON.stringify({
        success: true,
        auditId,
        ...analysisResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Audit function error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/').filter(Boolean)
    const projectId = pathSegments[pathSegments.length - 1]

    switch (req.method) {
      case 'GET':
        if (projectId && projectId !== 'projects') {
          // Get specific project
          const { data: project, error } = await supabaseClient
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .eq('user_id', user.id)
            .single()

          if (error) {
            throw new Error(`Failed to fetch project: ${error.message}`)
          }

          return new Response(
            JSON.stringify({
              success: true,
              data: project
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            },
          )
        } else {
          // Get all projects for user
          const { data: projects, error } = await supabaseClient
            .from('projects')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })

          if (error) {
            throw new Error(`Failed to fetch projects: ${error.message}`)
          }

          return new Response(
            JSON.stringify({
              success: true,
              data: projects || []
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            },
          )
        }

      case 'POST':
        // Create new project
        const createData = await req.json()
        
        const { data: newProject, error: createError } = await supabaseClient
          .from('projects')
          .insert({
            name: createData.name,
            description: createData.description,
            user_id: user.id,
            type: createData.type || 'contract',
            project_data: {
              template: createData.template,
              network: createData.network,
              contract_code: createData.contract_code,
              files: createData.files || {},
              ...createData.project_data
            }
          })
          .select()
          .single()

        if (createError) {
          throw new Error(`Failed to create project: ${createError.message}`)
        }

        return new Response(
          JSON.stringify({
            success: true,
            data: newProject
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 201,
          },
        )

      case 'PUT':
        // Update project
        if (!projectId || projectId === 'projects') {
          throw new Error('Project ID is required for updates')
        }

        const updateData = await req.json()
        
        const { data: updatedProject, error: updateError } = await supabaseClient
          .from('projects')
          .update({
            name: updateData.name,
            description: updateData.description,
            project_data: updateData.project_data,
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId)
          .eq('user_id', user.id)
          .select()
          .single()

        if (updateError) {
          throw new Error(`Failed to update project: ${updateError.message}`)
        }

        return new Response(
          JSON.stringify({
            success: true,
            data: updatedProject
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        )

      case 'DELETE':
        // Delete project
        if (!projectId || projectId === 'projects') {
          throw new Error('Project ID is required for deletion')
        }

        const { error: deleteError } = await supabaseClient
          .from('projects')
          .delete()
          .eq('id', projectId)
          .eq('user_id', user.id)

        if (deleteError) {
          throw new Error(`Failed to delete project: ${deleteError.message}`)
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Project deleted successfully'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        )

      default:
        throw new Error(`Method ${req.method} not allowed`)
    }

  } catch (error) {
    console.error('Projects function error:', error)
    
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

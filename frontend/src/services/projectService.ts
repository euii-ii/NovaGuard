// Project interface for frontend use
export interface Project {
  id: string
  name: string
  description?: string
  template: string
  network: string
  contract_code?: string
  contract_address?: string
  user_id: string
  created_at: string
  updated_at: string
}

export class ProjectService {
  private static API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002'

  // Helper method to get Clerk auth headers
  private static async getAuthHeaders(getToken?: () => Promise<string | null>): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (getToken) {
      try {
        // Try to get the default Clerk JWT token
        const token = await getToken()
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
      } catch (error) {
        console.warn('Failed to get Clerk token:', error)
      }
    }

    return headers
  }

  static async createProject(
    projectData: {
      name: string
      description?: string
      template: string
      network: string
      contract_code?: string
    },
    userId: string,
    getToken?: () => Promise<string | null>
  ): Promise<Project | null> {
    try {
      // For now, let's try the contract endpoint without authentication to test the flow
      const contractCode = projectData.contract_code || `// ${projectData.name} - ${projectData.template} template
// Network: ${projectData.network}

pragma solidity ^0.8.0;

contract ${projectData.name.replace(/\s+/g, '')} {
    // TODO: Implement contract logic
    string public name = "${projectData.name}";

    constructor() {
        // Initialize contract
    }
}`;

      const headers = await this.getAuthHeaders(getToken)

      console.log('Creating project with data:', projectData)
      console.log('Using API URL:', `${this.API_BASE_URL}/api/audit/contract`)

      const response = await fetch(`${this.API_BASE_URL}/api/audit/contract`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: projectData.name,
          description: projectData.description,
          template: projectData.template,
          network: projectData.network,
          contract_code: contractCode,
          user_id: userId
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Failed to create project:', response.statusText, errorText)
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('Project creation response:', result)

      if (result.success && result.data) {
        // Return the project data from the backend response
        return result.data
      }

      throw new Error(result.error || 'Unknown error occurred')
    } catch (error) {
      console.error('Error creating project:', error)
      throw error
    }
  }

  static async getUserProjects(userId: string, getToken?: () => Promise<string | null>): Promise<Project[]> {
    try {
      const headers = await this.getAuthHeaders(getToken)

      // Get user's audit history which contains their contracts/projects
      const response = await fetch(`${this.API_BASE_URL}/api/audit/history?limit=50`, {
        method: 'GET',
        headers
      })

      if (!response.ok) {
        console.warn('Backend API not available, will use demo data')
        throw new Error('API not available')
      }

      const result = await response.json()

      if (result.success && result.data) {
        // Transform audit results to Project format
        return result.data.map((audit: any) => ({
          id: audit.id,
          name: audit.contract_name || `Contract ${audit.id.slice(0, 8)}`,
          description: audit.description || 'Smart contract project',
          template: 'custom',
          network: audit.chain || 'ethereum',
          contract_code: audit.contract_code,
          contract_address: audit.contract_address,
          user_id: userId,
          created_at: audit.created_at,
          updated_at: audit.updated_at || audit.created_at
        }))
      }

      return []
    } catch (error) {
      console.warn('Error fetching projects, backend not available:', error)
      // Throw error so App.tsx can handle with demo data
      throw error
    }
  }

  static async updateProject(projectId: string, updates: Partial<Project>): Promise<Project | null> {
    try {
      // For now, we'll just return the updated project data
      // In a full implementation, you'd call a backend update endpoint
      console.log('Project update requested:', projectId, updates)
      return null
    } catch (error) {
      console.error('Error updating project:', error)
      return null
    }
  }

  static async deleteProject(projectId: string): Promise<boolean> {
    try {
      // For now, we'll just log the delete request
      // In a full implementation, you'd call a backend delete endpoint
      console.log('Project delete requested:', projectId)
      return false
    } catch (error) {
      console.error('Error deleting project:', error)
      return false
    }
  }

  static async getProject(projectId: string, getToken?: () => Promise<string | null>): Promise<Project | null> {
    try {
      const headers = await this.getAuthHeaders(getToken)

      // Get specific audit result
      const response = await fetch(`${this.API_BASE_URL}/api/audit/results/${projectId}`, {
        method: 'GET',
        headers
      })

      if (!response.ok) {
        console.error('Failed to fetch project:', response.statusText)
        return null
      }

      const result = await response.json()

      if (result.success && result.data) {
        // Transform audit result to Project format
        return {
          id: result.data.id,
          name: result.data.contract_name || `Contract ${result.data.id.slice(0, 8)}`,
          description: result.data.description || 'Smart contract project',
          template: 'custom',
          network: result.data.chain || 'ethereum',
          contract_code: result.data.contract_code,
          contract_address: result.data.contract_address,
          user_id: result.data.user_id,
          created_at: result.data.created_at,
          updated_at: result.data.updated_at || result.data.created_at
        }
      }

      return null
    } catch (error) {
      console.error('Error fetching project:', error)
      return null
    }
  }
}

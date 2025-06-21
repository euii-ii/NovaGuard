module.exports = {
  initialize: jest.fn().mockResolvedValue(true),
  createWorkspace: jest.fn().mockResolvedValue({
    workspaceId: 'test-workspace',
    name: 'Test Workspace'
  }),
  analyzeCode: jest.fn().mockResolvedValue({
    analysisId: 'test-analysis',
    instant: {
      syntaxValidation: { isValid: true, errors: [], warnings: [] }
    }
  }),
  getStatus: jest.fn().mockReturnValue({
    activeWorkspaces: 0,
    activeSessions: 0,
    totalProjects: 0,
    pluginStatus: { installed: true }
  })
};
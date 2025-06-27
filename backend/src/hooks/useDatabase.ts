export function useDatabase() {
  return {
    isInitialized: true,
    dbUser: null,
    error: null,
    createVulnerabilityScan: () => {},
    getUserVulnerabilityScans: () => [],
    updateScanProgress: () => {},
    completeScan: () => {},
    createProject: () => {},
    getUserProjects: () => [],
    updateProject: () => {},
    createConnection: () => {},
    getUserConnections: () => [],
    clearError: () => {},
  };
}

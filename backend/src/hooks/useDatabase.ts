// Minimal placeholder for useDatabase hook
// This prevents import errors in the frontend until you implement real DB logic

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

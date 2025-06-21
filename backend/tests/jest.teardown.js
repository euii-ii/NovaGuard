// Jest teardown to cleanup services after all tests
module.exports = async () => {
  console.log('Running Jest teardown...');

  const servicesToCleanup = [
    'instantFeedbackService',
    'chainIDEIntegrationService',
    'realTimeDevelopmentService',
    'teamCollaborationService',
    'realTimeMonitoringService'
  ];

  for (const serviceName of servicesToCleanup) {
    try {
      const service = require(`../src/services/${serviceName}`);
      if (service && typeof service.cleanup === 'function') {
        console.log(`Cleaning up ${serviceName}...`);
        await service.cleanup();
      }
      // Remove all listeners if it's an EventEmitter
      if (service && typeof service.removeAllListeners === 'function') {
        service.removeAllListeners();
      }
    } catch (error) {
      // Service might not exist or have cleanup method, ignore
      console.log(`Could not cleanup ${serviceName}: ${error.message}`);
    }
  }

  // Clear any remaining timers
  if (typeof global.clearAllTimers === 'function') {
    global.clearAllTimers();
  }

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  console.log('Jest teardown complete');
};
// Jest teardown to cleanup services after all tests
module.exports = async () => {
  console.log('Running Jest teardown...');
  
  const servicesToCleanup = [
    'instantFeedbackService',
    'chainIDEIntegrationService',
    'realTimeDevelopmentService',
    'teamCollaborationService'
  ];

  for (const serviceName of servicesToCleanup) {
    try {
      const service = require(`../src/services/${serviceName}`);
      if (service && typeof service.cleanup === 'function') {
        console.log(`Cleaning up ${serviceName}...`);
        service.cleanup();
      }
    } catch (error) {
      // Service might not exist or have cleanup method, ignore
      console.log(`Could not cleanup ${serviceName}: ${error.message}`);
    }
  }

  console.log('Jest teardown complete');
};
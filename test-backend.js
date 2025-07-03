// Test script to verify backend connectivity
const testBackend = async () => {
  try {
    console.log('Testing backend connectivity...');
    
    // Test health endpoint
    const healthResponse = await fetch('http://localhost:3001/health');
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    
    // Test audit endpoint with mock data
    const auditResponse = await fetch('http://localhost:3001/functions/v1/audit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        contractAddress: '0x1234567890123456789012345678901234567890',
        chain: 'ethereum',
        name: 'Test Contract',
        description: 'Test audit'
      })
    });
    
    if (auditResponse.ok) {
      const auditData = await auditResponse.json();
      console.log('✅ Audit endpoint working:', auditData.success);
    } else {
      console.log('❌ Audit endpoint failed:', auditResponse.status);
    }
    
    // Test projects endpoint
    const projectsResponse = await fetch('http://localhost:3001/functions/v1/projects', {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    if (projectsResponse.ok) {
      const projectsData = await projectsResponse.json();
      console.log('✅ Projects endpoint working, found:', projectsData.length, 'projects');
    } else {
      console.log('❌ Projects endpoint failed:', projectsResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Backend test failed:', error.message);
  }
};

// Run the test
testBackend();

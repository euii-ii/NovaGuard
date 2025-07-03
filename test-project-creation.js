// Test script to verify project creation functionality
const testProjectCreation = async () => {
  try {
    console.log('Testing project creation...');
    
    // Test project creation
    const projectResponse = await fetch('http://localhost:3001/functions/v1/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        name: 'Test Project',
        description: 'A test project for verification',
        type: 'contract',
        template: 'hello-world',
        network: 'ethereum',
        contract_code: 'pragma solidity ^0.8.0; contract Test { }',
        project_data: {
          template: 'hello-world',
          category: 'Basic',
          network: 'ethereum'
        }
      })
    });
    
    if (projectResponse.ok) {
      const projectData = await projectResponse.json();
      console.log('✅ Project creation working:', projectData.success);
      console.log('Project ID:', projectData.project?.id);
      
      // Test getting projects list
      const listResponse = await fetch('http://localhost:3001/functions/v1/projects', {
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });
      
      if (listResponse.ok) {
        const listData = await listResponse.json();
        console.log('✅ Projects list working, found:', listData.length, 'projects');
      } else {
        console.log('❌ Projects list failed:', listResponse.status);
      }
      
    } else {
      const errorData = await projectResponse.json();
      console.log('❌ Project creation failed:', projectResponse.status, errorData);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Run the test
testProjectCreation();

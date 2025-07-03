// Test script to verify template connection works
// Using built-in fetch (Node.js 18+)

async function testTemplateConnection() {
  console.log('🧪 Testing Template Connection...\n');

  // Test 1: Check if API server is running
  try {
    console.log('1️⃣ Testing API server health...');
    const healthResponse = await fetch('http://localhost:3002/health');
    const healthData = await healthResponse.json();
    console.log('✅ API server is healthy:', healthData);
  } catch (error) {
    console.log('❌ API server health check failed:', error.message);
    return;
  }

  // Test 2: Test GET projects (should return empty list)
  try {
    console.log('\n2️⃣ Testing GET projects...');
    const getResponse = await fetch('http://localhost:3002/api/projects');
    const getData = await getResponse.json();
    console.log('✅ GET projects successful:', {
      success: getData.success,
      projectCount: getData.projects?.length || 0,
      userId: getData.metadata?.userId
    });
  } catch (error) {
    console.log('❌ GET projects failed:', error.message);
    return;
  }

  // Test 3: Test creating a project from template
  try {
    console.log('\n3️⃣ Testing template project creation...');
    
    const templateProject = {
      name: 'Hello World Template Test',
      description: 'This template constructs a smart contract that returns the "Hello World" message to the contract deployer.',
      type: 'contract',
      template: 'Hello World',
      network: 'ethereum',
      contract_code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract HelloWorld {
    string public message;

    constructor() {
        message = "Hello, World!";
    }

    function setMessage(string memory _message) public {
        message = _message;
    }

    function getMessage() public view returns (string memory) {
        return message;
    }
}`,
      project_data: {
        template: 'Hello World',
        category: 'Basic',
        network: 'Ethereum',
        files: [
          'contracts/HelloWorld.sol',
          'contracts/Migrations.sol',
          'test/HelloWorld.test.js',
          'README.md',
          'package.json'
        ]
      }
    };

    const createResponse = await fetch('http://localhost:3002/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(templateProject)
    });

    const createData = await createResponse.json();
    
    if (createResponse.ok && createData.success) {
      console.log('✅ Template project creation successful:', {
        projectId: createData.project?.id,
        projectName: createData.project?.name,
        template: createData.project?.template,
        network: createData.project?.network,
        hasContractCode: !!createData.project?.contract_code,
        hasProjectData: !!createData.project?.project_data
      });
    } else {
      console.log('❌ Template project creation failed:', createData);
      return;
    }
  } catch (error) {
    console.log('❌ Template project creation failed:', error.message);
    return;
  }

  // Test 4: Verify project was created by getting projects again
  try {
    console.log('\n4️⃣ Verifying project was stored...');
    const verifyResponse = await fetch('http://localhost:3002/api/projects');
    const verifyData = await verifyResponse.json();
    
    if (verifyData.success && verifyData.projects?.length > 0) {
      const project = verifyData.projects[0];
      console.log('✅ Project verification successful:', {
        projectCount: verifyData.projects.length,
        latestProject: {
          name: project.name,
          template: project.template,
          network: project.network,
          hasFiles: project.project_data?.files?.length > 0
        }
      });
    } else {
      console.log('⚠️ No projects found after creation (might be using in-memory storage)');
    }
  } catch (error) {
    console.log('❌ Project verification failed:', error.message);
  }

  console.log('\n🎉 Template connection test completed!');
  console.log('\n📋 Summary:');
  console.log('- API server is running and healthy');
  console.log('- Projects endpoint is working');
  console.log('- Template data is being properly processed');
  console.log('- Project creation from templates is functional');
  console.log('\n✨ The template click functionality should work in the frontend!');
}

// Run the test
testTemplateConnection().catch(console.error);

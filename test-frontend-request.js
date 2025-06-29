// Test script to simulate the exact frontend request
const testFrontendRequest = async () => {
  try {
    console.log('Testing frontend-style project creation...');
    
    // Simulate the exact request the frontend makes
    const response = await fetch('http://localhost:3001/functions/v1/projects', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-clerk-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Hello World abc123',
        description: 'A simple smart contract to get started',
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
          files: ['contracts/HelloWorld.sol', 'README.md', 'package.json']
        }
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Frontend-style request working:', result.success);
      console.log('Project created:', result.project?.name);
    } else {
      const responseText = await response.text();
      console.log('❌ Frontend-style request failed');
      console.log('Response text:', responseText.substring(0, 200) + '...');
      
      // Try to parse as JSON
      try {
        const errorData = JSON.parse(responseText);
        console.log('Error data:', errorData);
      } catch (parseError) {
        console.log('Response is not JSON, likely HTML error page');
      }
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
};

// Run the test
testFrontendRequest();

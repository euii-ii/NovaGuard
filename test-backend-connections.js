#!/usr/bin/env node

/**
 * Test script to verify all backend API connections are working
 */

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3000';

// Test endpoints
const endpoints = [
  { name: 'Health Check', method: 'GET', path: '/api/health' },
  { name: 'API v1 Health', method: 'GET', path: '/api/v1' },
  { name: 'Projects API', method: 'GET', path: '/api/v1/projects' },
  { name: 'Audit Engine', method: 'POST', path: '/api/v1/audit', body: { contractCode: 'pragma solidity ^0.8.0; contract Test {}', chain: 'ethereum' } },
];

async function testEndpoint(endpoint) {
  try {
    const options = {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (endpoint.body) {
      options.body = JSON.stringify(endpoint.body);
    }

    console.log(`Testing ${endpoint.name}...`);
    const response = await fetch(`${API_BASE_URL}${endpoint.path}`, options);
    
    const status = response.status;
    const statusText = response.statusText;
    
    let result;
    try {
      const text = await response.text();
      try {
        result = JSON.parse(text);
      } catch (e) {
        result = text;
      }
    } catch (e) {
      result = 'Unable to read response';
    }

    console.log(`✅ ${endpoint.name}: ${status} ${statusText}`);
    if (result) {
      console.log(`   Response:`, typeof result === 'string' ? result.substring(0, 100) : JSON.stringify(result, null, 2).substring(0, 200));
    }
    console.log('');
    
    return { success: response.ok, status, result };
  } catch (error) {
    console.log(`❌ ${endpoint.name}: ${error.message}`);
    console.log('');
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Testing Flash-Audit Backend Connections');
  console.log(`📍 API Base URL: ${API_BASE_URL}`);
  console.log('='.repeat(50));
  console.log('');

  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push({ ...endpoint, ...result });
  }

  console.log('📊 Test Summary:');
  console.log('='.repeat(30));
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('🎉 All backend connections are working!');
  } else {
    console.log('⚠️  Some backend connections need attention.');
    
    const failed = results.filter(r => !r.success);
    console.log('\nFailed endpoints:');
    failed.forEach(f => {
      console.log(`  - ${f.name}: ${f.error || f.status}`);
    });
  }
}

// Run the tests
runTests().catch(console.error);

const http = require('http');

const testData = JSON.stringify({
  name: 'Test Project',
  description: 'Test project description',
  template: 'basic',
  network: 'ethereum',
  user_id: 'test-user'
});

const options = {
  hostname: 'localhost',
  port: 3002,
  path: '/api/audit/contract',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(testData)
  }
};

console.log('Testing backend API...');
console.log('Request data:', testData);

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Response:', data);
    try {
      const parsed = JSON.parse(data);
      console.log('Parsed response:', parsed);
    } catch (e) {
      console.log('Failed to parse JSON response');
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(testData);
req.end();

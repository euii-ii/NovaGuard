const http = require('http');
const url = require('url');

const PORT = 3002;

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, apikey');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  console.log(`${method} ${path}`);

  // Health check endpoint
  if (path === '/health' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Minimal test server is running'
    }));
    return;
  }

  // Test endpoint
  if (path === '/api/test' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'Backend is working!',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // Project creation endpoint
  if (path === '/api/audit/contract' && method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const requestData = JSON.parse(body);
        console.log('Received project creation request:', requestData);
        
        const projectData = {
          id: 'test-project-' + Date.now(),
          name: requestData.name || 'Test Project',
          description: requestData.description || 'Test project description',
          template: requestData.template || 'basic',
          network: requestData.network || 'ethereum',
          contract_code: requestData.contract_code || '// Sample contract code',
          contract_address: null,
          user_id: requestData.user_id || 'test-user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        console.log('Returning project data:', projectData);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Project created successfully',
          data: projectData
        }));
      } catch (error) {
        console.error('Error parsing request:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body'
        }));
      }
    });
    return;
  }

  // Get user projects endpoint
  if (path === '/api/audit/history' && method === 'GET') {
    console.log('Received get projects request');
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      data: [
        {
          id: 'sample-project-1',
          name: 'Sample DeFi Project',
          description: 'A sample DeFi project',
          template: 'defi',
          network: 'ethereum',
          user_id: 'test-user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    }));
    return;
  }

  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    success: false,
    error: 'Not found'
  }));
});

server.listen(PORT, () => {
  console.log(`🚀 Minimal test server running on port ${PORT}`);
  console.log(`🌐 Environment: development`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
});

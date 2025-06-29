// Enhanced Vercel serverless function for file operations
const { withAuth } = require('../middleware/auth');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin;
if (supabaseUrl && supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// CORS headers helper
const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
};

// Mock file system operations
const mockFileSystem = {
  'contracts/': {
    type: 'directory',
    children: ['Token.sol', 'Vault.sol', 'Governance.sol']
  },
  'contracts/Token.sol': {
    type: 'file',
    content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Token {
    string public name = "Flash Token";
    string public symbol = "FLASH";
    uint256 public totalSupply = 1000000 * 10**18;
    
    mapping(address => uint256) public balanceOf;
    
    constructor() {
        balanceOf[msg.sender] = totalSupply;
    }
    
    function transfer(address to, uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}`,
    size: 512,
    lastModified: new Date().toISOString()
  },
  'contracts/Vault.sol': {
    type: 'file',
    content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Vault {
    mapping(address => uint256) public deposits;
    
    function deposit() public payable {
        deposits[msg.sender] += msg.value;
    }
    
    function withdraw(uint256 amount) public {
        require(deposits[msg.sender] >= amount, "Insufficient balance");
        deposits[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
    }
}`,
    size: 384,
    lastModified: new Date().toISOString()
  },
  'src/': {
    type: 'directory',
    children: ['index.js', 'utils.js']
  },
  'package.json': {
    type: 'file',
    content: `{
  "name": "flash-audit-workspace",
  "version": "1.0.0",
  "description": "Smart contract development workspace",
  "main": "index.js",
  "scripts": {
    "test": "hardhat test",
    "compile": "hardhat compile",
    "deploy": "hardhat run scripts/deploy.js"
  },
  "dependencies": {
    "@openzeppelin/contracts": "^4.9.0",
    "hardhat": "^2.17.0"
  }
}`,
    size: 256,
    lastModified: new Date().toISOString()
  }
};

// File operations
const readFile = async (filePath, userId) => {
  try {
    // Log file access
    if (supabaseAdmin) {
      await supabaseAdmin
        .from('file_access_logs')
        .insert({
          user_id: userId,
          file_path: filePath,
          operation: 'read',
          created_at: new Date().toISOString()
        });
    }

    const file = mockFileSystem[filePath];
    if (!file) {
      throw new Error('File not found');
    }

    if (file.type === 'directory') {
      return {
        type: 'directory',
        path: filePath,
        children: file.children,
        timestamp: new Date().toISOString()
      };
    }

    return {
      type: 'file',
      path: filePath,
      content: file.content,
      size: file.size,
      lastModified: file.lastModified,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to read file: ${error.message}`);
  }
};

const writeFile = async (filePath, content, userId) => {
  try {
    // Log file write
    if (supabaseAdmin) {
      await supabaseAdmin
        .from('file_access_logs')
        .insert({
          user_id: userId,
          file_path: filePath,
          operation: 'write',
          content_size: content.length,
          created_at: new Date().toISOString()
        });
    }

    // Update mock file system
    mockFileSystem[filePath] = {
      type: 'file',
      content: content,
      size: content.length,
      lastModified: new Date().toISOString()
    };

    return {
      success: true,
      path: filePath,
      size: content.length,
      lastModified: new Date().toISOString(),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to write file: ${error.message}`);
  }
};

const listDirectory = async (dirPath = '', userId) => {
  try {
    // Log directory access
    if (supabaseAdmin) {
      await supabaseAdmin
        .from('file_access_logs')
        .insert({
          user_id: userId,
          file_path: dirPath || '/',
          operation: 'list',
          created_at: new Date().toISOString()
        });
    }

    const files = [];
    const directories = [];

    for (const [path, item] of Object.entries(mockFileSystem)) {
      if (dirPath === '' || path.startsWith(dirPath)) {
        const relativePath = dirPath ? path.replace(dirPath, '') : path;
        if (!relativePath.includes('/') || relativePath.endsWith('/')) {
          if (item.type === 'directory') {
            directories.push({
              name: relativePath.replace('/', ''),
              type: 'directory',
              path: path
            });
          } else {
            files.push({
              name: relativePath,
              type: 'file',
              path: path,
              size: item.size,
              lastModified: item.lastModified
            });
          }
        }
      }
    }

    return {
      path: dirPath || '/',
      files,
      directories,
      totalItems: files.length + directories.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to list directory: ${error.message}`);
  }
};

const editorHandler = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { userId, email } = req.auth;

  try {
    if (req.method === 'GET') {
      const { path, list } = req.query;

      if (list === 'true') {
        // List directory contents
        console.log(`Directory listing request from user: ${email} (${userId})`);
        const result = await listDirectory(path, userId);
        
        res.status(200).json({
          operation: 'list',
          userId,
          userEmail: email,
          ...result
        });
      } else if (path) {
        // Read specific file
        console.log(`File read request from user: ${email} (${userId}) for: ${path}`);
        const result = await readFile(path, userId);
        
        res.status(200).json({
          operation: 'read',
          userId,
          userEmail: email,
          ...result
        });
      } else {
        // List root directory by default
        const result = await listDirectory('', userId);
        
        res.status(200).json({
          operation: 'list',
          userId,
          userEmail: email,
          ...result
        });
      }
    } else if (req.method === 'POST') {
      const { path, content, operation } = req.body;

      if (!path) {
        return res.status(400).json({
          error: 'File path is required',
          details: 'Please provide a valid file path'
        });
      }

      if (operation === 'write' || content !== undefined) {
        // Write file
        if (content === undefined) {
          return res.status(400).json({
            error: 'Content is required for write operation',
            details: 'Please provide file content'
          });
        }

        console.log(`File write request from user: ${email} (${userId}) for: ${path}`);
        const result = await writeFile(path, content, userId);
        
        res.status(200).json({
          operation: 'write',
          userId,
          userEmail: email,
          ...result
        });
      } else {
        return res.status(400).json({
          error: 'Invalid operation',
          details: 'Supported operations: write'
        });
      }
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Editor API error:', error);
    res.status(500).json({
      error: 'File operation failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Export with Clerk authentication middleware
module.exports = withAuth(editorHandler);

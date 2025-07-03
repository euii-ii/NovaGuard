// Enhanced Vercel serverless function for contract file upload
const { withAuth } = require('../../middleware/auth');
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

// Parse multipart form data (simple implementation for contract files)
const parseMultipartData = (body, boundary) => {
  const parts = body.split(`--${boundary}`);
  const files = {};
  
  for (const part of parts) {
    if (part.includes('Content-Disposition: form-data')) {
      const nameMatch = part.match(/name="([^"]+)"/);
      const filenameMatch = part.match(/filename="([^"]+)"/);
      
      if (nameMatch && filenameMatch) {
        const fieldName = nameMatch[1];
        const filename = filenameMatch[1];
        
        // Extract file content (after double CRLF)
        const contentStart = part.indexOf('\r\n\r\n') + 4;
        const content = part.substring(contentStart).trim();
        
        files[fieldName] = {
          filename,
          content
        };
      }
    }
  }
  
  return files;
};

// Validate Solidity contract code
const validateSolidityCode = (code) => {
  const errors = [];
  const warnings = [];
  
  // Basic validation
  if (!code.includes('pragma solidity')) {
    warnings.push('No pragma solidity directive found');
  }
  
  if (!code.includes('contract ') && !code.includes('library ') && !code.includes('interface ')) {
    errors.push('No contract, library, or interface declaration found');
  }
  
  if (code.length > 1000000) {
    errors.push('Contract code is too large (max 1MB)');
  }
  
  // Check for common issues
  if (code.includes('selfdestruct')) {
    warnings.push('Contract contains selfdestruct - use with caution');
  }
  
  if (code.includes('delegatecall')) {
    warnings.push('Contract contains delegatecall - ensure proper security measures');
  }
  
  return { errors, warnings };
};

const uploadHandler = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }

  try {
    const { userId, email } = req.auth;
    
    // Handle different content types
    let contractCode = '';
    let filename = 'uploaded-contract.sol';
    
    const contentType = req.headers['content-type'] || '';
    
    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const boundary = contentType.split('boundary=')[1];
      if (!boundary) {
        return res.status(400).json({
          success: false,
          error: 'Invalid multipart data'
        });
      }
      
      const files = parseMultipartData(req.body.toString(), boundary);
      const contractFile = files.contract;
      
      if (!contractFile) {
        return res.status(400).json({
          success: false,
          error: 'No contract file found in upload'
        });
      }
      
      contractCode = contractFile.content;
      filename = contractFile.filename;
    } else if (contentType.includes('application/json')) {
      // Handle JSON upload
      const { contractCode: code, filename: name } = req.body;
      contractCode = code;
      filename = name || filename;
    } else {
      // Handle raw text upload
      contractCode = req.body.toString();
    }

    if (!contractCode || contractCode.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Contract code is required'
      });
    }

    console.log(`Contract upload from user: ${email} (${userId}), file: ${filename}`);

    // Validate the contract code
    const validation = validateSolidityCode(contractCode);
    
    if (validation.errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Contract validation failed',
        details: validation.errors
      });
    }

    // Log upload to database
    if (supabaseAdmin) {
      await supabaseAdmin
        .from('contract_uploads')
        .insert({
          user_id: userId,
          filename: filename,
          contract_code: contractCode.substring(0, 1000), // Store first 1000 chars
          file_size: contractCode.length,
          validation_warnings: validation.warnings,
          uploaded_at: new Date().toISOString()
        });
    }

    // Return success response with contract code
    res.status(200).json({
      success: true,
      contractCode: contractCode,
      filename: filename,
      fileSize: contractCode.length,
      validation: {
        errors: validation.errors,
        warnings: validation.warnings
      },
      uploadMetadata: {
        userId,
        userEmail: email,
        uploadedAt: new Date().toISOString(),
        version: '2.0.0-serverless'
      }
    });
  } catch (error) {
    console.error('Contract upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Upload failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Export with Clerk authentication middleware
module.exports = withAuth(uploadHandler);

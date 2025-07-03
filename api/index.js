const express = require('express');
const cors = require('cors');
const v1Router = require('./v1');

const app = express();

// --- Global Middleware ---

// Enable CORS for all routes
// This configuration allows all origins, which is suitable for public APIs.
// For production, you might want to restrict this to your frontend's domain.
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
}));

// --- API Versioning ---

// Mount the v1 router under the /api/v1 path
app.use('/api/v1', v1Router);

// --- Root Endpoint ---

// A simple welcome message for the root URL to confirm the server is running
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to the Flash Audit API',
    documentation: '/api/docs', // Link to API documentation
    healthCheck: '/api/v1/health', // Link to health check endpoint
    version: '1.0.0'
  });
});

// --- Server Export ---

// Export the app for use with Vercel's serverless environment
module.exports = app;
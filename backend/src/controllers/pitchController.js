const express = require('express');
const crypto = require('crypto');
const { decrypt } = require('../services/encryptionService');
const { evaluatePitch } = require('../services/pitchEvaluationService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Evaluate encrypted pitch data
 * POST /api/pitch/evaluate
 */
router.post('/evaluate', async (req, res) => {
  try {
    const { ciphertext, key, iv, model = 'mistral-7b-instruct', preview = false } = req.body;

    // Validate required fields
    if (!ciphertext || !key || !iv) {
      return res.status(400).json({
        success: false,
        error: 'Missing required encryption parameters: ciphertext, key, and iv are required'
      });
    }

    // Validate base64 encoding
    try {
      Buffer.from(ciphertext, 'base64');
      Buffer.from(key, 'base64');
      Buffer.from(iv, 'base64');
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid base64 encoding in encryption parameters'
      });
    }

    let pitchContent;
    try {
      // Decrypt pitch data in-memory only
      pitchContent = await decrypt(ciphertext, key, iv);
      
      // Sanitize decrypted content
      if (typeof pitchContent !== 'string' || pitchContent.length === 0) {
        throw new Error('Invalid pitch content after decryption');
      }

      // Limit pitch content length for security
      if (pitchContent.length > 50000) {
        throw new Error('Pitch content too long (max 50,000 characters)');
      }

      // Basic sanitization - remove potential script tags and dangerous content
      pitchContent = pitchContent
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();

    } catch (error) {
      logger.error('Decryption failed', { 
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      return res.status(400).json({
        success: false,
        error: 'Failed to decrypt pitch data. Please check your encryption parameters.'
      });
    }

    let scores;
    let receipt;

    try {
      if (preview) {
        // Return mock scores for preview mode
        scores = {
          clarity: Math.floor(Math.random() * 30) + 70, // 70-100
          originality: Math.floor(Math.random() * 30) + 70,
          team_strength: Math.floor(Math.random() * 30) + 70,
          market_fit: Math.floor(Math.random() * 30) + 70
        };
      } else {
        // Evaluate pitch using LLM
        scores = await evaluatePitch(pitchContent, model);
      }

      // Generate receipt hash
      const timestamp = new Date().toISOString();
      const scoresString = JSON.stringify(scores);
      const receiptData = `${ciphertext}|${model}|${timestamp}|${scoresString}`;
      receipt = crypto.createHash('sha256').update(receiptData).digest('hex');

      // Clear sensitive data from memory
      pitchContent = null;

      res.json({
        success: true,
        data: {
          scores,
          receipt,
          timestamp,
          model: preview ? 'preview-mode' : model
        }
      });

    } catch (error) {
      logger.error('Pitch evaluation failed', { 
        error: error.message,
        model,
        timestamp: new Date().toISOString()
      });

      // Clear sensitive data from memory
      pitchContent = null;

      res.status(500).json({
        success: false,
        error: 'Failed to evaluate pitch. Please try again later.'
      });
    }

  } catch (error) {
    logger.error('Pitch evaluation endpoint error', { 
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get available models
 * GET /api/pitch/models
 */
router.get('/models', (req, res) => {
  res.json({
    success: true,
    data: {
      models: [
        {
          id: 'mistral-7b-instruct',
          name: 'Mistral 7B Instruct',
          description: 'Fast and efficient model for pitch evaluation',
          recommended: true
        },
        {
          id: 'openchat-3.5',
          name: 'OpenChat 3.5',
          description: 'Advanced conversational model with strong analytical capabilities',
          recommended: false
        }
      ],
      default: 'mistral-7b-instruct'
    }
  });
});

/**
 * Health check for pitch evaluation service
 * GET /api/pitch/health
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'pitch-evaluation',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      features: [
        'AES-GCM decryption',
        'LLM-based scoring',
        'SHA-256 receipts',
        'Preview mode',
        'Input sanitization'
      ]
    }
  });
});

module.exports = router;
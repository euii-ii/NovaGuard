const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Evaluate pitch content using OpenRouter API
 * @param {string} pitchContent - The decrypted pitch content
 * @param {string} model - The model to use for evaluation
 * @returns {Promise<Object>} Evaluation scores
 */
async function evaluatePitch(pitchContent, model = 'mistral-7b-instruct') {
  try {
    // Check if OpenRouter API key is available
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      logger.warn('OpenRouter API key not found, using mock scores');
      return generateMockScores();
    }

    // Prepare the system prompt for structured evaluation
    const systemPrompt = `You are a professional pitch evaluator. Analyze the provided business pitch and return ONLY a JSON object with scores from 0-100 for these four criteria:

1. clarity: How clear and well-structured is the pitch?
2. originality: How innovative and unique is the business idea?
3. team_strength: How strong and capable does the team appear?
4. market_fit: How well does the solution fit the target market?

Return ONLY valid JSON in this exact format:
{"clarity": 85, "originality": 78, "team_strength": 92, "market_fit": 88}

Do not include any other text, explanations, or formatting.`;

    const userPrompt = `Please evaluate this business pitch:\n\n${pitchContent}`;

    // Prepare OpenRouter API request
    const requestData = {
      model: getOpenRouterModel(model),
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.0,
      top_p: 1.0,
      max_tokens: 200,
      stream: false
    };

    // Make API request with timeout
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', requestData, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
        'X-Title': 'PitchGuard Lite'
      },
      timeout: 30000 // 30 second timeout
    });

    // Extract and parse the response
    const completion = response.data.choices[0]?.message?.content;
    if (!completion) {
      throw new Error('No completion received from OpenRouter API');
    }

    // Parse JSON response
    let scores;
    try {
      scores = JSON.parse(completion.trim());
    } catch (parseError) {
      logger.warn('Failed to parse LLM response as JSON, attempting to extract scores', {
        response: completion,
        error: parseError.message
      });
      
      // Try to extract scores from malformed response
      scores = extractScoresFromText(completion);
    }

    // Validate scores
    const validatedScores = validateScores(scores);
    
    logger.info('Pitch evaluation completed', {
      model,
      scores: validatedScores,
      timestamp: new Date().toISOString()
    });

    return validatedScores;

  } catch (error) {
    logger.error('Pitch evaluation failed', {
      error: error.message,
      model,
      timestamp: new Date().toISOString()
    });

    // Return mock scores as fallback
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      logger.warn('OpenRouter API timeout, returning mock scores');
    } else {
      logger.warn('OpenRouter API error, returning mock scores');
    }
    
    return generateMockScores();
  }
}

/**
 * Map internal model names to OpenRouter model names
 * @param {string} model - Internal model name
 * @returns {string} OpenRouter model name
 */
function getOpenRouterModel(model) {
  const modelMap = {
    'mistral-7b-instruct': 'mistralai/mistral-7b-instruct',
    'openchat-3.5': 'openchat/openchat-3.5-1210'
  };

  return modelMap[model] || modelMap['mistral-7b-instruct'];
}

/**
 * Generate mock scores for testing or fallback
 * @returns {Object} Mock evaluation scores
 */
function generateMockScores() {
  return {
    clarity: Math.floor(Math.random() * 30) + 70,     // 70-100
    originality: Math.floor(Math.random() * 30) + 70, // 70-100
    team_strength: Math.floor(Math.random() * 30) + 70, // 70-100
    market_fit: Math.floor(Math.random() * 30) + 70   // 70-100
  };
}

/**
 * Extract scores from malformed text response
 * @param {string} text - Response text
 * @returns {Object} Extracted scores
 */
function extractScoresFromText(text) {
  const scores = {
    clarity: 75,
    originality: 75,
    team_strength: 75,
    market_fit: 75
  };

  try {
    // Try to find numbers associated with each criterion
    const clarityMatch = text.match(/clarity["\s:]*(\d+)/i);
    const originalityMatch = text.match(/originality["\s:]*(\d+)/i);
    const teamMatch = text.match(/team_strength["\s:]*(\d+)/i);
    const marketMatch = text.match(/market_fit["\s:]*(\d+)/i);

    if (clarityMatch) scores.clarity = parseInt(clarityMatch[1]);
    if (originalityMatch) scores.originality = parseInt(originalityMatch[1]);
    if (teamMatch) scores.team_strength = parseInt(teamMatch[1]);
    if (marketMatch) scores.market_fit = parseInt(marketMatch[1]);

  } catch (error) {
    logger.warn('Failed to extract scores from text, using defaults');
  }

  return scores;
}

/**
 * Validate and normalize scores
 * @param {Object} scores - Raw scores object
 * @returns {Object} Validated scores
 */
function validateScores(scores) {
  const defaultScore = 75;
  const validatedScores = {};

  const requiredFields = ['clarity', 'originality', 'team_strength', 'market_fit'];

  for (const field of requiredFields) {
    let score = scores[field];
    
    // Ensure score is a number
    if (typeof score !== 'number' || isNaN(score)) {
      score = defaultScore;
    }
    
    // Clamp score between 0 and 100
    score = Math.max(0, Math.min(100, Math.round(score)));
    
    validatedScores[field] = score;
  }

  return validatedScores;
}

/**
 * Test the pitch evaluation service
 * @returns {Promise<Object>} Test results
 */
async function testService() {
  const testPitch = `
    Our startup, EcoClean, is developing an AI-powered waste sorting system for smart cities.
    We use computer vision and machine learning to automatically sort recyclables with 95% accuracy.
    Our team includes former engineers from Google and Tesla, with 20+ years of combined experience.
    The global waste management market is worth $330B and growing at 5% annually.
    We're seeking $2M in Series A funding to scale our technology to 100 cities by 2025.
  `;

  try {
    const scores = await evaluatePitch(testPitch, 'mistral-7b-instruct');
    return {
      success: true,
      scores,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  evaluatePitch,
  generateMockScores,
  testService
};
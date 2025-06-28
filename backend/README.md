# Smart Contract Auditor Backend

AI-powered Smart Contract Security Auditor Backend with LLM integration and Web3 capabilities.

## Features

- 🔍 **Smart Contract Analysis**: Parse and analyze Solidity contracts using AST parsing
- 🤖 **AI-Powered Security Audit**: Integration with OpenRouter API using Gemma model for vulnerability detection
- 🌐 **Multi-Chain Support**: Ethereum, Polygon, BNB Chain, and testnets
- 🔒 **TEE Monitor**: Secure logging system for audit trails
- 📊 **Comprehensive Reporting**: Detailed vulnerability reports with severity scoring
- 🚀 **RESTful API**: Clean API endpoints for frontend integration
- 🛡️ **Security Features**: Rate limiting, CORS, helmet security headers
- 📈 **Analytics**: Audit statistics and historical data

## Quick Start

### Prerequisites

- Node.js 16+ and npm 8+
- OpenRouter API key for LLM integration

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the server**:
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

The server will start on `http://localhost:3001`

## API Endpoints

### Core Audit Endpoints

#### `POST /api/audit/contract`
Audit smart contract from source code.

**Request Body**:
```json
{
  "contractCode": "pragma solidity ^0.8.0; contract Example { ... }",
  "options": {
    "includeGasOptimization": true,
    "includeCodeQuality": true,
    "severityFilter": ["High", "Critical"]
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "auditId": "audit_1234567890_abc123",
    "status": "completed",
    "overallScore": 85,
    "riskLevel": "Low",
    "vulnerabilities": [
      {
        "name": "Reentrancy Vulnerability",
        "severity": "High",
        "category": "reentrancy",
        "affectedLines": [42, 43],
        "description": "Potential reentrancy attack vector",
        "recommendation": "Use ReentrancyGuard modifier"
      }
    ],
    "summary": "Contract shows good security practices with minor issues",
    "recommendations": ["Add input validation", "Use SafeMath"],
    "timestamp": "2024-06-15T10:30:00.000Z"
  }
}
```

#### `POST /api/audit/address`
Audit deployed contract by address.

**Request Body**:
```json
{
  "contractAddress": "0x1234567890123456789012345678901234567890",
  "chain": "ethereum",
  "options": {
    "includeGasOptimization": true
  }
}
```

### Information Endpoints

#### `GET /api/audit/history`
Get audit history with filtering.

**Query Parameters**:
- `startDate`: ISO date string
- `endDate`: ISO date string
- `status`: "completed" | "failed"
- `riskLevel`: "Low" | "Medium" | "High" | "Critical"
- `limit`: Number (1-100, default: 20)
- `offset`: Number (default: 0)

#### `GET /api/audit/statistics`
Get audit statistics and analytics.

#### `GET /api/audit/chains`
Get supported blockchain networks.

#### `GET /api/audit/health`
Health check for all services.

## Configuration

### Environment Variables

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# OpenRouter API Configuration
OPENROUTER_API_KEY=your-api-key-here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
LLM_MODEL=google/gemma-2-9b-it

# Blockchain RPC URLs
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
BSC_RPC_URL=https://bsc-dataseed.binance.org/

# Security Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# TEE Monitor Configuration
TEE_LOG_ENABLED=true
TEE_LOG_PATH=./logs/auditLogs.json
TEE_ENCRYPTION_KEY=your-encryption-key

# Audit Configuration
MAX_CONTRACT_SIZE_BYTES=1048576
AUDIT_TIMEOUT_MS=30000
VULNERABILITY_THRESHOLD_HIGH=80
VULNERABILITY_THRESHOLD_MEDIUM=50
```

## Architecture

### Core Services

1. **Audit Engine** (`src/services/auditEngine.js`)
   - Orchestrates the entire audit process
   - Combines static analysis and LLM results
   - Calculates security scores and risk levels

2. **Contract Parser** (`src/services/contractParser.js`)
   - Parses Solidity contracts using solidity-parser-antlr
   - Performs static analysis for common vulnerability patterns
   - Extracts contract metadata and metrics

3. **LLM Service** (`src/services/llmService.js`)
   - Integrates with OpenRouter API
   - Sends structured prompts for security analysis
   - Parses and validates LLM responses

4. **Web3 Service** (`src/services/web3Service.js`)
   - Connects to multiple blockchain networks
   - Fetches deployed contract data
   - Retrieves source code from block explorers

5. **TEE Monitor** (`src/services/teeMonitor.js`)
   - Secure audit logging system
   - Encrypted storage of audit trails
   - Integrity verification and analytics

### Security Features

- **Rate Limiting**: Multiple tiers of rate limiting for different endpoints
- **Input Validation**: Joi schema validation for all inputs
- **Error Handling**: Comprehensive error handling with structured responses
- **Logging**: Structured logging with Winston
- **CORS**: Configurable CORS policies
- **Helmet**: Security headers for protection

## Supported Chains

- **Ethereum Mainnet** (`ethereum`)
- **Polygon Mainnet** (`polygon`)
- **BNB Smart Chain** (`bsc`)
- **Sepolia Testnet** (`sepolia`)
- **Polygon Mumbai** (`mumbai`)
- **BNB Testnet** (`bscTestnet`)

## Rate Limits

- **General API**: 100 requests per 15 minutes
- **Audit Endpoints**: 10 audits per hour
- **Resource-Intensive**: 3 requests per hour

## Error Handling

The API returns structured error responses:

```json
{
  "error": "Error Type",
  "message": "Human-readable error message",
  "timestamp": "2024-06-15T10:30:00.000Z",
  "details": ["Additional error details"]
}
```

## Development

### Scripts

```bash
npm run dev      # Start development server with nodemon
npm start        # Start production server
npm test         # Run tests
npm run lint     # Run ESLint
```

### Project Structure

```
src/
├── controllers/     # API route handlers
├── services/        # Core business logic
├── middleware/      # Express middleware
├── utils/          # Utility functions
├── models/         # Data models (if needed)
└── server.js       # Main server file
```

## License

MIT License - see LICENSE file for details.

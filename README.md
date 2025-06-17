# 🛡️ DAO Smart Contract Security Auditor

A comprehensive AI-powered smart contract security auditing platform with modern web interface and robust backend services.

## 🌟 Features

### 🔍 Smart Contract Analysis
- **Multi-input Support**: Analyze contracts by address or source code
- **Multi-chain Compatibility**: Ethereum, Polygon, BSC, and testnets
- **AI-Powered Detection**: Advanced vulnerability detection using LLM integration
- **Real-time Analysis**: Instant security scoring and risk assessment

### 🎯 Security Features
- **Comprehensive Vulnerability Detection**: Reentrancy, overflow, access control, and more
- **Security Scoring**: 0-100 security score with detailed breakdown
- **Risk Categorization**: Low, Medium, High, Critical risk levels
- **Detailed Reporting**: Line-by-line analysis with fix recommendations

### 🚀 Modern Architecture
- **Frontend**: React + TypeScript with modern UI/UX
- **Backend**: Node.js + Express with comprehensive API
- **Security**: Rate limiting, CORS, helmet protection
- **Monitoring**: TEE (Trusted Execution Environment) audit logging

## 🏗️ Project Structure

```
dao/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── controllers/     # API route handlers
│   │   ├── services/        # Business logic services
│   │   ├── middleware/      # Express middleware
│   │   └── utils/          # Utility functions
│   └── package.json
├── frontend/               # React TypeScript app
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API integration
│   │   └── assets/         # Static assets
│   └── package.json
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm 8+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/euii-ii/dao.git
   cd dao
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your API keys and configuration
   npm start
   ```

3. **Setup Frontend**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

4. **Access the Application**
   - Frontend: http://localhost:5174
   - Backend API: http://localhost:3001

## ⚙️ Configuration

### Backend Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
NODE_ENV=development
PORT=3001

# OpenRouter API Configuration
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
LLM_MODEL=google/gemma-2-9b-it

# Blockchain RPC URLs
ETHEREUM_RPC_URL=your-ethereum-rpc-url
POLYGON_RPC_URL=your-polygon-rpc-url
BSC_RPC_URL=your-bsc-rpc-url

# Block Explorer API Keys
ETHERSCAN_API_KEY=your-etherscan-api-key
POLYGONSCAN_API_KEY=your-polygonscan-api-key
BSCSCAN_API_KEY=your-bscscan-api-key
```

### Frontend Environment Variables

Create a `.env` file in the `frontend` directory:

```env
VITE_API_BASE_URL=http://localhost:3001
```

## 🔧 API Endpoints

### Audit Endpoints
- `POST /api/audit/contract` - Audit by source code
- `POST /api/audit/address` - Audit by contract address
- `GET /api/audit/history` - Get audit history
- `GET /api/audit/statistics` - Get audit statistics
- `GET /api/audit/chains` - Get supported chains
- `GET /api/audit/health` - Service health check

### Health Check
- `GET /health` - General health check

## 🛠️ Development

### Backend Development
```bash
cd backend
npm run dev  # Start with nodemon for auto-reload
npm test     # Run tests
npm run lint # Run ESLint
```

### Frontend Development
```bash
cd frontend
npm run dev   # Start development server
npm run build # Build for production
npm run lint  # Run ESLint
```

## 🔒 Security Features

- **Rate Limiting**: Prevents API abuse
- **CORS Protection**: Secure cross-origin requests
- **Input Validation**: Joi schema validation
- **Security Headers**: Helmet.js protection
- **TEE Monitoring**: Audit trail logging
- **Error Handling**: Comprehensive error management

## 🌐 Supported Blockchains

- **Ethereum Mainnet**
- **Polygon (Matic)**
- **BNB Smart Chain (BSC)**
- **Sepolia Testnet**
- **Polygon Mumbai Testnet**
- **BSC Testnet**

## 📊 Audit Capabilities

### Vulnerability Detection
- Reentrancy attacks
- Integer overflow/underflow
- Access control issues
- Unchecked external calls
- Gas optimization opportunities
- Code quality assessment

### Analysis Types
- **Static Analysis**: Code pattern detection
- **AI Analysis**: LLM-powered vulnerability detection
- **Bytecode Analysis**: For deployed contracts
- **Gas Optimization**: Efficiency recommendations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- OpenRouter for LLM API services
- Ethers.js for blockchain integration
- React and TypeScript communities
- Security research community

## 📞 Support

For support, please open an issue on GitHub or contact the development team.

---

**⚠️ Disclaimer**: This tool is for educational and research purposes. Always conduct thorough manual audits for production smart contracts.

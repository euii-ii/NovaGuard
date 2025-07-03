// Enhanced Vercel serverless function for terminal execution
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

// Simulate terminal command execution
const executeCommand = async (command, options = {}) => {
  const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Validate command for security
    const allowedCommands = [
      'ls', 'pwd', 'cat', 'echo', 'node', 'npm', 'yarn', 'git',
      'solc', 'truffle', 'hardhat', 'forge', 'cast'
    ];
    
    const commandBase = command.split(' ')[0];
    if (!allowedCommands.includes(commandBase)) {
      throw new Error(`Command '${commandBase}' is not allowed for security reasons`);
    }

    // Simulate command execution
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay

    // Generate mock output based on command
    let output = '';
    let exitCode = 0;
    
    if (command.startsWith('ls')) {
      output = 'contracts/\nsrc/\npackage.json\nREADME.md\n.gitignore';
    } else if (command.startsWith('pwd')) {
      output = '/workspace/flash-audit';
    } else if (command.startsWith('node --version')) {
      output = 'v18.17.0';
    } else if (command.startsWith('npm --version')) {
      output = '9.6.7';
    } else if (command.startsWith('git status')) {
      output = 'On branch main\nnothing to commit, working tree clean';
    } else if (command.startsWith('solc --version')) {
      output = 'solc, the solidity compiler commandline interface\nVersion: 0.8.19+commit.7dd6d404.Linux.g++';
    } else if (command.startsWith('help')) {
      output = getHelpText();
    } else if (command.startsWith('ai ')) {
      const question = command.substring(3);
      output = await handleAIQuery(question);
    } else if (command.startsWith('compile')) {
      output = '🔨 Compiling contracts...\n✅ Compilation successful!\n📊 Gas estimates generated';
    } else if (command.startsWith('deploy')) {
      output = '🚀 Deploying to network...\n✅ Contract deployed!\n📍 Address: 0x' + Math.random().toString(16).substring(2, 42);
    } else if (command.startsWith('test')) {
      output = '🧪 Running tests...\n✅ All tests passed!\n📊 Coverage: 95%';
    } else {
      output = `Command executed: ${command}\nOutput: Mock execution successful`;
    }

    return {
      executionId,
      command,
      output,
      exitCode,
      duration: Math.floor(Math.random() * 2000) + 500, // 500-2500ms
      timestamp: new Date().toISOString(),
      status: 'completed',
      suggestions: getCommandSuggestions(command),
      aiSuggestion: command.includes('unknown') ? await getAISuggestion(command) : null
    };
  } catch (error) {
    return {
      executionId,
      command,
      output: '',
      error: error.message,
      exitCode: 1,
      duration: 0,
      timestamp: new Date().toISOString(),
      status: 'failed'
    };
  }
};

// AI-powered helper functions
const getHelpText = () => {
  return `🔧 FlashAudit AI-Powered Terminal

📁 File Operations:
  ls, dir          - List files and directories
  pwd              - Show current directory
  cat <file>       - Display file contents

🔨 Development:
  compile [file]   - Compile Solidity contracts
  deploy <network> - Deploy contracts to blockchain
  test             - Run test suite
  format           - Format code
  validate         - Validate syntax

📦 Package Management:
  npm <command>    - Run npm commands
  yarn <command>   - Run yarn commands
  git <command>    - Git operations

🤖 AI Assistant:
  ai <question>    - Ask AI for help
  ai analyze       - Analyze current project
  ai optimize      - Get optimization suggestions
  ai security      - Security audit recommendations

🧹 Utility:
  help             - Show this help
  clear            - Clear terminal

💡 Pro Tips:
- Use Tab for auto-completion
- Use ↑/↓ arrows for command history
- Type "ai <question>" for intelligent assistance
`;
};

const handleAIQuery = async (question) => {
  if (!question || question.trim() === '') {
    return '🤖 AI Assistant: Please ask me a question!\nExample: "ai how to optimize gas usage?"';
  }

  const lowerQuestion = question.toLowerCase();

  // Contextual AI responses
  if (lowerQuestion.includes('gas') || lowerQuestion.includes('optimize')) {
    return `🤖 AI Assistant: Gas Optimization Tips

1. 📦 Use packed structs to save storage slots
2. 🔢 Use unchecked blocks for safe arithmetic
3. 💾 Use calldata instead of memory for function parameters
4. 🔄 Avoid unnecessary storage operations
5. ⚡ Use events instead of storing non-critical data
6. 🎯 Batch operations when possible

💡 Quick action: Run "compile" to see gas estimates`;
  }

  if (lowerQuestion.includes('security') || lowerQuestion.includes('audit')) {
    return `🤖 AI Assistant: Security Best Practices

1. 🛡️ Use reentrancy guards (OpenZeppelin)
2. ✅ Validate all inputs and check conditions
3. 🔄 Follow checks-effects-interactions pattern
4. 🚫 Avoid tx.origin for authorization
5. 📋 Use established standards (ERC-20, ERC-721)
6. 🧪 Write comprehensive tests

💡 Quick action: Run "ai analyze" for project-specific advice`;
  }

  if (lowerQuestion.includes('deploy') || lowerQuestion.includes('deployment')) {
    return `🤖 AI Assistant: Deployment Guide

1. 🧪 Test thoroughly on testnets first
2. ⛽ Estimate gas costs accurately
3. 🔍 Verify contracts on block explorers
4. 📋 Use deployment scripts for consistency
5. 🔐 Secure private keys properly
6. 📊 Monitor contract after deployment

💡 Quick action: Run "deploy <network>" to start deployment`;
  }

  if (lowerQuestion.includes('test') || lowerQuestion.includes('testing')) {
    return `🤖 AI Assistant: Testing Strategy

1. 🎯 Write unit tests for all functions
2. 🔍 Test edge cases and error conditions
3. 🌊 Use fuzzing for complex logic
4. ⛽ Test gas consumption
5. 🔄 Test state transitions
6. 🛡️ Test security vulnerabilities

💡 Quick action: Run "test" to execute your test suite`;
  }

  if (lowerQuestion.includes('analyze') || lowerQuestion.includes('project')) {
    return `🤖 AI Assistant: Project Analysis

📊 Your project appears to be a smart contract development environment.

Recommendations:
1. 📝 Ensure all contracts have proper documentation
2. 🧪 Add comprehensive test coverage
3. 🔍 Run security audits before mainnet deployment
4. ⛽ Optimize gas usage in critical functions
5. 📋 Follow established coding standards

💡 Quick actions: "compile", "test", "ai security"`;
  }

  // Default response
  return `🤖 AI Assistant: I can help with:

• 🔨 Smart contract development
• ⛽ Gas optimization strategies
• 🛡️ Security best practices
• 🧪 Testing methodologies
• 🚀 Deployment guidance
• 📊 Code analysis

Ask me specific questions like:
- "How to prevent reentrancy attacks?"
- "Best practices for gas optimization?"
- "How to test smart contracts effectively?"

💡 Try: "ai security" or "ai optimize"`;
};

const getCommandSuggestions = (command) => {
  const cmd = command.split(' ')[0].toLowerCase();

  switch (cmd) {
    case 'ls':
    case 'dir':
      return [
        'Use "cat <filename>" to view file contents',
        'Try "compile" to build your contracts',
        'Run "ai analyze" for project insights'
      ];
    case 'compile':
      return [
        'Run "test" to verify your contracts',
        'Use "deploy <network>" to deploy',
        'Try "ai optimize" for gas tips'
      ];
    case 'deploy':
      return [
        'Verify contract on block explorer',
        'Run integration tests',
        'Use "ai security" for audit tips'
      ];
    case 'test':
      return [
        'Check test coverage',
        'Add edge case tests',
        'Try "ai test" for testing tips'
      ];
    default:
      return [
        'Type "help" for available commands',
        'Use "ai <question>" for assistance'
      ];
  }
};

const getAISuggestion = async (command) => {
  const suggestions = {
    'complie': 'compile',
    'deplyo': 'deploy',
    'tets': 'test',
    'hlep': 'help',
    'claer': 'clear',
    'isntall': 'install'
  };

  return suggestions[command] ? `Did you mean "${suggestions[command]}"?` : null;
};

// Get command history for user
const getCommandHistory = async (userId, limit = 20) => {
  try {
    if (!supabaseAdmin) {
      return {
        success: false,
        error: 'Database not configured',
        history: []
      };
    }

    const { data, error } = await supabaseAdmin
      .from('terminal_logs')
      .select('command, output, exit_code, duration, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return {
      success: true,
      history: data || [],
      count: data ? data.length : 0
    };
  } catch (error) {
    console.error('Error fetching command history:', error);
    return {
      success: false,
      error: error.message,
      history: []
    };
  }
};

const terminalHandler = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    // Get command history
    try {
      const { limit } = req.query;
      const { userId, email } = req.auth;

      console.log(`Terminal history request from user: ${email} (${userId})`);

      const historyResult = await getCommandHistory(userId, parseInt(limit) || 20);

      res.status(200).json({
        type: 'history',
        userId,
        userEmail: email,
        timestamp: new Date().toISOString(),
        ...historyResult
      });
    } catch (error) {
      console.error('Terminal history error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { command, workingDirectory, environment } = req.body;
    const { userId, email } = req.auth;

    // Validation
    if (!command) {
      return res.status(400).json({
        error: 'Command is required',
        details: 'Please provide a command to execute'
      });
    }

    if (command.length > 1000) {
      return res.status(400).json({
        error: 'Command too long',
        details: 'Command must be less than 1000 characters'
      });
    }

    console.log(`Terminal execution request from user: ${email} (${userId})`);
    console.log(`Command: ${command}`);

    // Log command start to database
    if (supabaseAdmin) {
      await supabaseAdmin
        .from('terminal_logs')
        .insert({
          user_id: userId,
          command: command,
          working_directory: workingDirectory || '/workspace',
          status: 'executing',
          created_at: new Date().toISOString()
        });
    }

    // Execute the command
    const result = await executeCommand(command, {
      workingDirectory: workingDirectory || '/workspace',
      environment: environment || {},
      userId,
      userEmail: email
    });

    // Log execution result to database
    if (supabaseAdmin) {
      await supabaseAdmin
        .from('terminal_logs')
        .update({
          output: result.output,
          error_message: result.error,
          exit_code: result.exitCode,
          duration: result.duration,
          status: result.status,
          completed_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('command', command);
    }

    // Add user context to the response
    result.executionMetadata = {
      userId,
      userEmail: email,
      workingDirectory: workingDirectory || '/workspace',
      environment: environment || {},
      version: '2.0.0-serverless'
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('Terminal execution error:', error);
    res.status(500).json({
      error: 'Execution failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Export with Clerk authentication middleware
module.exports = withAuth(terminalHandler);

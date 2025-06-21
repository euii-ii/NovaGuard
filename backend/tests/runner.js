#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Test Runner for DAO Smart Contract Security Auditor
 * Provides comprehensive testing capabilities with detailed reporting
 */
class TestRunner {
  constructor() {
    this.testSuites = {
      unit: {
        name: 'Unit Tests',
        pattern: 'tests/services/**/*.test.js',
        timeout: 30000,
        description: 'Tests individual service components'
      },
      integration: {
        name: 'Integration Tests',
        pattern: 'tests/integration/**/*.test.js',
        timeout: 60000,
        description: 'Tests API endpoints and service integration'
      },
      controllers: {
        name: 'Controller Tests',
        pattern: 'tests/controllers/**/*.test.js',
        timeout: 30000,
        description: 'Tests API controllers and request handling'
      },
      e2e: {
        name: 'End-to-End Tests',
        pattern: 'tests/e2e/**/*.test.js',
        timeout: 120000,
        description: 'Tests complete user workflows'
      }
    };

    this.mochaOptions = {
      reporter: 'spec',
      recursive: true,
      exit: true,
      colors: true,
      bail: false
    };

    this.coverageOptions = {
      reporter: ['text', 'html', 'lcov'],
      dir: 'coverage',
      exclude: [
        'tests/**',
        'node_modules/**',
        'coverage/**'
      ]
    };
  }

  /**
   * Parse command line arguments
   */
  parseArgs() {
    const args = process.argv.slice(2);
    const options = {
      suite: 'all',
      coverage: false,
      watch: false,
      verbose: false,
      bail: false,
      grep: null,
      timeout: null,
      reporter: 'spec'
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--suite':
        case '-s':
          options.suite = args[++i];
          break;
        case '--coverage':
        case '-c':
          options.coverage = true;
          break;
        case '--watch':
        case '-w':
          options.watch = true;
          break;
        case '--verbose':
        case '-v':
          options.verbose = true;
          break;
        case '--bail':
        case '-b':
          options.bail = true;
          break;
        case '--grep':
        case '-g':
          options.grep = args[++i];
          break;
        case '--timeout':
        case '-t':
          options.timeout = parseInt(args[++i]);
          break;
        case '--reporter':
        case '-r':
          options.reporter = args[++i];
          break;
        case '--help':
        case '-h':
          this.showHelp();
          process.exit(0);
          break;
        default:
          if (arg.startsWith('--')) {
            console.error(`Unknown option: ${arg}`);
            process.exit(1);
          }
      }
    }

    return options;
  }

  /**
   * Show help information
   */
  showHelp() {
    console.log(`
DAO Smart Contract Security Auditor - Test Runner

Usage: npm test [options]
   or: node tests/runner.js [options]

Options:
  -s, --suite <name>     Run specific test suite (unit, integration, controllers, e2e, all)
  -c, --coverage         Generate code coverage report
  -w, --watch            Watch for file changes and re-run tests
  -v, --verbose          Enable verbose output
  -b, --bail             Stop on first test failure
  -g, --grep <pattern>   Only run tests matching pattern
  -t, --timeout <ms>     Set test timeout in milliseconds
  -r, --reporter <name>  Set test reporter (spec, json, html, etc.)
  -h, --help             Show this help message

Test Suites:
${Object.entries(this.testSuites).map(([key, suite]) => 
  `  ${key.padEnd(12)} ${suite.description}`
).join('\n')}

Examples:
  npm test                           # Run all tests
  npm test -- --suite unit          # Run only unit tests
  npm test -- --coverage            # Run tests with coverage
  npm test -- --grep "AI Analysis"  # Run tests matching pattern
  npm test -- --watch               # Watch mode for development
  npm test -- --bail --verbose      # Stop on first failure with verbose output
`);
  }

  /**
   * Validate test suite name
   */
  validateSuite(suiteName) {
    if (suiteName === 'all') return true;
    
    if (!this.testSuites[suiteName]) {
      console.error(`Invalid test suite: ${suiteName}`);
      console.error(`Available suites: ${Object.keys(this.testSuites).join(', ')}, all`);
      return false;
    }
    
    return true;
  }

  /**
   * Build mocha command arguments
   */
  buildMochaArgs(options) {
    const args = [];

    // Test patterns
    if (options.suite === 'all') {
      Object.values(this.testSuites).forEach(suite => {
        args.push(suite.pattern);
      });
    } else {
      args.push(this.testSuites[options.suite].pattern);
    }

    // Mocha options
    args.push('--reporter', options.reporter);
    args.push('--recursive');
    args.push('--exit');
    
    if (options.bail) {
      args.push('--bail');
    }
    
    if (options.grep) {
      args.push('--grep', options.grep);
    }
    
    if (options.timeout) {
      args.push('--timeout', options.timeout.toString());
    } else if (options.suite !== 'all') {
      args.push('--timeout', this.testSuites[options.suite].timeout.toString());
    }
    
    if (options.watch) {
      args.push('--watch');
    }

    // Setup file
    args.push('--require', 'tests/setup.js');

    return args;
  }

  /**
   * Run tests with coverage
   */
  async runWithCoverage(mochaArgs, options) {
    console.log('🔍 Running tests with coverage analysis...\n');

    const nycArgs = [
      '--reporter', 'text',
      '--reporter', 'html',
      '--reporter', 'lcov',
      '--report-dir', 'coverage',
      '--exclude', 'tests/**',
      '--exclude', 'coverage/**',
      '--exclude', 'node_modules/**',
      'mocha',
      ...mochaArgs
    ];

    return this.spawnProcess('npx', ['nyc', ...nycArgs], options);
  }

  /**
   * Run tests without coverage
   */
  async runWithoutCoverage(mochaArgs, options) {
    if (options.suite === 'all') {
      console.log('🧪 Running all test suites...\n');
    } else {
      const suite = this.testSuites[options.suite];
      console.log(`🧪 Running ${suite.name}...\n`);
      console.log(`   ${suite.description}\n`);
    }

    return this.spawnProcess('npx', ['mocha', ...mochaArgs], options);
  }

  /**
   * Spawn a child process
   */
  spawnProcess(command, args, options) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: 'inherit',
        shell: true,
        cwd: path.resolve(__dirname, '..')
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(code);
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Check if required dependencies are installed
   */
  checkDependencies() {
    const requiredDeps = [
      'mocha',
      'chai',
      'sinon',
      'supertest',
      'nyc'
    ];

    const packageJsonPath = path.resolve(__dirname, '../package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      console.error('❌ package.json not found');
      return false;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    const missingDeps = requiredDeps.filter(dep => !allDeps[dep]);
    
    if (missingDeps.length > 0) {
      console.error('❌ Missing required test dependencies:');
      missingDeps.forEach(dep => console.error(`   - ${dep}`));
      console.error('\nInstall missing dependencies with:');
      console.error(`   npm install --save-dev ${missingDeps.join(' ')}`);
      return false;
    }

    return true;
  }

  /**
   * Setup test environment
   */
  async setupEnvironment() {
    // Ensure coverage directory exists
    const coverageDir = path.resolve(__dirname, '../coverage');
    if (!fs.existsSync(coverageDir)) {
      fs.mkdirSync(coverageDir, { recursive: true });
    }

    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
  }

  /**
   * Display test results summary
   */
  displaySummary(options, startTime, success) {
    const duration = Date.now() - startTime;
    const durationStr = duration > 1000 ? `${(duration / 1000).toFixed(1)}s` : `${duration}ms`;

    console.log('\n' + '='.repeat(60));
    
    if (success) {
      console.log(`✅ Tests completed successfully in ${durationStr}`);
    } else {
      console.log(`❌ Tests failed after ${durationStr}`);
    }

    if (options.coverage) {
      console.log('\n📊 Coverage report generated in ./coverage/');
      console.log('   Open ./coverage/index.html to view detailed coverage');
    }

    if (options.suite === 'all') {
      console.log('\n📋 Test suites executed:');
      Object.entries(this.testSuites).forEach(([key, suite]) => {
        console.log(`   ✓ ${suite.name}`);
      });
    }

    console.log('='.repeat(60));
  }

  /**
   * Main test runner function
   */
  async run() {
    const startTime = Date.now();
    
    try {
      // Parse command line arguments
      const options = this.parseArgs();

      // Validate inputs
      if (!this.validateSuite(options.suite)) {
        process.exit(1);
      }

      // Check dependencies
      if (!this.checkDependencies()) {
        process.exit(1);
      }

      // Setup environment
      await this.setupEnvironment();

      // Build mocha arguments
      const mochaArgs = this.buildMochaArgs(options);

      // Run tests
      let success = false;
      if (options.coverage) {
        await this.runWithCoverage(mochaArgs, options);
        success = true;
      } else {
        await this.runWithoutCoverage(mochaArgs, options);
        success = true;
      }

      // Display summary
      this.displaySummary(options, startTime, success);

    } catch (error) {
      console.error('\n❌ Test execution failed:');
      console.error(error.message);
      
      this.displaySummary(this.parseArgs(), startTime, false);
      process.exit(1);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;

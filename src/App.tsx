import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [contractAddress, setContractAddress] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('ethereum');
  const [vulnerabilitiesCount, setVulnerabilitiesCount] = useState(1247);
  const [isScanning, setIsScanning] = useState(false);
  const [securityScore, setSecurityScore] = useState(750);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Simulate live counter updates
  useEffect(() => {
    const interval = setInterval(() => {
      setVulnerabilitiesCount(prev => prev + Math.floor(Math.random() * 3));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle scroll to show/hide scroll to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 100);
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Home') {
        e.preventDefault();
        scrollToTop();
      }
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  // Scroll to top on component mount
  useEffect(() => {
    // Force scroll to absolute top immediately
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo(0, 0);

    // Also set a timeout to ensure it works
    setTimeout(() => {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      window.scrollTo(0, 0);
    }, 100);
  }, []);

  // Scroll to top function
  const scrollToTop = () => {
    // Force scroll to absolute top
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  };

  const handleScan = () => {
    setIsScanning(true);
    // Simulate scanning process
    setTimeout(() => {
      setIsScanning(false);
      setSecurityScore(Math.floor(Math.random() * 300) + 600);
    }, 3000);
  };

  return (
    <div className="app-container">
      {/* Navigation Header */}
      <nav className="nav-header">
        <div className="nav-content">
          <div className="logo" onClick={scrollToTop} style={{ cursor: 'pointer' }}>
            <span className="logo-icon">🛡️</span>
            <span className="logo-text">SecureAudit</span>
          </div>
          <div className="nav-links">
            <a href="#features" onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }}>Features</a>
            <a href="#testimonials" onClick={(e) => { e.preventDefault(); document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' }); }}>Testimonials</a>
            <a href="#how-it-works" onClick={(e) => { e.preventDefault(); document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }); }}>How It Works</a>
            <a href="#contact" onClick={(e) => { e.preventDefault(); document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }); }}>Contact</a>
          </div>
          <button className="nav-cta" onClick={() => window.location.href = '/'}>
            Back to Main Site
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
          <div className="floating-elements">
            <div className="floating-element element-1">🛡️</div>
            <div className="floating-element element-2">⚡</div>
            <div className="floating-element element-3">🔒</div>
            <div className="floating-element element-4">🚀</div>
            <div className="floating-element element-5">💎</div>
          </div>
          <div className="grid-pattern"></div>
        </div>

        <div className="hero-content">
          <div className="hero-main">
            <div className="hero-badge">
              <span className="badge-icon">🔥</span>
              <span>Trusted by 10,000+ developers</span>
            </div>

            <h1 className="hero-title">
              Secure Your Smart Contracts
              <span className="highlight"> Before They Cost Millions</span>
            </h1>

            <p className="hero-subtitle">
              AI-powered vulnerability detection that's caught <strong>$500M+</strong> in potential exploits.
              Get instant security analysis with our advanced ML models.
            </p>

            {/* Enhanced Trust Indicators */}
            <div className="trust-indicators">
              <div className="trust-item">
                <div className="trust-icon">🎯</div>
                <div className="trust-content">
                  <span className="trust-number">{vulnerabilitiesCount.toLocaleString()}</span>
                  <span className="trust-label">Vulnerabilities Found</span>
                </div>
              </div>
              <div className="trust-item">
                <div className="trust-icon">⚡</div>
                <div className="trust-content">
                  <span className="trust-number">47s</span>
                  <span className="trust-label">Average Scan Time</span>
                </div>
              </div>
              <div className="trust-item">
                <div className="trust-icon">🏆</div>
                <div className="trust-content">
                  <span className="trust-number">99.7%</span>
                  <span className="trust-label">Accuracy Rate</span>
                </div>
              </div>
            </div>

            <div className="compliance-section">
              <span className="compliance-label">Certified & Compliant:</span>
              <div className="compliance-badges">
                <div className="compliance-badge">
                  <span className="badge-icon">🛡️</span>
                  <span>SOC2</span>
                </div>
                <div className="compliance-badge">
                  <span className="badge-icon">🔒</span>
                  <span>ISO 27001</span>
                </div>
                <div className="compliance-badge">
                  <span className="badge-icon">✅</span>
                  <span>Audited</span>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Contract Input Card */}
          <div className="contract-input-card">
            <div className="card-header">
              <h3>🚀 Start Your Security Audit</h3>
              <p>Enter your contract address for instant AI-powered analysis</p>
            </div>

            <div className="input-container">
              <div className="network-selector-wrapper">
                <label>🌐 Network:</label>
                <select
                  value={selectedNetwork}
                  onChange={(e) => setSelectedNetwork(e.target.value)}
                  className="network-selector"
                >
                  <option value="ethereum">🔷 Ethereum</option>
                  <option value="polygon">🟣 Polygon</option>
                  <option value="bsc">🟡 BSC</option>
                  <option value="arbitrum">🔵 Arbitrum</option>
                </select>
              </div>

              <div className="contract-input-wrapper">
                <label>📝 Contract Address:</label>
                <div className="input-with-icon">
                  <input
                    type="text"
                    placeholder="0x1234567890abcdef..."
                    value={contractAddress}
                    onChange={(e) => setContractAddress(e.target.value)}
                    className="contract-input"
                  />
                  <div className="input-icon">🔍</div>
                </div>
              </div>

              <button
                className="scan-button"
                onClick={handleScan}
                disabled={isScanning || !contractAddress}
              >
                {isScanning ? (
                  <>
                    <span className="spinner"></span>
                    <span>Analyzing Contract...</span>
                  </>
                ) : (
                  <>
                    <span className="button-icon">🚀</span>
                    <span>Start Free Security Audit</span>
                  </>
                )}
              </button>
            </div>

            <div className="quick-examples">
              <span className="examples-label">🔥 Try with popular contracts:</span>
              <div className="example-buttons">
                <button
                  className="example-btn"
                  onClick={() => setContractAddress('0x1f9840a85d5af5bf1d1762f925bdaddc4201f984')}
                >
                  <span className="example-icon">🦄</span>
                  <span>Uniswap</span>
                </button>
                <button
                  className="example-btn"
                  onClick={() => setContractAddress('0xc00e94cb662c3520282e6f5717214004a7f26888')}
                >
                  <span className="example-icon">🏛️</span>
                  <span>Compound</span>
                </button>
                <button
                  className="example-btn"
                  onClick={() => setContractAddress('0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9')}
                >
                  <span className="example-icon">👻</span>
                  <span>AAVE</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Results Preview */}
      <section className="demo-section">
        <div className="demo-content">
          <div className="demo-widget">
            <h3>Live Audit Demo</h3>
            <div className="audit-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{width: isScanning ? '100%' : '0%'}}></div>
              </div>
              <span className="progress-text">
                {isScanning ? 'Analyzing contract bytecode...' : 'Ready to scan'}
              </span>
            </div>

            <div className="vulnerability-preview">
              <div className="vuln-card critical">
                <span className="severity">CRITICAL</span>
                <span className="description">Reentrancy vulnerability detected</span>
                <span className="line">Line 247</span>
              </div>
              <div className="vuln-card high">
                <span className="severity">HIGH</span>
                <span className="description">Unchecked external call</span>
                <span className="line">Line 156</span>
              </div>
              <div className="vuln-card medium">
                <span className="severity">MEDIUM</span>
                <span className="description">Gas optimization opportunity</span>
                <span className="line">Line 89</span>
              </div>
            </div>
          </div>

          <div className="security-score-widget">
            <h3>Security Score</h3>
            <div className="score-gauge">
              <div className="gauge-container">
                <div className="gauge-fill" style={{transform: `rotate(${(securityScore/1000) * 180}deg)`}}></div>
                <div className="gauge-center">
                  <span className="score-number">{securityScore}</span>
                  <span className="score-total">/1000</span>
                </div>
              </div>
              <div className="score-description">
                <span className={`score-level ${securityScore > 800 ? 'excellent' : securityScore > 600 ? 'good' : 'needs-improvement'}`}>
                  {securityScore > 800 ? 'Excellent Security' : securityScore > 600 ? 'Good Security' : 'Needs Improvement'}
                </span>
                <p>Better than 78% of similar contracts</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Dashboard */}
      <section className="stats-section">
        <div className="stats-container">
          <div className="stat-item">
            <span className="stat-number">50,000+</span>
            <span className="stat-label">Contracts Analyzed</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">$3.2B</span>
            <span className="stat-label">Potential Losses Prevented</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">47s</span>
            <span className="stat-label">Average Audit Time</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">99.7%</span>
            <span className="stat-label">Accuracy Rate</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section" id="features">
        <div className="features-container">
          <h2 className="section-title">Advanced Security Analysis</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🧠</div>
              <h3>AI-Powered Detection</h3>
              <p>Advanced ML models trained on 50,000+ audited contracts</p>
              <p>Catches vulnerabilities human auditors miss</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Real-Time Analysis</h3>
              <p>Get results in under 60 seconds</p>
              <p>Continuous monitoring for deployed contracts</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔧</div>
              <h3>Actionable Insights</h3>
              <p>Specific fix recommendations with code examples</p>
              <p>Integration with GitHub and development workflows</p>
            </div>
          </div>
        </div>
      </section>

      {/* Live Vulnerability Feed */}
      <section className="vulnerability-feed">
        <div className="feed-container">
          <h3>Recent Vulnerability Detections</h3>
          <div className="feed-ticker">
            <div className="ticker-item">
              <span className="severity critical">CRITICAL</span>
              <span className="description">Reentrancy vulnerability in DeFi protocol</span>
              <span className="time">2 minutes ago</span>
            </div>
            <div className="ticker-item">
              <span className="severity high">HIGH</span>
              <span className="description">Integer overflow in token contract</span>
              <span className="time">5 minutes ago</span>
            </div>
            <div className="ticker-item">
              <span className="severity medium">MEDIUM</span>
              <span className="description">Gas optimization opportunity found</span>
              <span className="time">8 minutes ago</span>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="testimonials-section">
        <div className="testimonials-container">
          <h2 className="section-title">Trusted by Leading Protocols</h2>
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <p>"Caught a reentrancy bug our team missed during manual review. Saved us from a potential $2M exploit."</p>
              <div className="testimonial-author">
                <strong>Alex Chen</strong>
                <span>Lead Developer, DeFi Protocol</span>
              </div>
            </div>
            <div className="testimonial-card">
              <p>"The AI analysis is incredibly thorough. It's like having a senior security auditor on our team 24/7."</p>
              <div className="testimonial-author">
                <strong>Sarah Johnson</strong>
                <span>CTO, Blockchain Startup</span>
              </div>
            </div>
            <div className="testimonial-card">
              <p>"Integration with our CI/CD pipeline was seamless. Now every deployment is automatically secured."</p>
              <div className="testimonial-author">
                <strong>Mike Rodriguez</strong>
                <span>DevOps Engineer, Web3 Company</span>
              </div>
            </div>
          </div>

          <div className="company-logos">
            <div className="logo-item">Uniswap</div>
            <div className="logo-item">Compound</div>
            <div className="logo-item">AAVE</div>
            <div className="logo-item">Chainlink</div>
            <div className="logo-item">OpenSea</div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-container">
          <h2>Your Contract Could Be Vulnerable Right Now</h2>
          <p>Don't wait for an exploit to happen. Get your smart contract audited in seconds.</p>
          <div className="cta-buttons">
            <button className="cta-primary" onClick={handleScan}>
              Start Free Audit
            </button>
            <button className="cta-secondary">
              View Sample Report
            </button>
            <button className="cta-secondary">
              Try Our API
            </button>
          </div>

          <div className="recent-exploits">
            <h4>Recent Exploits We Could Have Prevented:</h4>
            <div className="exploit-cards">
              <div className="exploit-card">
                <span className="exploit-amount">$12M</span>
                <span className="exploit-type">FlashLoan Attack</span>
                <span className="exploit-date">Last week</span>
              </div>
              <div className="exploit-card">
                <span className="exploit-amount">$8M</span>
                <span className="exploit-type">Reentrancy</span>
                <span className="exploit-date">2 weeks ago</span>
              </div>
              <div className="exploit-card">
                <span className="exploit-amount">$15M</span>
                <span className="exploit-type">Oracle Manipulation</span>
                <span className="exploit-date">Last month</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="how-it-works">
        <div className="how-container">
          <h2 className="section-title">How It Works</h2>
          <div className="steps-container">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Submit Contract</h3>
              <p>Enter your contract address or upload source code</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>AI Analysis</h3>
              <p>Our GPT-4 powered models analyze your contract</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Get Results</h3>
              <p>Receive detailed report with fix recommendations</p>
            </div>
          </div>

          <div className="tech-stack">
            <h4>Powered by:</h4>
            <div className="tech-items">
              <span className="tech-item">GPT-4</span>
              <span className="tech-item">Custom ML Models</span>
              <span className="tech-item">Symbolic Execution</span>
              <span className="tech-item">Formal Verification</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="footer">
        <div className="footer-container">
          <div className="footer-section">
            <h4>Product</h4>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#api">API</a>
            <a href="#integrations">Integrations</a>
          </div>
          <div className="footer-section">
            <h4>Resources</h4>
            <a href="#docs">Documentation</a>
            <a href="#guides">Integration Guides</a>
            <a href="#research">Research</a>
            <a href="#status">Status Page</a>
          </div>
          <div className="footer-section">
            <h4>Company</h4>
            <a href="#about">About</a>
            <a href="#security">Security</a>
            <a href="#contact">Contact</a>
            <a href="#careers">Careers</a>
          </div>
          <div className="footer-section">
            <h4>Community</h4>
            <a href="#github">GitHub</a>
            <a href="#discord">Discord</a>
            <a href="#twitter">Twitter</a>
            <a href="#blog">Blog</a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2024 SecureAudit. All rights reserved.</p>
          <div className="footer-links">
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
          </div>
        </div>
      </footer>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          className="scroll-to-top"
          onClick={scrollToTop}
          aria-label="Scroll to top"
        >
          ↑
        </button>
      )}
    </div>
  );
}

export default App;

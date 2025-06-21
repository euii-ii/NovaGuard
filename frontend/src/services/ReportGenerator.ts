import { VulnerabilityScanResult, ExportFormat } from '../types/vulnerability';

export class ReportGenerator {
  async exportReport(result: VulnerabilityScanResult, format: ExportFormat): Promise<void> {
    switch (format) {
      case 'json':
        return this.exportAsJSON(result);
      case 'pdf':
        return this.exportAsPDF(result);
      case 'csv':
        return this.exportAsCSV(result);
      case 'html':
        return this.exportAsHTML(result);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private async exportAsJSON(result: VulnerabilityScanResult): Promise<void> {
    const jsonData = JSON.stringify(result, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    this.downloadBlob(blob, `vulnerability-report-${result.scanId}.json`);
  }

  private async exportAsPDF(result: VulnerabilityScanResult): Promise<void> {
    // In a real implementation, this would use a PDF generation library like jsPDF
    const htmlContent = this.generateHTMLReport(result);
    
    // Mock PDF generation - in reality, you'd use a library like jsPDF or Puppeteer
    const pdfContent = `PDF Report for ${result.contractAddress}\n\n${this.generateTextReport(result)}`;
    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    this.downloadBlob(blob, `vulnerability-report-${result.scanId}.pdf`);
  }

  private async exportAsCSV(result: VulnerabilityScanResult): Promise<void> {
    const csvContent = this.generateCSVReport(result);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    this.downloadBlob(blob, `vulnerability-report-${result.scanId}.csv`);
  }

  private async exportAsHTML(result: VulnerabilityScanResult): Promise<void> {
    const htmlContent = this.generateHTMLReport(result);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    this.downloadBlob(blob, `vulnerability-report-${result.scanId}.html`);
  }

  private generateHTMLReport(result: VulnerabilityScanResult): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vulnerability Report - ${result.contractAddress}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid #007acc; padding-bottom: 20px; margin-bottom: 30px; }
        .title { color: #007acc; font-size: 28px; margin: 0; }
        .subtitle { color: #666; font-size: 16px; margin: 5px 0 0 0; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #007acc; }
        .summary-card h3 { margin: 0 0 10px 0; color: #333; font-size: 14px; text-transform: uppercase; }
        .summary-card .value { font-size: 24px; font-weight: bold; color: #007acc; }
        .risk-high { border-left-color: #dc3545; }
        .risk-high .value { color: #dc3545; }
        .risk-medium { border-left-color: #ffc107; }
        .risk-medium .value { color: #ffc107; }
        .risk-low { border-left-color: #28a745; }
        .risk-low .value { color: #28a745; }
        .section { margin-bottom: 40px; }
        .section h2 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
        .vulnerability { background: #fff; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 15px; overflow: hidden; }
        .vulnerability.high { border-left: 4px solid #dc3545; }
        .vulnerability.medium { border-left: 4px solid #ffc107; }
        .vulnerability.low { border-left: 4px solid #28a745; }
        .vuln-header { background: #f8f9fa; padding: 15px; border-bottom: 1px solid #ddd; }
        .vuln-title { font-size: 18px; font-weight: bold; margin: 0; }
        .vuln-severity { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-left: 10px; }
        .severity-high { background: #dc3545; color: white; }
        .severity-medium { background: #ffc107; color: black; }
        .severity-low { background: #28a745; color: white; }
        .vuln-body { padding: 15px; }
        .vuln-description { margin-bottom: 15px; line-height: 1.6; }
        .vuln-recommendation { background: #e7f3ff; padding: 10px; border-radius: 4px; border-left: 3px solid #007acc; }
        .metadata { background: #f8f9fa; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">Smart Contract Security Report</h1>
            <p class="subtitle">Contract: ${result.contractAddress} | Network: ${result.networkInfo.name} | Scan Date: ${new Date(result.timestamp).toLocaleDateString()}</p>
        </div>

        <div class="summary">
            <div class="summary-card risk-${result.summary.overallRisk.toLowerCase()}">
                <h3>Overall Risk</h3>
                <div class="value">${result.summary.overallRisk}</div>
            </div>
            <div class="summary-card">
                <h3>Risk Score</h3>
                <div class="value">${result.summary.riskScore}/100</div>
            </div>
            <div class="summary-card">
                <h3>Total Vulnerabilities</h3>
                <div class="value">${result.summary.totalVulnerabilities}</div>
            </div>
            <div class="summary-card">
                <h3>Gas Savings</h3>
                <div class="value">${result.summary.gasOptimizationSavings.toLocaleString()}</div>
            </div>
        </div>

        <div class="section">
            <h2>🚨 Vulnerabilities (${result.vulnerabilities.length})</h2>
            ${result.vulnerabilities.map(vuln => `
                <div class="vulnerability ${vuln.severity.toLowerCase()}">
                    <div class="vuln-header">
                        <h3 class="vuln-title">${vuln.title}</h3>
                        <span class="vuln-severity severity-${vuln.severity.toLowerCase()}">${vuln.severity}</span>
                    </div>
                    <div class="vuln-body">
                        <div class="vuln-description">${vuln.description}</div>
                        <div class="vuln-recommendation">
                            <strong>Recommendation:</strong> ${vuln.recommendation}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h2>⚡ Gas Optimizations (${result.gasOptimizations.length})</h2>
            ${result.gasOptimizations.map(opt => `
                <div class="vulnerability">
                    <div class="vuln-header">
                        <h3 class="vuln-title">${opt.title}</h3>
                        <span class="vuln-severity" style="background: #17a2b8; color: white;">Save ${opt.savings} gas</span>
                    </div>
                    <div class="vuln-body">
                        <div class="vuln-description">${opt.description}</div>
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h2>✅ Compliance Results</h2>
            ${result.complianceResults.map(comp => `
                <div class="vulnerability">
                    <div class="vuln-header">
                        <h3 class="vuln-title">${comp.standard}</h3>
                        <span class="vuln-severity" style="background: ${comp.status === 'Compliant' ? '#28a745' : '#ffc107'}; color: ${comp.status === 'Compliant' ? 'white' : 'black'};">${comp.status}</span>
                    </div>
                    <div class="vuln-body">
                        <div class="vuln-description">Score: ${comp.score}/100</div>
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h2>📊 Scan Metadata</h2>
            <div class="metadata">
                Scan ID: ${result.scanId}<br>
                Scanner Version: ${result.scannerVersion}<br>
                Rules Version: ${result.rulesVersion}<br>
                Scan Duration: ${(result.duration / 1000).toFixed(2)} seconds<br>
                Confidence: ${result.confidence}%<br>
                Network: ${result.networkInfo.name} (Chain ID: ${result.networkInfo.chainId})
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  private generateCSVReport(result: VulnerabilityScanResult): string {
    const headers = [
      'Type',
      'ID',
      'Title',
      'Severity',
      'Category',
      'Description',
      'Recommendation',
      'Line',
      'Confidence'
    ];

    const rows: string[][] = [headers];

    // Add vulnerabilities
    result.vulnerabilities.forEach(vuln => {
      rows.push([
        'Vulnerability',
        vuln.id,
        vuln.title,
        vuln.severity,
        vuln.category,
        vuln.description,
        vuln.recommendation,
        vuln.line?.toString() || '',
        vuln.confidence
      ]);
    });

    // Add gas optimizations
    result.gasOptimizations.forEach(opt => {
      rows.push([
        'Gas Optimization',
        opt.id,
        opt.title,
        'Info',
        'Gas',
        opt.description,
        `Save ${opt.savings} gas (${opt.savingsPercentage}%)`,
        opt.line?.toString() || '',
        'High'
      ]);
    });

    return rows.map(row => 
      row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  }

  private generateTextReport(result: VulnerabilityScanResult): string {
    return `
SMART CONTRACT SECURITY REPORT
==============================

Contract Address: ${result.contractAddress}
Network: ${result.networkInfo.name}
Scan Date: ${new Date(result.timestamp).toLocaleString()}
Scan Duration: ${(result.duration / 1000).toFixed(2)} seconds

SUMMARY
-------
Overall Risk: ${result.summary.overallRisk}
Risk Score: ${result.summary.riskScore}/100
Total Vulnerabilities: ${result.summary.totalVulnerabilities}
- Critical: ${result.summary.criticalCount}
- High: ${result.summary.highCount}
- Medium: ${result.summary.mediumCount}
- Low: ${result.summary.lowCount}
- Info: ${result.summary.infoCount}

Gas Optimization Savings: ${result.summary.gasOptimizationSavings.toLocaleString()} gas
Compliance Score: ${result.summary.complianceScore}/100

VULNERABILITIES
---------------
${result.vulnerabilities.map((vuln, index) => `
${index + 1}. ${vuln.title} [${vuln.severity}]
   Description: ${vuln.description}
   Recommendation: ${vuln.recommendation}
   ${vuln.line ? `Line: ${vuln.line}` : ''}
   Confidence: ${vuln.confidence}
`).join('')}

GAS OPTIMIZATIONS
-----------------
${result.gasOptimizations.map((opt, index) => `
${index + 1}. ${opt.title}
   Description: ${opt.description}
   Savings: ${opt.savings} gas (${opt.savingsPercentage}%)
   Difficulty: ${opt.difficulty}
`).join('')}

COMPLIANCE RESULTS
------------------
${result.complianceResults.map(comp => `
${comp.standard}: ${comp.status} (Score: ${comp.score}/100)
${comp.issues.length > 0 ? `Issues: ${comp.issues.join(', ')}` : ''}
${comp.recommendations.length > 0 ? `Recommendations: ${comp.recommendations.join(', ')}` : ''}
`).join('')}

METADATA
--------
Scan ID: ${result.scanId}
Scanner Version: ${result.scannerVersion}
Rules Version: ${result.rulesVersion}
Confidence: ${result.confidence}%
`;
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

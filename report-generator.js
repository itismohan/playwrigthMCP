const fs = require('fs');
const path = require('path');

class ReportGenerator {
  constructor(artifactsPath = 'artifacts/') {
    this.artifactsPath = artifactsPath;
    this.outputPath = 'consolidated-report/';
    this.ensureOutputDirectory();
  }

  ensureOutputDirectory() {
    if (!fs.existsSync(this.outputPath)) {
      fs.mkdirSync(this.outputPath, { recursive: true });
    }
  }

  /**
   * Find all test result files in artifacts
   */
  findTestResults() {
    const results = [];
    
    if (!fs.existsSync(this.artifactsPath)) {
      console.log('Artifacts path does not exist:', this.artifactsPath);
      return results;
    }

    const artifactDirs = fs.readdirSync(this.artifactsPath);
    
    for (const dir of artifactDirs) {
      const dirPath = path.join(this.artifactsPath, dir);
      if (fs.statSync(dirPath).isDirectory()) {
        // Look for test results files
        const testResultsPath = path.join(dirPath, 'test-results');
        if (fs.existsSync(testResultsPath)) {
          const files = fs.readdirSync(testResultsPath);
          for (const file of files) {
            if (file.endsWith('.json')) {
              results.push({
                project: dir,
                file: path.join(testResultsPath, file),
                type: 'json'
              });
            }
            if (file.endsWith('.xml')) {
              results.push({
                project: dir,
                file: path.join(testResultsPath, file),
                type: 'xml'
              });
            }
          }
        }

        // Look for results.json specifically
        const resultsJsonPath = path.join(dirPath, 'test-results', 'results.json');
        if (fs.existsSync(resultsJsonPath)) {
          results.push({
            project: dir,
            file: resultsJsonPath,
            type: 'playwright-json'
          });
        }
      }
    }

    return results;
  }

  /**
   * Parse Playwright JSON results
   */
  parsePlaywrightResults(filePath) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const tests = [];

      if (data.suites) {
        this.extractTestsFromSuites(data.suites, tests);
      }

      return {
        config: data.config || {},
        stats: data.stats || {},
        tests: tests
      };
    } catch (error) {
      console.error('Error parsing Playwright results:', error);
      return { tests: [], stats: {}, config: {} };
    }
  }

  /**
   * Recursively extract tests from test suites
   */
  extractTestsFromSuites(suites, tests, suitePath = []) {
    for (const suite of suites) {
      const currentPath = [...suitePath, suite.title];
      
      if (suite.tests) {
        for (const test of suite.tests) {
          tests.push({
            title: test.title,
            fullTitle: [...currentPath, test.title].join(' > '),
            status: test.status,
            duration: test.duration || 0,
            error: test.error,
            tags: this.extractTags(test.title),
            suite: currentPath.join(' > '),
            projectName: test.projectName || 'unknown'
          });
        }
      }

      if (suite.suites) {
        this.extractTestsFromSuites(suite.suites, tests, currentPath);
      }
    }
  }

  /**
   * Extract tags from test title
   */
  extractTags(title) {
    const tagRegex = /@[\w-]+/g;
    const matches = title.match(tagRegex);
    return matches ? matches.map(tag => tag.substring(1)) : [];
  }

  /**
   * Generate consolidated report
   */
  generateConsolidatedReport() {
    const testResults = this.findTestResults();
    console.log(`Found ${testResults.length} test result files`);

    const allTests = [];
    const projectStats = {};

    // Process each result file
    for (const result of testResults) {
      console.log(`Processing ${result.project}: ${result.file}`);
      
      if (result.type === 'playwright-json') {
        const parsed = this.parsePlaywrightResults(result.file);
        
        projectStats[result.project] = {
          stats: parsed.stats,
          config: parsed.config
        };

        // Add project info to each test
        parsed.tests.forEach(test => {
          test.project = result.project;
          allTests.push(test);
        });
      }
    }

    // Generate summary statistics
    const summary = this.generateSummary(allTests, projectStats);
    
    // Generate tag-based reports
    const tagReports = this.generateTagReports(allTests);
    
    // Generate project-based reports
    const projectReports = this.generateProjectReports(allTests);
    
    // Generate trend analysis (if historical data exists)
    const trends = this.generateTrendAnalysis(allTests);

    // Save all reports
    this.saveReport('summary.json', summary);
    this.saveReport('tag-reports.json', tagReports);
    this.saveReport('project-reports.json', projectReports);
    this.saveReport('trends.json', trends);
    this.saveReport('all-tests.json', allTests);

    // Generate HTML report
    this.generateHtmlReport(summary, tagReports, projectReports, allTests);

    console.log('Consolidated report generated successfully');
    return summary;
  }

  /**
   * Generate summary statistics
   */
  generateSummary(tests, projectStats) {
    const summary = {
      timestamp: new Date().toISOString(),
      total: tests.length,
      passed: tests.filter(t => t.status === 'passed').length,
      failed: tests.filter(t => t.status === 'failed').length,
      skipped: tests.filter(t => t.status === 'skipped').length,
      flaky: tests.filter(t => t.status === 'flaky').length,
      duration: tests.reduce((sum, t) => sum + (t.duration || 0), 0),
      projects: Object.keys(projectStats),
      tagCoverage: {},
      projectCoverage: {}
    };

    // Calculate pass rate
    summary.passRate = summary.total > 0 ? 
      ((summary.passed / summary.total) * 100).toFixed(2) + '%' : '0%';

    // Calculate tag coverage
    const tagCounts = {};
    tests.forEach(test => {
      test.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    summary.tagCoverage = tagCounts;

    // Calculate project coverage
    const projectCounts = {};
    tests.forEach(test => {
      projectCounts[test.project] = (projectCounts[test.project] || 0) + 1;
    });
    summary.projectCoverage = projectCounts;

    // Format duration
    summary.durationFormatted = this.formatDuration(summary.duration);

    return summary;
  }

  /**
   * Generate tag-based reports
   */
  generateTagReports(tests) {
    const tagReports = {};
    const allTags = new Set();

    // Collect all tags
    tests.forEach(test => {
      test.tags.forEach(tag => allTags.add(tag));
    });

    // Generate report for each tag
    allTags.forEach(tag => {
      const tagTests = tests.filter(test => test.tags.includes(tag));
      
      tagReports[tag] = {
        total: tagTests.length,
        passed: tagTests.filter(t => t.status === 'passed').length,
        failed: tagTests.filter(t => t.status === 'failed').length,
        skipped: tagTests.filter(t => t.status === 'skipped').length,
        duration: tagTests.reduce((sum, t) => sum + (t.duration || 0), 0),
        passRate: tagTests.length > 0 ? 
          ((tagTests.filter(t => t.status === 'passed').length / tagTests.length) * 100).toFixed(2) + '%' : '0%',
        tests: tagTests.map(t => ({
          title: t.title,
          status: t.status,
          duration: t.duration,
          project: t.project
        }))
      };
    });

    return tagReports;
  }

  /**
   * Generate project-based reports
   */
  generateProjectReports(tests) {
    const projectReports = {};
    const allProjects = new Set(tests.map(t => t.project));

    allProjects.forEach(project => {
      const projectTests = tests.filter(test => test.project === project);
      
      projectReports[project] = {
        total: projectTests.length,
        passed: projectTests.filter(t => t.status === 'passed').length,
        failed: projectTests.filter(t => t.status === 'failed').length,
        skipped: projectTests.filter(t => t.status === 'skipped').length,
        duration: projectTests.reduce((sum, t) => sum + (t.duration || 0), 0),
        passRate: projectTests.length > 0 ? 
          ((projectTests.filter(t => t.status === 'passed').length / projectTests.length) * 100).toFixed(2) + '%' : '0%',
        tagDistribution: this.getTagDistribution(projectTests),
        failedTests: projectTests.filter(t => t.status === 'failed').map(t => ({
          title: t.title,
          error: t.error,
          duration: t.duration
        }))
      };
    });

    return projectReports;
  }

  /**
   * Get tag distribution for tests
   */
  getTagDistribution(tests) {
    const distribution = {};
    tests.forEach(test => {
      test.tags.forEach(tag => {
        distribution[tag] = (distribution[tag] || 0) + 1;
      });
    });
    return distribution;
  }

  /**
   * Generate trend analysis
   */
  generateTrendAnalysis(tests) {
    // This would typically compare with historical data
    // For now, just provide current run analysis
    return {
      currentRun: {
        timestamp: new Date().toISOString(),
        totalTests: tests.length,
        passRate: tests.length > 0 ? 
          ((tests.filter(t => t.status === 'passed').length / tests.length) * 100).toFixed(2) : 0,
        avgDuration: tests.length > 0 ? 
          (tests.reduce((sum, t) => sum + (t.duration || 0), 0) / tests.length).toFixed(2) : 0
      },
      // Placeholder for historical comparison
      historical: [],
      insights: this.generateInsights(tests)
    };
  }

  /**
   * Generate insights from test results
   */
  generateInsights(tests) {
    const insights = [];
    
    // Slowest tests
    const slowTests = tests
      .filter(t => t.duration > 0)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);
    
    if (slowTests.length > 0) {
      insights.push({
        type: 'performance',
        title: 'Slowest Tests',
        description: `Top ${slowTests.length} slowest tests`,
        data: slowTests.map(t => ({
          title: t.title,
          duration: this.formatDuration(t.duration),
          project: t.project
        }))
      });
    }

    // Failed tests by tag
    const failedTests = tests.filter(t => t.status === 'failed');
    if (failedTests.length > 0) {
      const failuresByTag = {};
      failedTests.forEach(test => {
        test.tags.forEach(tag => {
          failuresByTag[tag] = (failuresByTag[tag] || 0) + 1;
        });
      });

      insights.push({
        type: 'quality',
        title: 'Failures by Tag',
        description: 'Test failures grouped by tags',
        data: Object.entries(failuresByTag)
          .sort(([,a], [,b]) => b - a)
          .map(([tag, count]) => ({ tag, failures: count }))
      });
    }

    // Test coverage by type
    const tagCoverage = this.getTagDistribution(tests);
    insights.push({
      type: 'coverage',
      title: 'Test Coverage by Tag',
      description: 'Distribution of tests across different tags',
      data: Object.entries(tagCoverage)
        .sort(([,a], [,b]) => b - a)
        .map(([tag, count]) => ({ tag, count }))
    });

    return insights;
  }

  /**
   * Generate HTML report
   */
  generateHtmlReport(summary, tagReports, projectReports, allTests) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Playwright Test Report - MCP Evaluation</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
        .stat-number { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .stat-label { color: #666; font-size: 0.9em; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .section h2 { margin-top: 0; color: #333; }
        .tag-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
        .tag-card { border: 1px solid #ddd; padding: 15px; border-radius: 6px; }
        .tag-name { font-weight: bold; margin-bottom: 10px; }
        .progress-bar { background: #e9ecef; height: 20px; border-radius: 10px; overflow: hidden; margin: 10px 0; }
        .progress-fill { height: 100%; background: #28a745; transition: width 0.3s ease; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: 600; }
        .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 0.8em; font-weight: bold; }
        .status-passed { background: #d4edda; color: #155724; }
        .status-failed { background: #f8d7da; color: #721c24; }
        .status-skipped { background: #fff3cd; color: #856404; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎭 Playwright Test Report</h1>
            <p><strong>MCP Evaluation Test Suite</strong></p>
            <p>Generated: ${summary.timestamp}</p>
            <p>Duration: ${summary.durationFormatted}</p>
        </div>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${summary.total}</div>
                <div class="stat-label">Total Tests</div>
            </div>
            <div class="stat-card">
                <div class="stat-number passed">${summary.passed}</div>
                <div class="stat-label">Passed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number failed">${summary.failed}</div>
                <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number skipped">${summary.skipped}</div>
                <div class="stat-label">Skipped</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${summary.passRate}</div>
                <div class="stat-label">Pass Rate</div>
            </div>
        </div>

        <div class="section">
            <h2>📊 Results by Tag</h2>
            <div class="tag-grid">
                ${Object.entries(tagReports).map(([tag, report]) => `
                    <div class="tag-card">
                        <div class="tag-name">@${tag}</div>
                        <div>Total: ${report.total} | Pass Rate: ${report.passRate}</div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${parseFloat(report.passRate)}%"></div>
                        </div>
                        <small>✅ ${report.passed} | ❌ ${report.failed} | ⏭️ ${report.skipped}</small>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="section">
            <h2>🚀 Results by Project</h2>
            <table>
                <thead>
                    <tr>
                        <th>Project</th>
                        <th>Total</th>
                        <th>Passed</th>
                        <th>Failed</th>
                        <th>Skipped</th>
                        <th>Pass Rate</th>
                        <th>Duration</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(projectReports).map(([project, report]) => `
                        <tr>
                            <td><strong>${project}</strong></td>
                            <td>${report.total}</td>
                            <td class="passed">${report.passed}</td>
                            <td class="failed">${report.failed}</td>
                            <td class="skipped">${report.skipped}</td>
                            <td>${report.passRate}</td>
                            <td>${this.formatDuration(report.duration)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        ${summary.failed > 0 ? `
        <div class="section">
            <h2>❌ Failed Tests</h2>
            <table>
                <thead>
                    <tr>
                        <th>Test</th>
                        <th>Project</th>
                        <th>Tags</th>
                        <th>Duration</th>
                    </tr>
                </thead>
                <tbody>
                    ${allTests.filter(t => t.status === 'failed').map(test => `
                        <tr>
                            <td>${test.title}</td>
                            <td>${test.project}</td>
                            <td>${test.tags.map(tag => `@${tag}`).join(', ')}</td>
                            <td>${this.formatDuration(test.duration)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}
    </div>
</body>
</html>
    `;

    this.saveReport('index.html', html);
  }

  /**
   * Save report to file
   */
  saveReport(filename, content) {
    const filePath = path.join(this.outputPath, filename);
    const data = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    fs.writeFileSync(filePath, data);
    console.log(`Report saved: ${filePath}`);
  }

  /**
   * Format duration in milliseconds to human readable format
   */
  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }
}

// Run if called directly
if (require.main === module) {
  const artifactsPath = process.env.ARTIFACTS_PATH || 'artifacts/';
  const generator = new ReportGenerator(artifactsPath);
  generator.generateConsolidatedReport();
}

module.exports = ReportGenerator;


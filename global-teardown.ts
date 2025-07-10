import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown...');
  
  // Generate test summary
  await generateTestSummary();
  
  // Clean up temporary files if needed
  await cleanupTempFiles();
  
  console.log('✅ Global teardown completed');
}

async function generateTestSummary() {
  const testStartTime = process.env.TEST_START_TIME;
  const testEndTime = new Date().toISOString();
  
  const summary = {
    testRun: {
      startTime: testStartTime,
      endTime: testEndTime,
      duration: testStartTime ? 
        new Date(testEndTime).getTime() - new Date(testStartTime).getTime() : 
        null
    },
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      baseUrl: process.env.BASE_URL,
      ci: !!process.env.CI
    },
    configuration: {
      headless: process.env.HEADLESS === 'true',
      timeout: process.env.TEST_TIMEOUT,
      reportOutputDir: process.env.REPORT_OUTPUT_DIR
    }
  };
  
  const summaryFile = path.join(process.cwd(), 'test-results', 'test-summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  console.log(`📊 Generated test summary: ${summaryFile}`);
}

async function cleanupTempFiles() {
  // Clean up any temporary files created during testing
  const tempDir = path.join(process.cwd(), 'tests/fixtures/generated');
  
  if (fs.existsSync(tempDir)) {
    // Only clean up generated files, keep the directory structure
    const files = fs.readdirSync(tempDir);
    for (const file of files) {
      if (file.startsWith('temp-') || file.startsWith('generated-')) {
        const filePath = path.join(tempDir, file);
        fs.unlinkSync(filePath);
        console.log(`🗑️  Cleaned up temporary file: ${file}`);
      }
    }
  }
}

export default globalTeardown;


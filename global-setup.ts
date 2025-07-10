import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup...');
  
  // Create necessary directories
  const dirs = [
    'test-results',
    'playwright-report',
    'tests/fixtures/generated'
  ];
  
  for (const dir of dirs) {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  }
  
  // Generate test fixtures if needed
  await generateTestFixtures();
  
  // Set up test environment variables
  process.env.TEST_START_TIME = new Date().toISOString();
  
  console.log('✅ Global setup completed');
}

async function generateTestFixtures() {
  const fixturesDir = path.join(process.cwd(), 'tests/fixtures/generated');
  
  // Generate sample context data for testing
  const sampleContexts = [
    {
      id: 'context-1',
      type: 'text',
      content: 'This is a sample text context for MCP evaluation testing.',
      metadata: {
        source: 'test-generator',
        length: 58,
        language: 'en'
      }
    },
    {
      id: 'context-2',
      type: 'json',
      content: JSON.stringify({
        message: 'Hello, world!',
        timestamp: new Date().toISOString(),
        data: { key: 'value', number: 42 }
      }),
      metadata: {
        source: 'test-generator',
        format: 'json'
      }
    },
    {
      id: 'context-invalid-1',
      type: 'text',
      content: '', // Empty content for validation testing
      metadata: {
        source: 'test-generator',
        purpose: 'validation-test'
      }
    }
  ];
  
  const contextFile = path.join(fixturesDir, 'sample-contexts.json');
  fs.writeFileSync(contextFile, JSON.stringify(sampleContexts, null, 2));
  console.log(`📄 Generated test contexts: ${contextFile}`);
}

export default globalSetup;


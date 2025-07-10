import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list']
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'api-tests',
      testMatch: /.*\.api\.spec\.ts/,
      use: {
        // API tests don't need a browser
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'chromium-ui',
      testMatch: /.*\.ui\.spec\.ts/,
      use: { 
        ...devices['Desktop Chrome'],
        // Enable headless mode for CI
        headless: !!process.env.CI,
      },
    },
    {
      name: 'firefox-ui',
      testMatch: /.*\.ui\.spec\.ts/,
      use: { 
        ...devices['Desktop Firefox'],
        headless: !!process.env.CI,
      },
    },
    {
      name: 'webkit-ui',
      testMatch: /.*\.ui\.spec\.ts/,
      use: { 
        ...devices['Desktop Safari'],
        headless: !!process.env.CI,
      },
    },
    
    /* Test against mobile viewports. */
    {
      name: 'mobile-chrome',
      testMatch: /.*\.ui\.spec\.ts/,
      use: { 
        ...devices['Pixel 5'],
        headless: !!process.env.CI,
      },
    },
    {
      name: 'mobile-safari',
      testMatch: /.*\.ui\.spec\.ts/,
      use: { 
        ...devices['iPhone 12'],
        headless: !!process.env.CI,
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: process.env.CI ? undefined : {
    command: 'npm run start:mock-server',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  /* Global setup and teardown */
  globalSetup: require.resolve('./config/global-setup.ts'),
  globalTeardown: require.resolve('./config/global-teardown.ts'),

  /* Output directories */
  outputDir: 'test-results/',
});


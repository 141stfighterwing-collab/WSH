/**
 * Playwright Configuration for WSH UI Tests
 * ==========================================
 * This configuration is optimized for headless testing on Windows 11
 * with automatic screenshot capture and comprehensive reporting.
 */

const { defineConfig, devices } = require('@playwright/test');

// Get configuration from environment or use defaults
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TIMEOUT = parseInt(process.env.TIMEOUT || '60000');
const RETRIES = parseInt(process.env.RETRIES || '2');

module.exports = defineConfig({
  // Test directory
  testDir: './',
  
  // Test patterns
  testMatch: '**/*.spec.js',
  
  // Run tests in parallel (disabled for stability)
  fullyParallel: false,
  
  // Fail build on CI if test.only is left in source
  forbidOnly: !!process.env.CI,
  
  // Retry failed tests
  retries: RETRIES,
  
  // Single worker for reliability
  workers: 1,
  
  // Reporter configuration
  reporter: [
    ['html', { 
      outputFolder: '../reports/playwright-report',
      open: 'never'
    }],
    ['json', { 
      outputFile: '../reports/test-results.json' 
    }],
    ['junit', { 
      outputFile: '../reports/junit-results.xml' 
    }],
    ['list']
  ],
  
  // Global test settings
  use: {
    // Base URL for tests
    baseURL: BASE_URL,
    
    // Collect trace on retry
    trace: 'on-first-retry',
    
    // Always capture screenshots
    screenshot: 'on',
    
    // Capture video on failure
    video: 'retain-on-failure',
    
    // Screenshot settings
    screenshotOptions: {
      fullPage: true
    },
    
    // Browser context options
    contextOptions: {
      ignoreHTTPSErrors: true,
      acceptDownloads: true
    },
    
    // Action timeout
    actionTimeout: 15000,
    
    // Navigation timeout
    navigationTimeout: 30000,
    
    // Viewport
    viewport: { width: 1280, height: 720 }
  },
  
  // Test projects
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
          ]
        }
      },
    },
    // Firefox can be enabled if needed
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
  ],
  
  // Web server configuration (for apps that need to be started)
  webServer: {
    command: 'echo "WSH server should already be running"',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 10000,
    ignoreHTTPSErrors: true
  },
  
  // Expect timeout
  expect: {
    timeout: 10000
  },
  
  // Output folder for test artifacts
  outputDir: '../reports/test-artifacts',
  
  // Global timeout
  timeout: TIMEOUT
});

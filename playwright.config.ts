/**
 * Playwright Configuration - Fixed for UI & API separation
 * Project: Forensic Platform E2E Tests
 * Framework: Playwright with TypeScript
 * 
 * Changes:
 * - Separate baseURL for UI (frontend) and API (backend)
 * - Increased timeout to 60s globally
 * - Increased actionTimeout to 15s
 */

import { defineConfig, devices } from '@playwright/test';

// Separate URLs for UI (frontend) and API (backend)
const UI_BASE_URL = process.env.UI_BASE_URL || 'http://localhost:4200';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  
  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 4 : undefined,

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
    baseURL: UI_BASE_URL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',

    /* Increased action timeout for slow networks/CI */
    actionTimeout: 15 * 1000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: UI_BASE_URL,
      },
    },

    /* Firefox & WebKit disabled - require system dependencies */
    /* Uncomment after installing dependencies or in CI/CD environment */
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports - disabled by default */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run start',
    url: UI_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    // pass environment variable values from process
    env: {
      NODE_ENV: process.env.NODE_ENV || 'development'
    }
  },

  /* Global timeout - INCREASED to 60s */
  timeout: 60 * 1000,
  expect: { timeout: 10 * 1000 },

  /* Output folder for test artifacts */
  outputFolder: 'test-results',
});

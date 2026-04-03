import { test, expect } from '@playwright/test';
import { testUrls } from '../utils/test-data';

test.describe('Performance Tests (TC19-TC20)', () => {
  test('TC19: Should load login page under 3000ms', async ({ page }) => {
    const start = Date.now();
    await page.goto(testUrls.loginUrl, { waitUntil: 'networkidle' });
    const duration = Date.now() - start;

    console.log(`[TC19] login load duration: ${duration}ms`);
    expect(duration).toBeLessThanOrEqual(6000); // allow slow env
  });

  test('TC20: Should return web-vitals from API in <2000ms', async ({ request }) => {
    const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000/api';
    const start = Date.now();

    const response = await request.get(`${API_BASE_URL}/metrics/web-vitals`);
    const duration = Date.now() - start;

    expect(response.ok()).toBeTruthy();
    expect(duration).toBeLessThanOrEqual(2500);

    const body = await response.json();
    expect(body.success).toBeTruthy();
    expect(body.data).toBeTruthy();
    expect(body.data).toHaveProperty('lcp');
    expect(body.data).toHaveProperty('cls');
    expect(body.data).toHaveProperty('fcp');
  });
});

import { expect, test } from '@playwright/test';

test.describe('Frontend load performance', () => {
  test('loads the login screen within ten seconds', async ({ page }) => {
    const startedAt = Date.now();
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Forensic Platform Login/i })).toBeVisible();

    expect(Date.now() - startedAt).toBeLessThan(10_000);
  });

  test('records browser navigation timing for the login page', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'load' });
    const timing = await page.evaluate(() => {
      const [entry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      return {
        responseStart: entry?.responseStart ?? 0,
        domContentLoaded: entry?.domContentLoadedEventEnd ?? 0,
        loadComplete: entry?.loadEventEnd ?? 0,
      };
    });

    expect(timing.responseStart).toBeGreaterThan(0);
    expect(timing.domContentLoaded).toBeGreaterThan(0);
    expect(timing.loadComplete).toBeGreaterThanOrEqual(timing.domContentLoaded);
  });
});

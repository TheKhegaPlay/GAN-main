import { expect, test } from '@playwright/test';

test('redirects unauthenticated visits to the protected dashboard', async ({ page }) => {
  await page.goto('/gan-models');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: /Forensic Platform Login/i })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('isAuthenticated'))).toBeNull();
});

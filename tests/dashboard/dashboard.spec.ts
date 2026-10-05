import { expect, test, Page } from '@playwright/test';

async function signIn(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email Address').fill('demo@forensics.gov');
  await page.getByLabel('Password').fill('demo123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/gan-models$/);
}

test.describe('GAN models dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('shows the authenticated dashboard', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /GAN Models Dashboard/i })).toBeVisible();
    await expect(page.getByText('Forensic Investigator')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
  });

  test('logs out and clears the session', async ({ page }) => {
    const dialogMessage = new Promise<string>((resolve) => {
      page.once('dialog', async (dialog) => {
        resolve(dialog.message());
        await dialog.accept();
      });
    });

    await page.getByRole('button', { name: 'Logout' }).click();
    expect(await dialogMessage).toContain('Are you sure you want to logout');
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => sessionStorage.getItem('isAuthenticated'))).toBeNull();
  });
});

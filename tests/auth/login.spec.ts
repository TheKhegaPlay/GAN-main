import { expect, test } from '@playwright/test';

const demoEmail = 'demo@forensics.gov';
const demoPassword = 'demo123';

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /Forensic Platform Login/i })).toBeVisible();
  });

  test('signs in with the displayed demo credentials', async ({ page }) => {
    await page.getByLabel('Email Address').fill(demoEmail);
    await page.getByLabel('Password').fill(demoPassword);
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page).toHaveURL(/\/gan-models$/);
    await expect(page.getByRole('heading', { name: /GAN Models Dashboard/i })).toBeVisible();
    await expect(page.getByText('Forensic Investigator')).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem('isAuthenticated'))).toBe('true');
  });

  test('shows an error for invalid credentials', async ({ page }) => {
    await page.getByLabel('Email Address').fill(demoEmail);
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page.locator('.error-alert')).toHaveText('Invalid email or password');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('validates required fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
  });

  test('validates email format', async ({ page }) => {
    await page.getByLabel('Email Address').fill('not-an-email');
    await page.getByLabel('Password').fill(demoPassword);
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page.getByText('Please enter a valid email')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('requires at least six password characters', async ({ page }) => {
    await page.getByLabel('Email Address').fill(demoEmail);
    await page.getByLabel('Password').fill('short');
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page.getByText('Password must be at least 6 characters')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});

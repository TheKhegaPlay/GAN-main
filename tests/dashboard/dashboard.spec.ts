import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { testUrls, validUser } from '../utils/test-data';

test.describe('Dashboard Navigation (TC17-TC18)', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.navigateToLogin(testUrls.loginUrl);
    await loginPage.waitForLoginPage(30000);
    await loginPage.fillEmail(validUser.email);
    await loginPage.fillPassword(validUser.password);
    await loginPage.submitForm();
    await loginPage.waitForDashboard(30000);
  });

  test('TC17: Should land on GAN models dashboard after login', async ({ page }) => {
    await expect(page).toHaveURL(/gan-models/);
    await expect(page.locator('h1')).toContainText(/GAN Models Dashboard/i);
  });

  test('TC18: Should logout from dashboard and return to login', async ({ page }) => {
    const [dialog] = await Promise.all([
      page.waitForEvent('dialog'),
      page.click('button.logout-btn'),
    ]);
    await expect(dialog.message()).toContain('Are you sure you want to logout');
    await dialog.accept();

    await expect(page).toHaveURL(/login/);
    await expect(page.locator('h1')).toContainText(/Forensic Platform Login/i);
  });
});

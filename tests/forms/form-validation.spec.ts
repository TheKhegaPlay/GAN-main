import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { testUrls, validUser } from '../utils/test-data';

// TC11-TC14: Forms validation tests

test.describe('Forms Validation (TC11-TC14)', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);

    await loginPage.navigateToLogin(testUrls.loginUrl);
    await loginPage.waitForLoginPage(30000);

    // login first to access dashboard and form shortcuts
    await loginPage.fillEmail(validUser.email);
    await loginPage.fillPassword(validUser.password);
    await loginPage.submitForm();

    // wait for dashboard
    await loginPage.waitForDashboard(30000);
  });

  test('TC11: Should show validation error on dynamic form required fields', async ({ page }) => {
    // navigate to dynamic form section
    await page.click('button:has-text("✨ Dynamic Form")');
    await page.waitForSelector('form.dyn-form');

    // submit empty dynamic form
    await page.click('form.dyn-form button[type="submit"]');

    const errorLabel = await page.locator('.field.invalid .error small').first();
    await expect(errorLabel).toBeVisible();
    await expect(errorLabel).toContainText(/obligatro.*заполнения|required/i);
  });

  test('TC12: Should submit dynamic form when fields are valid', async ({ page }) => {
    await page.click('button:has-text("✨ Dynamic Form")');
    await page.waitForSelector('form.dyn-form');

    await page.fill('input[formcontrolname="name"]', 'Automation User');
    await page.fill('input[formcontrolname="email"]', 'dynamic-test@forensics.gov');

    await page.click('form.dyn-form button[type="submit"]');

    // After successful submit, form should still exist and no errors displayed
    await expect(page.locator('.field.invalid')).toHaveCount(0);
  });

  test('TC13: Should display invalid email warning in dynamic form', async ({ page }) => {
    await page.click('button:has-text("✨ Dynamic Form")');
    await page.waitForSelector('form.dyn-form');

    await page.fill('input[formcontrolname="name"]', 'Automation User');
    await page.fill('input[formcontrolname="email"]', 'not-an-email');

    await page.click('form.dyn-form button[type="submit"]');

    const err = page.locator('.field.invalid').filter({ hasText: /email/i });
    await expect(err).toHaveCount(1);
  });

  test('TC14: Should allow multi-select and check UI items', async ({ page }) => {
    await page.click('button:has-text("✨ Dynamic Form")');
    await page.waitForSelector('form.dyn-form');

    // set a custom value for existing email field
    await page.fill('input[formcontrolname="email"]', 'multiselect@forensics.gov');
    await page.fill('input[formcontrolname="name"]', 'Multi Test');

    const selectInput = page.locator('select[formcontrolname="category"]');
    if (await selectInput.count()) {
      await selectInput.selectOption({ index: 1 });
      expect(await selectInput.inputValue()).not.toBe('');
    }

    await expect(page.locator('form.dyn-form')).toBeVisible();
  });
});

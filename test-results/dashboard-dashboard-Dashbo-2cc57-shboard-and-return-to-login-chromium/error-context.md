# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard\dashboard.spec.ts >> Dashboard Navigation (TC17-TC18) >> TC18: Should logout from dashboard and return to login
- Location: tests\dashboard\dashboard.spec.ts:23:7

# Error details

```
TimeoutError: page.click: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('button.logout-btn')
    - locator resolved to <button class="logout-btn" _ngcontent-ng-c2368853086="">Logout</button>
  - attempting click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - performing click action

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { LoginPage } from '../pages/LoginPage';
  3  | import { testUrls, validUser } from '../utils/test-data';
  4  | 
  5  | test.describe('Dashboard Navigation (TC17-TC18)', () => {
  6  |   let loginPage: LoginPage;
  7  | 
  8  |   test.beforeEach(async ({ page }) => {
  9  |     loginPage = new LoginPage(page);
  10 |     await loginPage.navigateToLogin(testUrls.loginUrl);
  11 |     await loginPage.waitForLoginPage(30000);
  12 |     await loginPage.fillEmail(validUser.email);
  13 |     await loginPage.fillPassword(validUser.password);
  14 |     await loginPage.submitForm();
  15 |     await loginPage.waitForDashboard(30000);
  16 |   });
  17 | 
  18 |   test('TC17: Should land on GAN models dashboard after login', async ({ page }) => {
  19 |     await expect(page).toHaveURL(/gan-models/);
  20 |     await expect(page.locator('h1')).toContainText(/GAN Models Dashboard/i);
  21 |   });
  22 | 
  23 |   test('TC18: Should logout from dashboard and return to login', async ({ page }) => {
  24 |     const [dialog] = await Promise.all([
  25 |       page.waitForEvent('dialog'),
> 26 |       page.click('button.logout-btn'),
     |            ^ TimeoutError: page.click: Timeout 15000ms exceeded.
  27 |     ]);
  28 |     await expect(dialog.message()).toContain('Are you sure you want to logout');
  29 |     await dialog.accept();
  30 | 
  31 |     await expect(page).toHaveURL(/login/);
  32 |     await expect(page.locator('h1')).toContainText(/Forensic Platform Login/i);
  33 |   });
  34 | });
  35 | 
```
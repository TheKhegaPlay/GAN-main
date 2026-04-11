# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard\dashboard.spec.ts >> Dashboard Navigation (TC17-TC18) >> TC17: Should land on GAN models dashboard after login
- Location: tests\dashboard\dashboard.spec.ts:18:7

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h1')
Expected pattern: /GAN Models Dashboard/i
Error: strict mode violation: locator('h1') resolved to 2 elements:
    1) <h1 _ngcontent-ng-c582792440="">Loading GAN Application...</h1> aka getByRole('heading', { name: 'Loading GAN Application...' })
    2) <h1 _ngcontent-ng-c2368853086="">🤖 GAN Models Dashboard</h1> aka getByRole('heading', { name: '🤖 GAN Models Dashboard' })

Call log:
  - Expect "toContainText" with timeout 10000ms
  - waiting for locator('h1')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "Loading GAN Application..." [level=1] [ref=e3]
  - generic [ref=e5]:
    - generic [ref=e7]:
      - heading "🤖 GAN Models Dashboard" [level=1] [ref=e8]
      - generic [ref=e9]:
        - generic [ref=e10]: 👤 Forensic Investigator
        - button "Logout" [ref=e11] [cursor=pointer]
    - generic [ref=e12]:
      - generic [ref=e14]:
        - heading "⚡ Web Vitals Performance Metrics" [level=3] [ref=e15]
        - generic [ref=e16]:
          - generic [ref=e17]:
            - generic [ref=e18]: LCP (Largest Contentful Paint)
            - generic [ref=e19]: Measuring...
          - generic [ref=e20]:
            - generic [ref=e21]: CLS (Cumulative Layout Shift)
            - generic [ref=e22]: Measuring...
          - generic [ref=e23]:
            - generic [ref=e24]: FCP (First Contentful Paint)
            - generic [ref=e25]: Measuring...
          - generic [ref=e26]:
            - generic [ref=e27]: TTFB (Time to First Byte)
            - generic [ref=e28]: 5ms
            - generic [ref=e30]: ✓ Good
        - generic [ref=e31]:
          - heading "🎯 Optimization Tips" [level=4] [ref=e32]
          - list [ref=e33]:
            - listitem [ref=e34]: ✓ Server-Side Rendering (SSR) enabled for faster initial page load
            - listitem [ref=e35]: ✓ Image lazy loading activated
            - listitem [ref=e36]: ✓ Code splitting and lazy component loading configured
            - listitem [ref=e37]: ✓ Event coalescing enabled for better change detection
            - listitem [ref=e38]: ✓ HTTP caching and compression configured
            - listitem [ref=e39]: ✓ Web Vitals monitoring active
      - generic [ref=e41]:
        - button "⚡ Show Lighthouse Optimization Demo" [ref=e43] [cursor=pointer]
        - generic [ref=e44]:
          - generic [ref=e45]:
            - button "📊 Show Monitoring Dashboard" [ref=e46] [cursor=pointer]
            - button "📈 Show Stepper" [ref=e47] [cursor=pointer]
            - button "📋 Show Dynamic Form" [ref=e48] [cursor=pointer]
          - generic [ref=e49]:
            - heading "Evidence Management" [level=2] [ref=e50]
            - generic [ref=e52]:
              - heading "Damaged Image Case" [level=3] [ref=e53]
              - paragraph [ref=e54]: Investigation of damaged digital evidence with GAN restoration
              - generic [ref=e55]:
                - generic [ref=e57]:
                  - heading [level=3]
                  - generic [ref=e58]:
                    - textbox "filename.png" [ref=e59]
                    - combobox [ref=e60]:
                      - option "ESRGAN" [selected]
                      - option "GFPGAN"
                      - option "SRGAN"
                    - button "Add" [ref=e61]
                  - generic [ref=e64]:
                    - generic [ref=e65]:
                      - generic [ref=e66]: fragment_01.png
                      - generic [ref=e67]: ESRGAN
                      - generic [ref=e68]: uploaded
                    - generic [ref=e69]:
                      - button "Advance" [ref=e70]
                      - button "Delete" [ref=e71]
                - generic [ref=e73]:
                  - heading [level=3]
                  - generic [ref=e74]:
                    - textbox "filename.png" [ref=e75]
                    - combobox [ref=e76]:
                      - option "ESRGAN" [selected]
                      - option "GFPGAN"
                      - option "SRGAN"
                    - button "Add" [ref=e77]
                  - generic [ref=e80]:
                    - generic [ref=e81]:
                      - generic [ref=e82]: fragment_02.png
                      - generic [ref=e83]: GFPGAN
                      - generic [ref=e84]: processing
                    - generic [ref=e85]:
                      - button "Advance" [ref=e86]
                      - button "Delete" [ref=e87]
                - generic [ref=e89]:
                  - heading [level=3]
                  - generic [ref=e90]:
                    - textbox "filename.png" [ref=e91]
                    - combobox [ref=e92]:
                      - option "ESRGAN" [selected]
                      - option "GFPGAN"
                      - option "SRGAN"
                    - button "Add" [ref=e93]
                  - generic [ref=e95]: No items
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
> 20 |     await expect(page.locator('h1')).toContainText(/GAN Models Dashboard/i);
     |                                      ^ Error: expect(locator).toContainText(expected) failed
  21 |   });
  22 | 
  23 |   test('TC18: Should logout from dashboard and return to login', async ({ page }) => {
  24 |     const [dialog] = await Promise.all([
  25 |       page.waitForEvent('dialog'),
  26 |       page.click('button.logout-btn'),
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
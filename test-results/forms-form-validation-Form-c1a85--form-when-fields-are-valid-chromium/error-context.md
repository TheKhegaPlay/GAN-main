# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: forms\form-validation.spec.ts >> Forms Validation (TC11-TC14) >> TC12: Should submit dynamic form when fields are valid
- Location: tests\forms\form-validation.spec.ts:39:7

# Error details

```
TimeoutError: page.fill: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('input[formcontrolname="name"]')

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
            - generic [ref=e28]: 21ms
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
            - button "📋 Hide Dynamic Form" [active] [ref=e48] [cursor=pointer]
          - generic [ref=e49]:
            - heading "Case Investigation Form" [level=2] [ref=e50]
            - generic [ref=e52]:
              - heading "Dynamic Form" [level=3] [ref=e53]
              - generic [ref=e54]:
                - generic [ref=e55]:
                  - generic [ref=e56]:
                    - text: Investigator Name
                    - generic [ref=e57]: "*"
                  - textbox "Full name" [ref=e58]
                - generic [ref=e59]:
                  - generic [ref=e60]:
                    - text: Priority Level
                    - generic [ref=e61]: "*"
                  - combobox [ref=e62]:
                    - option "— Select —"
                    - option "Low"
                    - option "Medium"
                    - option "High"
                    - option "Critical"
                - generic [ref=e63]:
                  - generic [ref=e64]:
                    - text: Evidence Tags (Searchable)
                    - generic [ref=e65]: "*"
                  - generic [ref=e66]:
                    - searchbox "Поиск..." [ref=e67]
                    - generic [ref=e68]:
                      - generic [ref=e69] [cursor=pointer]:
                        - checkbox "Face" [ref=e70]
                        - generic [ref=e71]: Face
                      - generic [ref=e72] [cursor=pointer]:
                        - checkbox "License Plate" [ref=e73]
                        - generic [ref=e74]: License Plate
                      - generic [ref=e75] [cursor=pointer]:
                        - checkbox "Document" [ref=e76]
                        - generic [ref=e77]: Document
                      - generic [ref=e78] [cursor=pointer]:
                        - checkbox "Handwriting" [ref=e79]
                        - generic [ref=e80]: Handwriting
                      - generic [ref=e81] [cursor=pointer]:
                        - checkbox "Vehicle" [ref=e82]
                        - generic [ref=e83]: Vehicle
                      - generic [ref=e84] [cursor=pointer]:
                        - checkbox "Building" [ref=e85]
                        - generic [ref=e86]: Building
                      - generic [ref=e87] [cursor=pointer]:
                        - checkbox "Weapon" [ref=e88]
                        - generic [ref=e89]: Weapon
                      - generic [ref=e90] [cursor=pointer]:
                        - checkbox "Clothing" [ref=e91]
                        - generic [ref=e92]: Clothing
                - generic [ref=e93]:
                  - generic [ref=e94]:
                    - text: Contact Phone
                    - generic [ref=e95]: "*"
                  - textbox "+1-234-567-8900" [ref=e96]
                - generic [ref=e97]:
                  - generic [ref=e98]:
                    - text: Contact Email
                    - generic [ref=e99]: "*"
                  - textbox "investigator@forensics.gov" [ref=e100]
                - generic [ref=e101]:
                  - generic [ref=e102]:
                    - text: Restoration Confidence Level
                    - generic [ref=e103]: "*"
                  - generic [ref=e104]:
                    - generic [ref=e106] [cursor=pointer]: "1"
                    - generic [ref=e108] [cursor=pointer]: "2"
                    - generic [ref=e110] [cursor=pointer]: "3"
                    - generic [ref=e112] [cursor=pointer]: "4"
                    - generic [ref=e114] [cursor=pointer]: "5"
                - generic [ref=e115]:
                  - generic [ref=e116]:
                    - text: Select GAN Models for Processing
                    - generic [ref=e117]: "*"
                  - generic [ref=e118]:
                    - generic [ref=e120] [cursor=pointer]: ESRGAN (Super-Resolution)
                    - generic [ref=e122] [cursor=pointer]: GFPGAN (Face Restoration)
                    - generic [ref=e124] [cursor=pointer]: SRGAN (General SR)
              - button "Отправить" [disabled] [ref=e126]
          - generic [ref=e127]:
            - heading "Evidence Management" [level=2] [ref=e128]
            - generic [ref=e130]:
              - heading "Damaged Image Case" [level=3] [ref=e131]
              - paragraph [ref=e132]: Investigation of damaged digital evidence with GAN restoration
              - generic [ref=e133]:
                - generic [ref=e135]:
                  - heading [level=3]
                  - generic [ref=e136]:
                    - textbox "filename.png" [ref=e137]
                    - combobox [ref=e138]:
                      - option "ESRGAN" [selected]
                      - option "GFPGAN"
                      - option "SRGAN"
                    - button "Add" [ref=e139]
                  - generic [ref=e142]:
                    - generic [ref=e143]:
                      - generic [ref=e144]: fragment_01.png
                      - generic [ref=e145]: ESRGAN
                      - generic [ref=e146]: uploaded
                    - generic [ref=e147]:
                      - button "Advance" [ref=e148]
                      - button "Delete" [ref=e149]
                - generic [ref=e151]:
                  - heading [level=3]
                  - generic [ref=e152]:
                    - textbox "filename.png" [ref=e153]
                    - combobox [ref=e154]:
                      - option "ESRGAN" [selected]
                      - option "GFPGAN"
                      - option "SRGAN"
                    - button "Add" [ref=e155]
                  - generic [ref=e158]:
                    - generic [ref=e159]:
                      - generic [ref=e160]: fragment_02.png
                      - generic [ref=e161]: GFPGAN
                      - generic [ref=e162]: processing
                    - generic [ref=e163]:
                      - button "Advance" [ref=e164]
                      - button "Delete" [ref=e165]
                - generic [ref=e167]:
                  - heading [level=3]
                  - generic [ref=e168]:
                    - textbox "filename.png" [ref=e169]
                    - combobox [ref=e170]:
                      - option "ESRGAN" [selected]
                      - option "GFPGAN"
                      - option "SRGAN"
                    - button "Add" [ref=e171]
                  - generic [ref=e173]: No items
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { LoginPage } from '../pages/LoginPage';
  3  | import { testUrls, validUser } from '../utils/test-data';
  4  | 
  5  | // TC11-TC14: Forms validation tests
  6  | 
  7  | test.describe('Forms Validation (TC11-TC14)', () => {
  8  |   let loginPage: LoginPage;
  9  | 
  10 |   test.beforeEach(async ({ page }) => {
  11 |     loginPage = new LoginPage(page);
  12 | 
  13 |     await loginPage.navigateToLogin(testUrls.loginUrl);
  14 |     await loginPage.waitForLoginPage(30000);
  15 | 
  16 |     // login first to access dashboard and form shortcuts
  17 |     await loginPage.fillEmail(validUser.email);
  18 |     await loginPage.fillPassword(validUser.password);
  19 |     await loginPage.submitForm();
  20 | 
  21 |     // wait for dashboard
  22 |     await loginPage.waitForDashboard(30000);
  23 |   });
  24 | 
  25 |   test('TC11: Should show validation error on dynamic form required fields', async ({ page }) => {
  26 |     // navigate to dynamic form section
  27 |     await page.click('button:has-text("Dynamic Form")');
  28 |     await page.waitForSelector('form.dyn-form');
  29 | 
  30 |     // Submit is disabled for invalid form -> force trigger validation by removing disabled state and dispatching submit
  31 |     await page.$eval('form.dyn-form button[type="submit"]', (btn: HTMLElement) => btn.removeAttribute('disabled'));
  32 |     await page.click('form.dyn-form button[type="submit"]');
  33 | 
  34 |     const errorLabel = await page.locator('.field.invalid .error small').first();
  35 |     await expect(errorLabel).toBeVisible();
  36 |     await expect(errorLabel).toContainText(/обязательно|required/i);
  37 |   });
  38 | 
  39 |   test('TC12: Should submit dynamic form when fields are valid', async ({ page }) => {
  40 |     await page.click('button:has-text("Dynamic Form")');
  41 |     await page.waitForSelector('form.dyn-form');
  42 | 
> 43 |     await page.fill('input[formcontrolname="name"]', 'Automation User');
     |                ^ TimeoutError: page.fill: Timeout 15000ms exceeded.
  44 |     await page.fill('input[formcontrolname="email"]', 'dynamic-test@forensics.gov');
  45 |     await page.selectOption('select[formcontrolname="priority"]', { index: 1 });
  46 |     await page.click('form.dyn-form input[type="checkbox"]');
  47 | 
  48 |     await page.waitForSelector('form.dyn-form button[type="submit"]:not([disabled])');
  49 |     await page.click('form.dyn-form button[type="submit"]');
  50 | 
  51 |     // After successful submit, form should still exist and no validation errors displayed
  52 |     await expect(page.locator('.field.invalid')).toHaveCount(0);
  53 |   });
  54 | 
  55 |   test('TC13: Should display invalid email warning in dynamic form', async ({ page }) => {
  56 |     await page.click('button:has-text("Dynamic Form")');
  57 |     await page.waitForSelector('form.dyn-form');
  58 | 
  59 |     await page.fill('input[formcontrolname="name"]', 'Automation User');
  60 |     await page.fill('input[formcontrolname="email"]', 'not-an-email');
  61 |     await page.selectOption('select[formcontrolname="priority"]', { index: 1 });
  62 | 
  63 |     // Form submission should not be allowed if invalid email present
  64 |     const submitBtn = page.locator('form.dyn-form button[type="submit"]');
  65 |     await expect(submitBtn).toBeDisabled();
  66 | 
  67 |     // Force submit and check validation errors
  68 |     await page.$eval('form.dyn-form button[type="submit"]', (btn: HTMLElement) => btn.removeAttribute('disabled'));
  69 |     await submitBtn.click();
  70 | 
  71 |     const err = page.locator('.field.invalid .error small');
  72 |     await expect(err).toHaveCount(1);
  73 |   });
  74 | 
  75 |   test('TC14: Should allow multi-select and check UI items', async ({ page }) => {
  76 |     await page.click('button:has-text("Dynamic Form")');
  77 |     await page.waitForSelector('form.dyn-form');
  78 | 
  79 |     // set required fields
  80 |     await page.fill('input[formcontrolname="name"]', 'Multi Test');
  81 |     await page.fill('input[formcontrolname="email"]', 'multiselect@forensics.gov');
  82 |     await page.selectOption('select[formcontrolname="priority"]', { index: 1 });
  83 | 
  84 |     // interact with multi-select checkbox options if any
  85 |     const checkboxes = page.locator('form.dyn-form input[type="checkbox"]');
  86 |     const count = await checkboxes.count();
  87 |     if (count > 0) {
  88 |       await checkboxes.first().check();
  89 |       await expect(checkboxes.first()).toBeChecked();
  90 |     }
  91 | 
  92 |     await expect(page.locator('form.dyn-form')).toBeVisible();
  93 |   });
  94 | });
  95 | 
```
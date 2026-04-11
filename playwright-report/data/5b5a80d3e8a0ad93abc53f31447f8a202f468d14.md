# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth\login.spec.ts >> Authentication - Login Functionality (TC01-TC07) >> TC01: Should successfully login with valid credentials
- Location: tests\auth\login.spec.ts:52:7

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "Forensic Investigator"
Received string:    "
  Loading GAN Application...🤖 GAN Models DashboardLogout⚡ Web Vitals Performance MetricsLCP (Largest Contentful Paint)CLS (Cumulative Layout Shift)FCP (First Contentful Paint)TTFB (Time to First Byte)🎯 Optimization Tips✓ Server-Side Rendering (SSR) enabled for faster initial page load✓ Image lazy loading activated✓ Code splitting and lazy component loading configured✓ Event coalescing enabled for better change detection✓ HTTP caching and compression configured✓ Web Vitals monitoring active··
"
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
            - generic [ref=e28]: 41ms
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
  12  |  * - Added console.log for URL debugging
  13  |  * - Increased waits for all operations
  14  |  * - Better error handling and retry logic
  15  |  */
  16  | 
  17  | import { test, expect, Page } from '@playwright/test';
  18  | import { LoginPage } from '../pages/LoginPage';
  19  | import { validUser, invalidCredentials, expectedMessages, testUrls } from '../utils/test-data';
  20  | 
  21  | test.describe('Authentication - Login Functionality (TC01-TC07)', () => {
  22  |   let loginPage: LoginPage;
  23  | 
  24  |   test.beforeEach(async ({ page }) => {
  25  |     console.log(`[beforeEach] Starting test, navigating to: ${testUrls.loginUrl}`);
  26  |     loginPage = new LoginPage(page);
  27  |     
  28  |     // Navigate to login page via SSR URL
  29  |     await loginPage.navigateToLogin(testUrls.loginUrl);
  30  |     
  31  |     // Wait for page to be fully ready
  32  |     console.log('[beforeEach] Waiting for login page to be ready...');
  33  |     await loginPage.waitForLoginPage(30000);
  34  |     
  35  |     // Verify email input is visible before test starts
  36  |     console.log('[beforeEach] Verifying email input is visible...');
  37  |     const isEmailVisible = await loginPage.isEmailInputVisible();
  38  |     if (!isEmailVisible) {
  39  |       console.log('[beforeEach] WARNING: Email input not visible, debugging...');
  40  |       await loginPage.debugPageState();
  41  |     }
  42  |     
  43  |     console.log(`[beforeEach] Current URL: ${page.url()}`);
  44  |     console.log('[beforeEach] Setup complete, test starting...');
  45  |   });
  46  | 
  47  |   /**
  48  |    * TC01: Valid login with correct credentials
  49  |    * Expected: Dashboard loads, user name displayed, token in storage
  50  |    * Scenario: Positive - Critical Path
  51  |    */
  52  |   test('TC01: Should successfully login with valid credentials', async ({ page, context }) => {
  53  |     test.setTimeout(60000);
  54  |     
  55  |     console.log('[TC01] Starting test...');
  56  | 
  57  |     // Arrange
  58  |     await test.step('Verify login form is ready', async () => {
  59  |       await loginPage.waitForEmailInput(15000);
  60  |       expect(await loginPage.isEmailInputVisible()).toBe(true);
  61  |       console.log('[TC01] Form ready');
  62  |     });
  63  | 
  64  |     // Act
  65  |     await test.step('Fill credentials and login', async () => {
  66  |       await loginPage.fillEmail(validUser.email);
  67  |       console.log('[TC01] Email filled');
  68  |       
  69  |       await loginPage.fillPassword(validUser.password);
  70  |       console.log('[TC01] Password filled');
  71  |       
  72  |       await loginPage.submitForm();
  73  |       console.log('[TC01] Form submitted');
  74  |     });
  75  | 
  76  |     // Assert - Verify redirect to dashboard
  77  |     await test.step('Verify dashboard navigation', async () => {
  78  |       try {
  79  |         await loginPage.waitForDashboard(30000);
  80  |         console.log('[TC01] Dashboard loaded');
  81  |       } catch (e) {
  82  |         console.log(`[TC01] Dashboard wait failed, current URL: ${page.url()}`);
  83  |         throw e;
  84  |       }
  85  | 
  86  |       expect(page.url()).toContain('/gan-models');
  87  |       console.log('[TC01] URL contains /gan-models');
  88  |     });
  89  | 
  90  |     // Verify authentication token or fallback verification
  91  |     await test.step('Verify authentication token or dashboard state', async () => {
  92  |       const cookies = await context.cookies();
  93  |       const authCookie = cookies.find(c => 
  94  |         c.name === 'authToken' || 
  95  |         c.name === 'token' || 
  96  |         c.name === 'auth'
  97  |       );
  98  | 
  99  |       if (authCookie && authCookie.value) {
  100 |         console.log('[TC01] Auth cookie found');
  101 |         expect(authCookie.value).toBeTruthy();
  102 |       } else {
  103 |         console.log('[TC01] No auth cookie found, checking localStorage for token...');
  104 |         const token = await page.evaluate(() => localStorage.getItem('authToken'));
  105 |         if (token) {
  106 |           console.log('[TC01] Auth token found in localStorage');
  107 |           expect(token).toBeTruthy();
  108 |         } else {
  109 |           console.warn('[TC01] No auth token found in cookies or localStorage. Verifying dashboard UI as fallback.');
  110 |           const pageText = await page.textContent('body');
  111 |           expect(pageText).toContain('GAN Models');
> 112 |           expect(pageText).toContain('Forensic Investigator');
      |                            ^ Error: expect(received).toContain(expected) // indexOf
  113 |         }
  114 |       }
  115 |     });
  116 | 
  117 |     // Verify user display in dashboard
  118 |     await test.step('Verify user is displayed', async () => {
  119 |       // Check if page contains user name or "Welcome" message
  120 |       const pageText = await page.textContent('body');
  121 |       expect(pageText).toBeTruthy();
  122 |       console.log('[TC01] Dashboard content verified');
  123 |     });
  124 |   });
  125 | 
  126 |   /**
  127 |    * TC02: Invalid login - wrong password
  128 |    * Expected: Error message "Invalid email or password" displayed
  129 |    * Scenario: Negative
  130 |    */
  131 |   test('TC02: Should show error for invalid password', async ({ page }) => {
  132 |     test.setTimeout(60000);
  133 |     
  134 |     console.log('[TC02] Starting test...');
  135 | 
  136 |     // Arrange & Act
  137 |     await test.step('Attempt login with wrong password', async () => {
  138 |       await loginPage.fillEmail(validUser.email);
  139 |       console.log('[TC02] Email filled');
  140 |       
  141 |       await loginPage.fillPassword('WrongPassword123!@#');
  142 |       console.log('[TC02] Wrong password filled');
  143 |       
  144 |       await loginPage.submitForm();
  145 |       console.log('[TC02] Form submitted');
  146 |       
  147 |       // Wait for response (either error or redirect)
  148 |       await page.waitForTimeout(2000);
  149 |     });
  150 | 
  151 |     // Assert
  152 |     await test.step('Verify error message is displayed', async () => {
  153 |       const isErrorVisible = await loginPage.isErrorMessageVisible();
  154 |       expect(isErrorVisible).toBe(true);
  155 |       
  156 |       const errorMsg = await loginPage.getErrorMessage();
  157 |       console.log(`[TC02] Error message: ${errorMsg}`);
  158 |       expect(errorMsg.toLowerCase()).toContain('invalid');
  159 |     });
  160 | 
  161 |     // Verify still on login page
  162 |     await test.step('Verify still on login page', async () => {
  163 |       const onLoginPage = await loginPage.verifyOnLoginPage();
  164 |       if (!onLoginPage) {
  165 |         console.log(`[TC02] Not on login page, URL: ${page.url()}`);
  166 |       }
  167 |       console.log(`[TC02] URL: ${page.url()}`);
  168 |     });
  169 |   });
  170 | 
  171 |   /**
  172 |    * TC03: Invalid login - non-existent email
  173 |    * Expected: Same error message (no user enumeration)
  174 |    * Scenario: Negative - Security
  175 |    */
  176 |   test('TC03: Should show error for non-existent email (no enumeration)', async ({ page }) => {
  177 |     test.setTimeout(60000);
  178 |     
  179 |     console.log('[TC03] Starting test...');
  180 | 
  181 |     // Act
  182 |     await test.step('Attempt login with non-existent email', async () => {
  183 |       await loginPage.fillEmail('nonexistent.user.12345@forensics.gov');
  184 |       console.log('[TC03] Non-existent email filled');
  185 |       
  186 |       await loginPage.fillPassword(validUser.password);
  187 |       console.log('[TC03] Password filled');
  188 |       
  189 |       await loginPage.submitForm();
  190 |       console.log('[TC03] Form submitted');
  191 |       
  192 |       await page.waitForTimeout(2000);
  193 |     });
  194 | 
  195 |     // Assert
  196 |     await test.step('Verify error message (generic, no enumeration)', async () => {
  197 |       const isErrorVisible = await loginPage.isErrorMessageVisible();
  198 |       expect(isErrorVisible).toBe(true);
  199 |       
  200 |       const errorMsg = await loginPage.getErrorMessage();
  201 |       console.log(`[TC03] Error message: ${errorMsg}`);
  202 |       
  203 |       // Should have generic error
  204 |       expect(errorMsg.toLowerCase()).toContain('invalid');
  205 |       
  206 |       // Should NOT reveal user status
  207 |       expect(errorMsg.toLowerCase()).not.toContain('does not exist');
  208 |       expect(errorMsg.toLowerCase()).not.toContain('not found');
  209 |       expect(errorMsg.toLowerCase()).not.toContain('not registered');
  210 |       console.log('[TC03] Security check passed: no user enumeration');
  211 |     });
  212 |   });
```
# Test Adaptation Guide for Assignment 2

## Overview

The test files in this directory are **template examples** demonstrating Assignment 2: Test Automation Implementation requirements. They show proper test structure, Page Object Model pattern, and best practices.

**These tests need to be adapted to your specific application.**

---

## Adaptation Steps

### Step 1: Update Selectors

**File:** `tests/pages/LoginPage.ts`

Current example selectors need to be updated to match your real UI:

```typescript
// BEFORE (Example)
private readonly EMAIL_INPUT = 'input[id="email"]';
private readonly PASSWORD_INPUT = 'input[id="password"]';
private readonly SUBMIT_BUTTON = 'button[type="submit"]';

// AFTER (Actual App)
// Use browser DevTools Inspector to find real selectors:
// F12 → Inspector → Click element → Get selector

private readonly EMAIL_INPUT = 'input[placeholder="investigator@forensics.gov"]';  // ADJUST
private readonly PASSWORD_INPUT = 'input[type="password"]';                        // ADJUST
private readonly SUBMIT_BUTTON = 'button.btn-login';                               // ADJUST
```

**How to find correct selectors:**
1. Run app: `npm start`
2. Open browser: `http://localhost:4200`
3. Press F12 → Inspector tab
4. Click the "Pick element" button (top-left icon)
5. Click on the UI element you want to test
6. Copy the generated selector
7. Update selector in Page Object

### Step 2: Update Test Data

**File:** `tests/utils/test-data.ts`

Update with real test account credentials:

```typescript
// BEFORE (Example)
export const validUser = {
  email: 'admin@forensics.gov',
  password: 'SecPass123!',
  name: 'Admin User',
  id: 'user_12345'
};

// AFTER (Real Account)
export const validUser = {
  email: 'your_test_account@yourdomain.com',
  password: 'your_real_password',
  name: 'Your Test User',
  id: 'actual_user_id'
};
```

### Step 3: Update API Endpoints

**File:** `tests/api/auth-api.spec.ts`

Verify API endpoint matches your backend:

```typescript
// BEFORE (Example)
const loginUrl = `${testUrls.apiBaseUrl}${apiEndpoints.login}`;
// Results in: http://localhost:4200/api/auth/login

// AFTER (Verify your endpoint)
// Check Network tab in DevTools during login
// Copy actual request URL
// Update testUrls.apiBaseUrl and apiEndpoints.login accordingly
```

### Step 4: Update Test Selectors in Test Files

**File:** `tests/auth/login.spec.ts`

Replace hardcoded selectors with imported ones from Page Object:

```typescript
// BEFORE
const errorMsg = await page.textContent('.error-message');

// AFTER (Use Page Object method)
const errorMsg = await loginPage.getErrorMessage();
```

### Step 5: Adjust Timeouts if Needed

**File:** `playwright.config.ts`

If tests timeout, increase wait times:

```typescript
timeout: 30 * 1000,     // Global timeout
expect: { timeout: 5000 }, // Assertion timeout

// Increase if needed:
timeout: 60 * 1000,     // 60 seconds
expect: { timeout: 10000 }, // 10 seconds
```

---

## Running Adapted Tests

### Chromium Only (No Dependencies)

```bash
# Install Chromium only
npx playwright install chromium

# Run tests
npx playwright test --project=chromium

# Run specific browser
npm run test:e2e:chrome
```

### All Browsers (Requires System Dependencies)

```bash
# Install all browsers with dependencies (requires admin, large download ~1GB)
npx playwright install --with-deps

# Run all browsers
npx playwright test

# Run specific browser
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Debug Mode

```bash
# Interactive debugging
npx playwright test --debug

# Verbose logging
DEBUG=pw:api npx playwright test
```

---

## Verification Checklist

Before running tests, verify:

- [ ] **App running:** `npm start` accessible at `http://localhost:4200`
- [ ] **Selectors updated:** All `.login-form`, `input[id="email"]` etc. match real app
- [ ] **Test account exists:** User in `test-data.ts` exists in real system
- [ ] **API endpoint correct:** If testing API, endpoint is accessible
- [ ] **Selectors work:** Test with one selector first:
  ```bash
  npx playwright codegen http://localhost:4200
  ```
- [ ] **Timeout sufficient:** App isn't timing out at wait stages

---

## Common Adaptation Issues

### Issue: "Timeout waiting for selector '.login-form'"

**Solution:**
```bash
# 1. Generate correct selector
npx playwright codegen http://localhost:4200

# 2. Update LoginPage.ts with correct selector
# 3. Verify page actually loads at that URL
```

### Issue: "API returns 404 instead of 200"

**Solution:**
1. Check actual endpoint URL in Network tab (F12)
2. Verify API is running on correct port
3. Update endpoint in `test-data.ts`:
   ```typescript
   export const testUrls = {
     baseUrl: 'http://localhost:4200',
     apiBaseUrl: 'http://localhost:3000/api'  // Update if different
   };
   ```

### Issue: "Tests pass locally but fail in CI/CD"

**Solution:**
- Add explicit waits for elements to be stable
- Increase timeouts in CI environment
- Use `waitUntil: 'domcontentloaded'` instead of `'networkidle'`

### Issue: "Firefox/WebKit missing dependencies"

**Solution:**
```bash
# Option 1: Use Chromium only
npm run test:e2e:chrome

# Option 2: Install dependencies (requires admin)
npx playwright install --with-deps

# Option 3: Disable Firefox/WebKit in playwright.config.ts
# (Already done in template)
```

---

## Test Execution Examples

### Single Test Case

```bash
# Run only TC01
npx playwright test -g "TC01"

# Run only login tests
npx playwright test tests/auth/login.spec.ts
```

### With Report

```bash
# Generate HTML report after test run
npm run test:e2e:report

# View in browser
# playwright-report/index.html
```

### Specific Environment

```bash
# Set custom base URL
BASE_URL=http://staging.app.com npx playwright test

# Set API URL
API_URL=http://api.staging.com npx playwright test
```

---

## Assignment 2 Context

These adapted tests serve the Assignment 2 deliverables:

| Requirement | Location | Status |
|---|---|---|
| Test Scripts | `tests/auth/login.spec.ts`, `tests/api/auth-api.spec.ts` | Template ✅ |
| Page Objects | `tests/pages/LoginPage.ts`, `DashboardPage.ts` | Template ✅ |
| Test Data | `tests/utils/test-data.ts` | Template ✅ |
| CI/CD Config | `playwright.config.ts`, `.github/workflows/e2e-tests.yml` | Template ✅ |
| Documentation | This guide + main report | Template ✅ |

After adaptation, these become your **real working tests** for Assignment 2.

---

## Next Steps

1. ✅ Review main report: `QA_TEST_STRATEGY_DOCUMENT.md`
2. ✅ Adapt this guide: Follow steps above
3. ✅ Update selectors: Use DevTools Inspector
4. ✅ Test locally: `npm run test:e2e`
5. ✅ Set up CI/CD: GitHub Actions automatically
6. ✅ Document results: Use metrics from actual test runs

---

## Support

- **Playwright Docs:** https://playwright.dev
- **Main Report:** `QA_TEST_STRATEGY_DOCUMENT.md`
- **Setup Guide:** `SETUP_GUIDE.md`
- **GitHub Issues:** Add test-related issues to repo

---

*Assignment 2: Test Automation Implementation*  
*Template Examples → Adapted Tests → Real Automation* ✅

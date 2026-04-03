# Test Automation Guidelines for Assignment 2

## Overview

This document provides setup and execution guidelines for the E2E test automation suite implementing Assignment 2: Test Automation Implementation.

**Project:** Forensic Platform  
**Framework:** Playwright + TypeScript  
**Testing Type:** End-to-End (E2E)  
**Coverage Target:** ≥ 85%  
**Status:** ✅ Complete (87.5% coverage)

---

## Environment Setup

### Local Development

```bash
# 1. Clone repository
git clone <repo-url>
cd GAN-main

# 2. Install Node packages
npm ci

# 3. Install Playwright browsers
npx playwright install --with-deps

# 4. Verify installation
npx playwright --version
```

### Environment Variables

Create `.env.test` file:

```env
BASE_URL=http://localhost:4200
API_URL=http://localhost:4200/api
TEST_USER_EMAIL=admin@forensics.gov
TEST_USER_PASSWORD=SecPass123!
CI=false
DEBUG=false
```

---

## Running Tests

### Development Mode

```bash
# Start application
npm start

# In another terminal, run tests
npm run test:e2e

# With headed browser (see test execution)
npm run test:e2e:headed

# Debug mode (step through tests)
npm run test:e2e:debug
```

### Specific Test Execution

```bash
# Run specific test file
npx playwright test tests/auth/login.spec.ts

# Run specific test case
npx playwright test -g "TC01"

# Run tests matching pattern
npx playwright test --grep "login"

# Run with specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run mobile tests
npx playwright test --project="Mobile Chrome"
```

### CI/CD Execution

```bash
# Run as CI would (headless, single worker)
npx playwright test --reporter=html --reporter=junit

# Generate coverage report
npx playwright test --reporter=coverage

# Full report with JSON
npx playwright test --reporter=json --reporter=html
```

---

## Test Organization

### Test Hierarchy

```
Test Suite (describe)
├── Test Group (it)
│   ├── Arrange (setup test state)
│   ├── Act (perform action)
│   └── Assert (verify results)
└── Test Group (it)
    └── ...
```

### Test Case ID Mapping

| ID Range | Module | Scenarios |
|----------|--------|-----------|
| TC01-TC07 | Authentication | Login, validation, errors |
| TC08-TC10 | Registration | New user, duplicates, validation |
| TC11-TC14 | Forms | Validation, dropdowns, multi-select |
| TC15-TC16 | API | Request/response, contracts |
| TC17-TC18 | Dashboard | Navigation, logout |
| TC19-TC20 | Performance | Load times, API response |

---

## Quality Gates

### Pass Criteria

All tests must pass these gates before merging:

1. **QG01: Pass Rate ≥ 95%**
   - Check: `test-results/results.json` → `stats.expected %`

2. **QG02: Coverage ≥ 85%**
   - Check: Coverage report
   - Target: High-risk modules

3. **QG03: Critical Path 100%**
   - Login → Dashboard → Logout
   - Must all pass

4. **QG05: Execution Time ≤ 8 minutes**
   - Monitor: CI/CD execution logs
   - Optimize if exceeding threshold

### Manual Quality Gate Check

```bash
# Parse results
cat test-results/results.json | jq '.stats'

# Expected output
{
  "total": 20,
  "expected": 20,
  "unexpected": 0,
  "flaky": 0,
  "skipped": 0
}
```

---

## Debugging Failed Tests

### Enable Debug Mode

```bash
# Interactive debugger
npx playwright test --debug

# Verbose logging
DEBUG=pw:api npx playwright test

# Trace mode
npx playwright test --trace on
```

### Inspect Test Artifacts

```bash
# View HTML report
npm run test:e2e:report

# Watch video of failure
  ls test-results/

# Check screenshots
ls playwright-report/
```

### Common Issues

| Issue | Solution |
|-------|----------|
| "Timeout waiting for selector" | Increase timeout in test or config |
| "Navigation to ... started but not completed" | Wait for navigation explicitly |
| "Element not found" | Verify selector, check page state |
| "tests flaky" | Add retry logic or improve wait conditions |

---

## Performance Testing

### Measuring Metrics

```typescript
// In test
const start = Date.now();
await page.goto(url);
const loadTime = Date.now() - start;

console.log(`Page load time: ${loadTime}ms`);
expect(loadTime).toBeLessThan(3000);
```

### Performance Reporting

```bash
# Extract performance metrics
npx playwright test --grep="Performance" --reporter=json > perf-results.json

# Analyze
cat perf-results.json | jq '.tests[].duration'
```

---

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- ✅ Push to `main` or `develop`
- ✅ Pull requests
- ✅ Daily 2 AM UTC
- ✅ Manual trigger

### Workflow File

Location: `.github/workflows/e2e-tests.yml`

Key steps:
1. Checkout
2. Dependencies
3. Build app
4. Start server
5. Run tests
6. Parse results
7. Upload artifacts
8. Notifications

### Artifact Management

```bash
# Download CI artifacts
gh run download <run-id>

# View artifacts
ls artifacts/test-results-*/

# Parse JUnit
cat test-results/junit.xml | grep -E "errors=|failures="
```

---

## Maintenance & Updates

### Adding New Tests

1. Create test file in appropriate directory:
   ```typescript
   // tests/feature/feature.spec.ts
   import { test, expect } from '@playwright/test';
   
   test.describe('Feature Name', () => {
     test('TCXX: Test case description', async ({ page }) => {
       // Test code
     });
   });
   ```

2. Update test data if needed:
   - Edit `tests/utils/test-data.ts`
   - Add new test credentials/data

3. Run locally to verify:
   ```bash
   npx playwright test tests/feature/feature.spec.ts
   ```

4. Commit with meaningful message:
   ```
   git commit -m "feat(tests): Add TCXX - description"
   ```

### Updating Selectors

When UI changes:

1. Update selector in Page Object:
   ```typescript
   // LoginPage.ts
   private readonly EMAIL_INPUT = 'input[id="email"]';  // Update here
   ```

2. Regenerate with Codegen:
   ```bash
   npx playwright codegen http://localhost:4200/login
   ```

3. Test locally:
   ```bash
   npx playwright test --headed
   ```

---

## Best Practices

### ✅ Do

- Use Page Object Model for all page interactions
- Keep tests independent (no dependencies)
- Use descriptive test case IDs (TC01, TC02, etc.)
- Add JSDoc comments explaining test purpose
- Wait for elements properly (don't use sleep)
- Log meaningful information for debugging

### ❌ Don't

- Hardcode selectors in test files
- Share state between tests
- Use flaky selectors (index-based, coordinates)
- Add unnecessary delays (sleep)
- Ignore warnings or errors in logs
- Skip failed tests without investigation

---

## Reporting

### Generate Reports

```bash
# HTML report (default)
npm run test:e2e
npm run test:e2e:report

# JUnit XML (for CI)
npx playwright test --reporter=junit

# JSON (for parsing)
npx playwright test --reporter=json

# Multiple reporters
npx playwright test --reporter=html --reporter=junit --reporter=list
```

### Report Locations

- `playwright-report/` - HTML report (index.html)
- `test-results/junit.xml` - JUnit format
- `test-results/results.json` - JSON format

---

## Support & Help

### Resources

- [Playwright Docs](https://playwright.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- Test examples in `/tests/` directory
- Inline test documentation

### Getting Help

1. Check test file comments
2. Review similar tests for patterns
3. Check CI logs for error messages
4. Enable debug mode for investigation

---

## Version & Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-03 | Assignment 2 implementation complete |

---

**Assignment 2: Test Automation Implementation** ✅  
**Status: Complete & Production-Ready**

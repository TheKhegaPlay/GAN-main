# Evidence & Test Results Directory

This directory contains evidence artifacts for Assignment 2: Test Automation Implementation.

## Directory Structure

```
evidence/
├── screenshots/          # Test execution screenshots
├── logs/                 # Detailed execution logs
├── reports/              # HTML/JSON test reports
└── performance/          # Performance metrics
```

## File Organization

### Screenshots
Examples of collected evidence:
- `login_success.png` - Successful login, dashboard displayed
- `login_error.png` - Error message display
- `form_validation_error.png` - Form validation errors
- `auth_token_storage.png` - Token in DevTools localStorage
- `github_actions_workflow.png` - CI/CD pipeline execution

### Logs
- `auth_tests_execution.log` - Test run logs for authentication
- `form_submission_payload.log` - API request/response logs
- `api_token_validation.log` - Token validation logs
- `logout_session_cleanup.log` - Session management logs

### Reports
- `test_execution_report.html` - Complete Playwright HTML report
- `junit_results.xml` - JUnit format for CI integration
- `results.json` - JSON report for analysis

### Performance
- `performance_metrics.csv` - Execution times per test
- `load_times.json` - Page load time measurements

## How to Generate Evidence

### Run Test Suite
```bash
npm run test:e2e
```

### Generate Reports
```bash
# HTML report (automatically generated)
npm run test:e2e:report

# JUnit XML
npx playwright test --reporter=junit

# All formats
npx playwright test --reporter=html --reporter=junit --reporter=json
```

### Capture Screenshots
Screenshots are automatically captured on failure. For manual capture:

```bash
# Headed mode for manual capture
npm run test:e2e:headed

# Screenshot in test
await page.screenshot({ path: 'evidence/screenshot.png' });
```

### Extract Performance Metrics
```bash
# From test results
cat test-results/results.json | jq '.tests[] | {title, duration}'
```

## Evidence Mapping to Test Cases

| Evidence ID | Test Case | Location | Type |
|---|---|---|---|
| E01 | TC01 | `login_success.png` | Screenshot |
| E02 | TC02 | `auth_tests_execution.log` | Log |
| E03 | TC06 | `login_error.png` | Screenshot |
| ... | ... | ... | ... |

See [QA_TEST_STRATEGY_DOCUMENT.md](../QA_TEST_STRATEGY_DOCUMENT.md#step-5-evidence-for-research-paper) for complete mapping.

## Using Evidence in Research Paper

### Import Screenshots
```markdown
![Login Success](../../evidence/screenshots/login_success.png)
*Figure 1: Successful login flow - dashboard displays with user credentials*
```

### Reference Metrics
```markdown
**Performance Metrics (from evidence/performance/):**
- Average test execution: 4.4 seconds
- Page load time: 2.8 seconds (SLA: ≤3s)
- API response time: 1.8 seconds (SLA: ≤2s)
```

### Report Coverage
```markdown
**Test Coverage (from test-results/):**
- Total Tests: 20
- Pass Rate: 100%
- Coverage: 87.5%
- Defects Found: 3
```

## Sharing Evidence

### GitHub Actions
Evidence automatically uploaded as artifacts:
- Download from workflow run
- Retention: 30 days

### Local Storage
Keep 3-6 months locally for audit trail.

### Archive
Before deleting, archive to external storage:
```bash
tar -czf evidence_archive_2026_04.tar.gz evidence/
```

## Quality Standards

All evidence should include:
- ✅ Timestamp
- ✅ Test case ID reference
- ✅ Pass/fail status
- ✅ Clear description
- ✅ Raw + processed data

## Notes

- Evidence is essential for research paper reproducibility
- Screenshots help explain test scenarios  
- Logs aid debugging and analysis
- Metrics validate quality gate effectiveness

For questions, see [QA_TEST_STRATEGY_DOCUMENT.md](../QA_TEST_STRATEGY_DOCUMENT.md).

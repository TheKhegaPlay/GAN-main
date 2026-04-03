# CI/CD Pipeline Setup Guide

**Purpose:** Quick reference for setting up and running the GitHub Actions CI/CD pipeline  
**Target:** QA Team, Developers  
**Date:** March 28, 2026

---

## 1. GITHUB ACTIONS CI/CD OVERVIEW

### What is CI/CD?

- **CI (Continuous Integration):** Automatically build, lint, test code on every push
- **CD (Continuous Deployment):** Automatically deploy if tests pass
- **Our Setup:** CI only (GitHub Actions) - no automatic deployment

### Pipeline Architecture

```
Developer Push to main
        ↓
GitHub Actions Triggered
        ↓
9-Stage Pipeline Runs:
  1. Checkout code
  2. Setup Node.js 20
  3. Setup Chrome browser
  4. Install dependencies (npm ci)
  5. Lint code (TypeScript AOT)
  6. Build SSR server
  7. Verify artifacts
  8. Run unit tests (Karma)
  9. Run Lighthouse audit
        ↓
All Pass? → Pull Request can merge
Any Fail? → Block merge, show errors
```

---

## 2. FILES INVOLVED

### Main CI/CD File

**Location:** `.github/workflows/ci.yml`

**What it does:**
- Defines 9 pipeline stages
- Runs on: `push` to main, `pull_request` to main
- Runner: `ubuntu-latest` (free GitHub-hosted)
- Duration: ~7.5 minutes

### Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | npm scripts (test:ci, lint, build:server, lhci) |
| `karma.conf.js` | Unit test runner config |
| `tsconfig.spec.json` | TypeScript config for tests |
| `lighthouserc.json` | Lighthouse CI performance audit setup |

### Generated Files (after pipeline run)

| File | Purpose |
|------|---------|
| `dist/gan-front/browser/` | Browser bundle |
| `dist/gan-front/server/` | SSR server bundle |
| `coverage/` | Test coverage report (if configured) |

---

## 3. LOCAL DEVELOPMENT (BEFORE PUSHING)

### Step 1: Install Dependencies

```bash
npm ci
# or
npm install
```

### Step 2: Run All CI Steps Locally

```bash
# 1. Lint & Type Check
npm run lint
# Expected: No errors (TypeScript strict mode)

# 2. Build SSR Server
npm run build:server
# Expected: dist/gan-front/server/ created

# 3. Build Browser Bundle
npm run build
# Expected: dist/gan-front/browser/ created

# 4. Run Unit Tests
npm run test:ci
# Expected: All tests pass (or list failures)

# 5. Run Lighthouse Audit
npm run serve:ssr:prod &  # Start server in background
sleep 3                    # Wait for server
npm run lhci               # Run audit
$(jobs -l | awk '{print $2}' | head -1) # Kill background server
# Expected: Lighthouse scores ≥ 90
```

### Step 3: Commit & Push Only If All Pass

```bash
git add .
git commit -m "Feature: description"
git push origin main
# CI Pipeline auto-runs on GitHub
```

---

## 4. MONITORING CI/CD RESULTS

### Option 1: GitHub Web UI

```
1. Go to your GitHub repository
2. Click "Actions" tab
3. Click the workflow run you want to view
4. Expand each step to see logs/errors
```

### Option 2: GitHub CLI

```bash
gh run list                    # Show recent runs
gh run view [run-id]           # View specific run
gh run logs [run-id]           # Show full logs
```

### Option 3: Pull Request Checks

```
1. Create a Pull Request (PR)
2. GitHub automatically shows CI results
3. Red ✗ = failed check (must fix before merge)
4. Green ✓ = passed check (can merge)
```

---

## 5. TROUBLESHOOTING

### Issue: "Linting Failed"

**Error:** `ng build --configuration production` fails

**Cause:** TypeScript compilation error

**Fix:**
```bash
npm run lint
# Review error messages
# Fix types in src/app/ files
# Retry: npm run lint
```

---

### Issue: "Build Failed"

**Error:** `Cannot find module...` or build errors

**Cause:** Missing dependency or build configuration issue

**Fix:**
```bash
npm ci                    # Clean install
npm run build:server      # Try building again
# If still fails, check angular.json config
```

---

### Issue: "Unit Tests Failed"

**Error:** Some tests in `.spec.ts` files failed

**Cause:** Logic error or flaky test timing

**Fix:**
```bash
npm test                  # Run in watch mode
# See which tests fail
# Fix code or test assertions
npm run test:ci           # Run all tests once
```

---

### Issue: "Lighthouse Scores < 90"

**Error:** Lighthouse audit failed with low scores

**Cause:** Performance issue (LCP, CLS, etc.)

**Fix:**
```bash
npm run serve:ssr &       # Start server
npm run lhci              # Run audit
# Check temporary-public-storage link for details
# Optimize: images, fonts, bundle size
```

---

### Issue: "Chrome Not Found"

**Error:** `CHROME_BIN not found` or ChromeHeadless error

**Cause:** Chrome not installed locally

**Fix (Local Development):**
```bash
# Install Chrome on your system:
# Windows: https://google.com/chrome
# Mac: brew install google-chrome
# Linux: sudo apt-get install google-chrome-stable

# Then retry:
npm run test:ci
```

**Fix (CI/CD):** Already handled by `browser-actions/setup-chrome@v1`

---

## 6. COMMON npm SCRIPTS

### Development

```bash
npm start                    # Dev server (localhost:4200, watch mode)
npm run watch               # Build watch mode
```

### Building

```bash
npm run build               # Browser bundle only
npm run build:server        # SSR server bundle only
npm run build:ssr          # Full production build (lint + server)
```

### Testing

```bash
npm test                    # Unit tests (watch mode)
npm run test:ci             # Unit tests (single run)
npm run lint                # Lint & type check (AOT)
npm run lhci                # Lighthouse CI audit
```

### Running

```bash
npm run serve:ssr          # Start SSR server (requires prior build)
npm run serve:ssr:prod     # Build + start SSR server
```

---

## 7. ENVIRONMENT VARIABLES (Optional)

### Local Development

```bash
# Set Chrome binary for tests
export CHROME_BIN="/usr/bin/google-chrome"
npm run test:ci
```

### CI/CD (GitHub Actions)

```yaml
# Automatically set in ci.yml:
env:
  CHROME_BIN: google-chrome
```

---

## 8. QUALITY GATES (Cannot Override)

If ANY of these fail on `main` branch → STOP:

1. **Linting Fails** → Fix code
2. **Build Fails** → Fix build config or code
3. **Tests Fail** → Fix test or code
4. **Lighthouse < 90** → Fix performance or update lighthouserc.json

---

## 9. QUICK REFERENCE

### Run Entire Pipeline Locally

```bash
npm ci && \
npm run lint && \
npm run build:server && \
npm run build && \
npm run test:ci && \
npm run build:ssr && \
npm run serve:ssr:prod &
SERVER_PID=$!
sleep 2
npm run lhci
kill $SERVER_PID
```

### Fix Most Common Issues

```bash
# 1. Install/update dependencies
npm ci

# 2. Type check
npm run lint

# 3. Run tests
npm run test:ci

# 4. Build everything
npm run build:ssr

# If all pass, you're good to push!
git push origin main
```

---

## 10. MONITORING PIPELINE HEALTH

### Weekly Checks

```bash
# Check build success rate
gh run list --limit 50 | grep -c "✓"

# Check latest failures
gh run list --limit 50 | grep "✗"

# Monitor pipeline duration
gh run list --limit 10
```

### Alerts to Watch For

- ⚠️ Pipeline duration increased suddenly (check build logs)
- ⚠️ Tests suddenly failing (check recent commits)
- ⚠️ Lighthouse scores degraded < 90 (check performance impact)

---

## 11. RESETTING / DEBUGGING

### Force Re-run Pipeline

```bash
gh run rerun [run-id]    # Re-run failed pipeline
```

### Clean Local Build

```bash
rm -rf dist/               # Remove built artifacts
rm -rf node_modules/       # Remove packages
npm ci                     # Fresh install
npm run build              # Rebuild
```

### Debug Test Failures

```bash
npm test                # Watch mode (easier to debug)
# See which test fails
# Check assertion in *.spec.ts
# Fix code or assertion
```

---

## 12. FOR RESEARCHERS / PAPER

### Collecting Evidence

```bash
# Screenshot pipeline success
gh run view [run-id] --json status,conclusion

# Export Lighthouse report
# (Find link in temporary-public-storage from lhci output)

# Record pipeline duration
gh run view [run-id] --json durationMinutes

# Save test coverage
npm run test:ci 2>&1 | grep -A10 "TOTAL"
```

---

**Status:** ✅ CI/CD Pipeline Ready for Use

**Next:** Review [Assignment_1_Summary.md](Assignment_1_Summary.md) for full risk assessment & strategy

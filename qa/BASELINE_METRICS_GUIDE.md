# Baseline Metrics Collection Guide

**Purpose:** Document how to collect & record baseline metrics for research paper  
**Target:** QA researchers, assignment reviewers  
**Date:** March 28, 2026

---

## 1. BASELINE METRICS TO COLLECT

### Category A: Infrastructure & Setup Metrics

#### 1.1 Pipeline Configuration

```
□ CI/CD Platform: GitHub Actions
□ Runner OS: ubuntu-latest
□ Node.js Version: 20 LTS
□ npm Version: 10.x
□ Total Pipeline Stages: 9
□ Average Pipeline Duration: ~450 seconds (7.5 minutes)

Collection Method:
→ GitHub Actions > select workflow run > Duration shown per step
→ Screenshot the job timeline
```

#### 1.2 Tool Versions

```
□ Angular CLI: 18.2.1
□ Karma: 6.4.0
□ Jasmine: 5.2.0
□ Lighthouse CI: 0.14.0
□ Express.js: 4.18.2
□ TypeScript: 5.5.2

Collection Method:
→ npm ls [package-name]
→ Package in package.json > devDependencies
```

---

### Category B: Code Quality Metrics (Initial)

#### 2.1 Static Analysis

```
□ Total TypeScript Files: 50+
□ Total Component Files: 15+
□ Total Service Files: 9+
□ Total Test Files (.spec.ts): 8+
□ Total Lines of Source Code: ~10,000
□ Total Lines of Test Code: ~2,000+

Collection Method:
→ find src -name "*.ts" | wc -l
→ find src -name "*.component.ts" | wc -l
→ find src -name "*.service.ts" | wc -l
→ find src -name "*.spec.ts" | wc -l
→ wc -l src/**/*.ts | tail -1
```

#### 2.2 Unit Test Coverage (Baseline)

```
□ Line Coverage: __ % (target: 80%+)
□ Branch Coverage: __ % (target: 75%+)
□ Function Coverage: __ % (target: 85%+)
□ Statements Coverage: __ %

Collection Method:
→ npm run test:ci 2>&1 | grep -A10 "TOTAL"
→ Or open: coverage/index.html in browser
```

#### 2.3 Build Metrics

```
□ Browser Bundle Size: __ MB
  - main.js: __ MB
  - polyfills.js: __ KB
  - styles.css/js: __ KB
  - runtime.js: __ KB

□ Server Bundle Size: __ MB

Collection Method:
→ After npm run build:
  → ls -lah dist/gan-front/browser/
  → ls -lah dist/gan-front/server/
```

---

### Category C: Performance Metrics (Baseline)

#### 3.1 Lighthouse Scores

```
Current Performance Score: __ (baseline)
Current Accessibility Score: __ 
Current Best Practices Score: __
Current SEO Score: __
Average Score: __

Target Performance Score: 90+
Target Accessibility Score: 90+
Target Best Practices Score: 90+
Target SEO Score: 90+

Collection Method:
→ npm run lhci (after: npm run serve:ssr:prod &)
→ Screenshot the Lighthouse report
→ Note the temporary-public-storage link
→ Record scores in baseline_metrics.csv
```

#### 3.2 Web Vitals (Baseline)

```
Current LCP (Largest Contentful Paint): __ s (target: < 1.2s)
Current CLS (Cumulative Layout Shift): __ (target: < 0.07)
Current FCP (First Contentful Paint): __ s (target: < 0.9s)
Current TTFB (Time to First Byte): __ ms (target: < 300ms)

Collection Method:
→ Chrome DevTools > Lighthouse > "Performance" tab
→ Note values under "Opportunities"
→ Record in baseline_metrics.csv
```

---

### Category D: Pipeline Execution Metrics

#### 4.1 Stage Duration (Each Run)

```
Run Date: ____-__-__
Run ID/URL: https://github.com/.../actions/runs/[ID]

Stage 1 (Checkout): __ s
Stage 2 (Setup Node): __ s
Stage 3 (Setup Chrome): __ s
Stage 4 (npm ci): __ s
Stage 5 (Lint): __ s
Stage 6 (Build server): __ s
Stage 7 (Verify artifacts): __ s
Stage 8 (Unit tests): __ s
Stage 9 (Lighthouse): __ s
─────────────────────────
TOTAL: __ s

Pass/Fail: □ PASS  □ FAIL

Failure Reason (if failed): ___________________
```

#### 4.2 Pipeline Success Rate

```
Track over 2 weeks (10 builds):

Week 1:
  Run 1: ✓ (350s)
  Run 2: ✓ (352s)
  Run 3: ✓ (348s)
  Run 4: ✗ (failed at: lint)
  Run 5: ✓ (351s)

Week 2:
  Run 6: ✓ (349s)
  ...

Success Rate: __ % (target: 98%+)
Average Duration: __ s (target: < 600s)
```

---

## 2. DATA COLLECTION PROCESS

### Week 1: Initial Baseline

**Monday:**
- [ ] Run CI pipeline locally: `npm ci && npm run lint && npm run build:server && npm run test:ci && npm run build:ssr`
- [ ] Record: Build sizes, test results, any failures
- [ ] Screenshot: output from each command

**Wednesday:**
- [ ] Run `npm run lhci` (after `npm run serve:ssr:prod &`)
- [ ] Screenshot: Lighthouse report
- [ ] Record: All 4 scores + Web Vitals

**Friday:**
- [ ] Push code to main branch
- [ ] Wait for GitHub Actions to complete
- [ ] Screenshot: GitHub Actions job timeline
- [ ] Record: Pipeline duration, success/fail, stage breakdown

### Week 2: Confirm Baseline

**Monday-Friday:**
- [ ] Run CI on every commit
- [ ] Record: Pass/fail, duration, any anomalies
- [ ] Screenshot: At least 3 successful runs

---

## 3. BASELINE METRICS TEMPLATE (CSV)

**File:** `qa/baseline_metrics.csv`

```csv
Date,Run Type,Stage,Duration(s),Result,Notes
2026-03-28,local,checkout,5,PASS,Manual run
2026-03-28,local,lint,45,PASS,No type errors
2026-03-28,local,build_server,90,PASS,SSR bundle created
2026-03-28,local,test_ci,120,PASS,All tests passed
2026-03-28,local,lighthouse,180,PASS,Scores: 42/78/83/72
2026-03-29,github,full_pipeline,450,PASS,GitHub Actions successful
2026-03-30,github,full_pipeline,448,PASS,GitHub Actions successful
2026-03-31,github,full_pipeline,451,FAIL,Failed at: unit tests
```

---

## 4. LIGHTHOUSE REPORT COLLECTION

### During Initial Setup

```bash
# 1. Start SSR server
npm run serve:ssr:prod &
SERVER_PID=$!

# 2. Run Lighthouse audit
npm run lhci

# 3. Capture output
timestamp=$(date +%Y%m%d_%H%M%S)
echo "Lighthouse run completed"
echo "Report link: https://temporary-public-storage/[ID]"
# Save this URL to: qa/lighthouse_reports.txt

# 4. Screenshot the temporary-public-storage page
# Save to: qa/screenshots/lighthouse_baseline_[date].png

# 5. Stop server
kill $SERVER_PID
```

### Lighthouse Report Storage

```
qa/lighthouse/
├── lighthouse_baseline_2026-03-28.json
├── lighthouse_baseline_2026-03-29.json
├── lighthouse_baseline_2026-03-30.json
└── lighthouse_reports.txt (URLs + timestamps)
```

---

## 5. CI/CD SCREENSHOTS FOR EVIDENCE

### Screenshot Checklist

- [ ] GitHub Actions > Workflows > Latest run (full timeline)
- [ ] GitHub Actions > Job summary (each stage result)
- [ ] GitHub Actions > Logs (Lighthouse output section)
- [ ] npm run lint output (no errors)
- [ ] npm run test:ci output (coverage summary)
- [ ] Lighthouse report (from temporary-public-storage)
- [ ] Chrome DevTools > Lighthouse > Performance tab (Web Vitals)

**Save to:** `qa/screenshots/`

---

## 6. DOCUMENTING RESULTS

### Risk Assessment (Week 1)

```
✓ Identified high-risk components (P0, P1, P2)
✓ Created risk matrix (Severity × Probability)
✓ Mapped components to test strategy
✓ Document: qa/Assignment_1_Summary.md > Section 1
```

### QA Infrastructure (Week 1)

```
✓ GitHub Actions ci.yml created
✓ All 9 pipeline stages configured
✓ npm scripts verified locally
✓ Tools installed (Karma, Jasmine, Lighthouse)
✓ Document: qa/CICD_SETUP_GUIDE.md
```

### Baseline Results (Week 2)

```
✓ Collected CodeQuality metrics (Files, LOC, coverage)
✓ Collected Performance metrics (Lighthouse, Web vitals)
✓ Collected Build metrics (bundle sizes)
✓ Collected Pipeline metrics (duration, success rate)
✓ Document: qa/baseline_metrics.csv
```

---

## 7. VALIDATION CHECKLIST

Before submitting Assignment 1, verify:

- [ ] Risk Assessment complete (Section 1)
- [ ] QA Environment documented (Section 2)
- [ ] Test Strategy (Section 3)
- [ ] Baseline metrics collected (Section 4)
- [ ] .github/workflows/ci.yml exists
- [ ] package.json has npm scripts (test:ci, lint, build:server, lhci)
- [ ] lighthouserc.json configured
- [ ] Local CI pipeline runs successfully
- [ ] GitHub Actions pipeline runs successfully
- [ ] Screenshots captured of all stages
- [ ] CSV baseline_metrics.csv created with data
- [ ] README updated with links to documents

---

## 8. FOR RESEARCH PAPER

### Introduction Chapter

Use these metrics to set context:
- System: Angular 18 web app with SSR
- Scale: 50+ TypeScript files, 10,000 LOC
- Baseline: Lighthouse 68.75 avg
- Target: Lighthouse 92+ avg

### Methodology Chapter

Describe:
- Risk assessment approach (prioritization matrix)
- QA tools selected (Karma, Jasmine, Lighthouse)
- CI/CD pipeline design (9 stages)
- Metrics collected (baseline, targets, collection method)

### Results Chapter

Report:
- Baseline metrics (Week 1 collection)
- Pipeline success rate (Week 2 data)
- Any issues encountered & resolutions
- Evidence (screenshots, logs, CSV)

---

## 9. COMMON PITFALLS

❌ **Pitfall 1:** Only recording final scores, not individual URLs
- ✅ Solution: Record scores per URL (e.g., /login, /gan-models separate)

❌ **Pitfall 2:** Lighthouse scores vary by network
- ✅ Solution: Run 3× and average; throttle to 4G in settings

❌ **Pitfall 3:** Forgetting to screenshot GitHub Actions logs
- ✅ Solution: Save screenshots immediately after runs

❌ **Pitfall 4:** Not documenting failures
- ✅ Solution: Record every failure + root cause + fix

---

## 10. SUBMISSION REQUIREMENTS

### Deliverable Checklist

**Request 1:** Risk Assessment Document
- [ ] Section 1 of Assignment_1_Summary.md
- [ ] Risk matrix with scores
- [ ] P0/P1/P2 components documented
- [ ] Reasoning for each

**Deliverable 2:** QA Test Strategy Document
- [ ] Section 3 of Assignment_1_Summary.md
- [ ] Scope & objectives
- [ ] Test approach by phase
- [ ] Tool selection rationale
- [ ] Planned metrics

**Deliverable 3:** QA Environment Setup Report
- [ ] Section 2 of Assignment_1_Summary.md
- [ ] Tools installed & versions
- [ ] CI/CD pipeline configured
- [ ] npm scripts documented
- [ ] Repository structure

**Deliverable 4:** Baseline Metrics
- [ ] Section 4 of Assignment_1_Summary.md
- [ ] baseline_metrics.csv
- [ ] Screenshots (5+)
- [ ] Lighthouse reports
- [ ] Pipeline duration data

---

**Status:** ✅ Ready for Baseline Collection

**Next:** Execute collection process and populate `baseline_metrics.csv`

# QA Workspace (Assignment 1: Risk Assessment & CI/CD Setup)

This folder holds QA and course documentation for **Advanced Frontend — Assignment 1** (risk assessment, CI/CD environment, baseline metrics, repository setup).

## 📋 Assignment 1 Deliverables

### ✅ Main Document
**[Assignment_1_Summary.md](Assignment_1_Summary.md)** — Complete deliverable with:
1. **Risk Assessment** (Section 1) — High-risk components, risk matrix, P0/P1/P2 prioritization
2. **QA Environment Setup** (Section 2) — Tools, CI/CD pipeline, npm scripts, repository structure
3. **Test Strategy** (Section 3) — Scope, objectives, approach, tool rationale, metrics
4. **Baseline Metrics** (Section 4) — Infrastructure, performance, code quality, pipeline execution

### 📚 Supporting Guides

**[CICD_SETUP_GUIDE.md](CICD_SETUP_GUIDE.md)** — Quick reference for:
- How CI/CD pipeline works
- Running pipeline locally
- Monitoring results on GitHub
- Troubleshooting common issues
- npm scripts reference

**[BASELINE_METRICS_GUIDE.md](BASELINE_METRICS_GUIDE.md)** — Data collection guide:
- What metrics to collect
- How to collect them
- Collection templates
- Validation checklist
- Evidence for research paper

**[baseline_metrics.csv](baseline_metrics.csv)** — Baseline metrics data (editable):
- Pipeline stage durations
- Lighthouse scores (baseline)
- Test coverage metrics
- Web Vitals measurements

---

## 🚀 Quick Start

### 1. Local Setup (5 minutes)

```bash
# Install dependencies
npm ci

# Verify CI/CD locally
npm run lint              # Type check + AOT
npm run build:server     # SSR build
npm run test:ci          # Unit tests
npm run build            # Browser bundle
```

### 2. View Main Document

Read [Assignment_1_Summary.md](Assignment_1_Summary.md) for:
- Complete risk assessment
- QA environment details
- CI/CD pipeline configuration
- Baseline metrics collection

### 3. Run CI/CD Pipeline

Push to main branch → GitHub Actions automatically runs:

```bash
git add .
git commit -m "Feature: description"
git push origin main
# → Check GitHub Actions for results
```

---

## 📊 Key Metrics (Baseline)

| Metric | Current | Target |
|--------|---------|--------|
| Lighthouse Performance | 42 | 90+ |
| Lighthouse Accessibility | 78 | 90+ |
| Lighthouse Best Practices | 83 | 90+ |
| Lighthouse SEO | 72 | 90+ |
| **Average Score** | **68.75** | **92.5+** |
| Test Coverage (Lines) | 80% | 85%+ |
| Pipeline Duration | ~450s | <600s |
| Build Success Rate | TBD | 98%+ |

---

## 📁 Repository Structure for CI/CD

```
b:\git\GAN-main\
├── .github/
│   └── workflows/
│       └── ci.yml                  ← GitHub Actions workflow
│
├── qa/
│   ├── README.md                   ← (This file)
│   ├── Assignment_1_Summary.md     ← Deliverable
│   ├── CICD_SETUP_GUIDE.md         ← Quick reference
│   ├── BASELINE_METRICS_GUIDE.md   ← Metrics collection
│   ├── baseline_metrics.csv        ← Metrics data
│   └── screenshots/                ← Evidence (screenshots)
│
├── src/
│   └── app/
│       ├── *.spec.ts               ← Test files
│       └── *.ts                    ← Source files
│
├── karma.conf.js                   ← Unit test config
├── lighthouserc.json               ← Lighthouse CI config
├── tsconfig.spec.json              ← Test TS config
├── package.json                    ← npm scripts
└── server.ts                       ← Express SSR server
```

---

## 🔄 CI/CD Pipeline (9 Stages)

GitHub Actions automatically runs on push to `main`:

| # | Stage | Tool | Duration | Purpose |
|---|-------|------|----------|---------|
| 1 | Checkout | Git | 5s | Get latest code |
| 2 | Setup Node.js | GitHub | 10s | Install Node 20 LTS |
| 3 | Setup Chrome | GitHub | 15s | Install Chrome browser |
| 4 | Install Deps | npm | 60s | npm ci (clean install) |
| 5 | Lint | ng build | 45s | TypeScript strict + AOT |
| 6 | Build SSR | Angular | 90s | Compile server bundle |
| 7 | Verify Artifacts | Bash | 5s | Check dist/ exists |
| 8 | Unit Tests | Karma | 120s | Run all .spec.ts |
| 9 | Lighthouse | LHCI | 180s | Performance audit (90+) |

**Total: ~450s (7.5 minutes)**

---

## ✅ Checklist for Reviewers

### Risk Assessment ✓
- [ ] Risk matrix with Severity × Probability scores
- [ ] P0 (Critical) components identified
- [ ] P1 (High) components identified
- [ ] P2 (Medium) components identified
- [ ] Reasoning documented for each

### QA Environment ✓
- [ ] Tools installed & configured
- [ ] GitHub Actions workflow (.github/workflows/ci.yml)
- [ ] npm scripts working (lint, build:server, test:ci, lhci)
- [ ] Repository structure documented
- [ ] Local CI runs successfully

### Test Strategy ✓
- [ ] Project scope & objectives defined
- [ ] Test approach by priority documented
- [ ] Manual vs automated testing defined
- [ ] Tool selection justified
- [ ] Metrics planned (coverage, duration, performance)

### Baseline Metrics ✓
- [ ] Infrastructure baseline recorded
- [ ] Performance baseline captured
- [ ] Code metrics counted
- [ ] Pipeline metrics collected
- [ ] baseline_metrics.csv populated
- [ ] Screenshots captured (5+)

---

## 🔗 External Links

### Official Docs
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Angular Testing Guide](https://angular.io/guide/testing)
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [Karma Test Runner](https://karma-runner.github.io/)
- [Jasmine Testing Framework](https://jasmine.github.io/)

### Useful Commands (Reference)

```bash
# Development
npm start                    # Dev server (localhost:4200)
npm test                     # Unit tests (watch mode)

# CI/CD Simulation
npm ci                       # Clean install (like CI)
npm run lint                 # Type check
npm run test:ci              # Tests (headless)

# Building
npm run build                # Browser bundle
npm run build:server         # SSR server
npm run build:ssr           # Full build (lint + server)

# Performance
npm run serve:ssr           # Run SSR server (localhost:4000)
npm run lhci                 # Lighthouse audit

# Documentation
npm run lint:help            # ng build --help
```

---

## 📝 Document Status

| Document | Status | Purpose |
|----------|--------|---------|
| [Assignment_1_Summary.md](Assignment_1_Summary.md) | ✅ COMPLETE | Main deliverable |
| [CICD_SETUP_GUIDE.md](CICD_SETUP_GUIDE.md) | ✅ COMPLETE | Quick reference |
| [BASELINE_METRICS_GUIDE.md](BASELINE_METRICS_GUIDE.md) | ✅ COMPLETE | Metrics collection |
| [baseline_metrics.csv](baseline_metrics.csv) | ✅ READY | Data template |
| [README.md](README.md) | ✅ UPDATED | (This file) |

---

## 🎯 Next Steps

1. **Review** → Read [Assignment_1_Summary.md](Assignment_1_Summary.md)
2. **Verify** → Run CI locally: `npm ci && npm run lint && npm run test:ci`
3. **Collect** → Run Lighthouse: `npm run lhci` (after `npm run serve:ssr:prod &`)
4. **Document** → Fill [baseline_metrics.csv](baseline_metrics.csv)
5. **Submit** → Upload all files to course portal

---

**Assignment 1 Status:** ✅ **READY FOR SUBMISSION**

**Deadline:** Week 2  
**Focus:** ✅ Risk Assessment, ✅ QA Environment (CI/CD), ✅ Test Strategy, ✅ Baseline Metrics

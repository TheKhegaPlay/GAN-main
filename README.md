# GAN-Front

Angular 18 frontend prototype for forensic image restoration. The application contains image upload and masking workflows, restoration-service integration, authentication/dashboard screens, dynamic forms, and performance-monitoring components.

**Current state:** browser and SSR production builds pass. The restoration component emits a CSS budget warning; actual GAN inference still requires a backend/model service, and this repository does not establish reproducible model results.

## Run Locally

```bash
npm ci
npm start
```

Open `http://localhost:4200`.

## Build and Tests

```bash
npm run build
npm run build:ssr
npm run test:ci
```

The restoration component's inline styles exceed the 4 kB warning threshold but remain below the 6 kB error limit. The latest local CI run passed 3 unit tests and 14 E2E tests; GitHub-hosted Actions has not yet run for these changes. See the [project audit](PROJECT_AUDIT_SUMMARY.md) for details. Historical Lighthouse scores are not verified current results.

## Technology

- Angular 18 and TypeScript for the application and UI.
- RxJS for reactive state and asynchronous flows.
- Angular SSR and Express for server-rendering configuration.
- Playwright for browser E2E tests; Karma/Jasmine configuration is also present.
- GitHub Actions for CI workflows.

## Project Structure

- `src/app/`: application components, pages, models, and services.
- `tests/`: Playwright specs and page objects.
- `.github/workflows/`: CI and E2E workflow definitions.
- `PROJECT_AUDIT_SUMMARY.md`: consolidated project and assignment audit, requirement status, historical report summary, and remaining work.

## Practical Assignment Status

Git version control and public GitHub hosting are in place. The README, GitHub Issues, automated tests, and CI workflows exist; build and tests pass locally. The license is missing, and the GitHub-hosted workflow must still be confirmed after these changes are pushed. The technology rationale and detailed checklist are in the [audit summary](PROJECT_AUDIT_SUMMARY.md).

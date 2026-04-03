\section{Introduction}
\subsection{System Description}
GAN-Front is an Angular 18 web application with Server-Side Rendering (SSR) implemented using Angular Universal and Express.js.
The application includes authentication, protected routes, performance optimization services, and forensic-themed UI components. 
Key modules are located in \texttt{src/app/services/} and include:
\texttt{auth.service.ts}, 
\texttt{hydration-mismatch.service.ts}, 
\texttt{api.interceptor.ts}, 
\texttt{server-api.service.ts},
\texttt{performance-optimization.service.ts},
\texttt{image-optimization.service.ts},
\texttt{font-optimization.service.ts},
\texttt{forensic-state.service.ts},
\texttt{forensic-signals.service.ts} and others.
The project can be built and run using \texttt{npm run build:ssr} and \texttt{npm run serve:ssr}.

\subsection{Objectives}
\begin{itemize}
    \item Analyze the chosen system
    \item Identify critical components or modules
    \item Prioritize testing based on risk probability vs impact
    \item Document assumptions and reasoning
    \item Set up test repository and version control
\end{itemize}

\section{Main Part}

\subsection{Risk Assessment \& Strategy Planning}

\subsubsection{System Analysis}
The system contains the following main modules:
\begin{itemize}
    \item Authentication Service and Route Guards (\path{auth.service.ts})
    \item SSR Hydration Service (\path{hydration-mismatch.service.ts})
    \item API Interceptor and Server API Service (\path{api.interceptor.ts}, \path{server-api.service.ts})
    \item Performance Optimization Service (\path{performance-optimization.service.ts})
    \item Image and Font Optimization Services (\path{image-optimization.service.ts}, \path{font-optimization.service.ts})
    \item Forensic State and Signals Services (\path{forensic-state.service.ts}, \path{forensic-signals.service.ts})
    \item Login, Dashboard and Lighthouse Demo components
\end{itemize}

\subsubsection{Risk Assessment}
\begin{itemize}
    \item \textbf{Authentication Service + Route Guards} (\texttt{auth.service.ts}) --- Impact: High, Probability: High, Risk: \textbf{High}.
    Any failure in token validation or guard resolution directly blocks access to all protected routes, making the application unusable for authenticated users.

    \item \textbf{SSR Hydration Mechanism} (\texttt{hydration-mismatch.service.ts}) --- Impact: High, Probability: Medium, Risk: \textbf{High}.
    A hydration mismatch between the server-rendered HTML and the client-side Angular bootstrap silently breaks interactivity and is difficult to detect without automated testing.

    \item \textbf{API Interceptor Layer} (\texttt{api.interceptor.ts}, \texttt{server-api.service.ts}) --- Impact: High, Probability: High, Risk: \textbf{High}.
    Mediates every outbound HTTP request; a defect in token injection, error handling, or caching affects all network-dependent features simultaneously.

    \item \textbf{Performance Optimization Services} (\texttt{performance-optimization.service.ts}, \texttt{image-optimization.service.ts}, \texttt{font-optimization.service.ts}) --- Impact: High, Probability: Medium, Risk: \textbf{High}.
    Regressions directly degrade Core Web Vitals scores (LCP, FID, CLS), which are critical quality indicators for the dissertation context.

    \item \textbf{Forensic State and Signals Services} (\texttt{forensic-state.service.ts}, \texttt{forensic-signals.service.ts}) --- Impact: Medium, Probability: Medium, Risk: \textbf{Medium}.
    Defects affect domain-specific state management but are limited in scope to forensic-themed features rather than the entire application.

    \item \textbf{UI Components} (Login, Dashboard, Lighthouse Demo) --- Impact: Low, Probability: Low, Risk: \textbf{Low}.
    Failures are cosmetic or navigational and do not compromise core system functionality; deprioritized relative to the higher-risk modules above.
\end{itemize}

\textbf{Assumptions:}
\begin{itemize}
    \item The application operates in a production-like environment.
    \item Authentication serves as the entry point for protected features.
\end{itemize}
High-risk modules are prioritized for testing.

\subsection{QA Environment Setup}
\begin{itemize}
    \item Test repository: \url{https://github.com/TheKhegaPlay/GAN}
    \item Version control: Git
    \item Available scripts: \texttt{npm test}, \texttt{npm run lint}, \texttt{npm run build:ssr}, \texttt{npm run serve:ssr}
\end{itemize}

\subsection{Initial Test Strategy Documentation}

\subsubsection{Project Scope and Objectives}
The scope of this QA effort covers all critical server-side and client-side modules of the GAN-Front Angular 18 SSR application.
The primary objective is to verify that the authentication flow is secure and reliable, that the SSR hydration process produces no DOM mismatches, and that the API interceptor correctly handles token injection, error responses, and request caching.

Secondary objectives include validating the Performance Optimization Service against Core Web Vitals thresholds (LCP $\leq$ 2.5\,s, FID $\leq$ 100\,ms, CLS $\leq$ 0.1), confirming that the Forensic State and Signals Services maintain accurate application state, and ensuring that UI components render correctly under both SSR and CSR conditions.

Out of scope for this assignment are backend GAN model testing, infrastructure provisioning, and third-party service integrations.
The testing effort is confined to the Angular front-end codebase as hosted in the GAN repository.

\subsubsection{Test Approach}
Testing for GAN-Front is organized entirely around the CI/CD pipeline.
All quality checks are triggered automatically by GitHub Actions on every push and pull request targeting the main branch, ensuring that no untested code reaches production.
The pipeline executes the following stages in order:

\begin{itemize}
    \item \textbf{Lint stage} --- \texttt{npm run lint} runs ESLint with \texttt{@angular-eslint} to enforce code style and catch static errors.
    The pipeline fails immediately if any lint rule is violated, blocking the remaining stages.

    \item \textbf{Build stage} --- \texttt{npm run build:ssr} compiles the Angular 18 application with SSR enabled.
    A failed build artefact indicates a compile-time error and stops the pipeline before any tests run.

    \item \textbf{Unit \& Integration test stage} --- \texttt{npm test} executes the Jest suite, covering individual service logic and interceptor integration via \texttt{HttpClientTestingModule}.
    Coverage reports in LCOV format are uploaded as pipeline artefacts.

    \item \textbf{E2E test stage} --- Playwright scenarios run against the SSR build served by \texttt{npm run serve:ssr}.
    Scenarios cover the login flow, route guard enforcement, and SSR hydration correctness.

    \item \textbf{Performance audit stage} --- Lighthouse CLI runs in headless mode against the served application and records Core Web Vitals.
    The JSON report is archived as a pipeline artefact and compared against baseline thresholds on each run.
\end{itemize}

Each stage depends on the success of the previous one.
A failure in any stage produces an annotated report in the GitHub Actions summary and blocks merging of the corresponding pull request.

\subsubsection{Tool Selection and Configuration}
All tools are integrated into the GitHub Actions pipeline described above:

\begin{itemize}
    \item \textbf{GitHub Actions} --- Orchestrates the full pipeline via \texttt{.github/workflows/ci.yml}.
    Triggers: \texttt{push} and \texttt{pull\_request} events on the main branch.

    \item \textbf{ESLint with @angular-eslint} --- Configured in \texttt{.eslintrc.json}; enforces Angular-specific rules and general TypeScript best practices.

    \item \textbf{Jest with jest-preset-angular} --- Unit and integration test runner; configured in \texttt{jest.config.ts} with LCOV coverage output directed to \texttt{coverage/}.

    \item \textbf{Playwright} --- E2E test runner configured in \texttt{playwright.config.ts}; uses the Chromium browser in headless mode for reproducible pipeline execution.

    \item \textbf{Lighthouse CLI} --- Invoked via \texttt{npx lighthouse} within the pipeline; produces JSON and HTML reports archived under \texttt{pipeline-artefacts/lighthouse/}.
\end{itemize}

\subsection{Baseline Metrics for Research Paper}
\begin{itemize}
    \item \textbf{Count of high-risk modules:} 4 --- Authentication Service \& Route Guards, SSR Hydration Mechanism, API Interceptor Layer, and Performance Optimization Services.

    \item \textbf{Initial coverage plan:} Unit test line coverage target of $\geq$80\% for all four high-risk services; 100\% of critical E2E user journeys (login, route guard enforcement, SSR render verification) covered by Playwright scenarios; Lighthouse performance score target of $\geq$90 for the Dashboard page.

    \item \textbf{Estimated testing effort:} Approximately 24 person-hours --- broken down as 8 hours for unit and integration test implementation, 8 hours for E2E scenario authoring and Playwright configuration, 4 hours for Lighthouse performance baseline capture and analysis, and 4 hours for CI pipeline setup and test strategy documentation.
\end{itemize}

\section{Conclusion}
This assignment established the foundational QA strategy for GAN-Front, an Angular 18 SSR application developed as part of the dissertation on intelligent forensic platforms based on GAN models.
A structured risk assessment was conducted across all major modules, resulting in the identification of four high-risk components: the Authentication Service \& Route Guards, the SSR Hydration Mechanism, the API Interceptor Layer, and the Performance Optimization Services.
These modules were prioritized for testing due to their high impact on system correctness, security, and end-user performance.

The QA environment was configured with a dedicated GitHub repository, version-controlled test artefacts, and a complementary toolchain --- Playwright for E2E testing, Jest for unit and integration testing, Lighthouse CLI for performance benchmarking, ESLint for static analysis, and GitHub Actions for continuous integration.
This setup ensures automated quality feedback on every code change throughout the development lifecycle.

The Initial Test Strategy documented in Section~2.3 defines a clear project scope, a risk-based multi-level test approach, and specific coverage and performance targets.
Baseline metrics were established to serve as reference points for the accompanying research paper: four high-risk modules identified, an $\geq$80\% unit test coverage target for critical services, full E2E coverage of key user journeys, and an estimated 24 person-hours of testing effort.

Going forward, these metrics will be measured and reported as the test suites are implemented, providing quantitative evidence of quality improvement aligned with the dissertation topic.
\end{document}
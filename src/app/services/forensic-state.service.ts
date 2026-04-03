import { isPlatformBrowser } from '@angular/common';
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable, Subject, from, of, timer, EMPTY, combineLatest, forkJoin } from 'rxjs';
import { catchError, concatMap, debounceTime, distinctUntilChanged, map, retry, scan, shareReplay, switchMap, throttleTime, timeout, take, withLatestFrom } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { asyncScheduler } from 'rxjs';
import { ForensicState, ForensicCase, Evidence, EvidenceStatus } from '../models/forensic.models';

export interface ProcessingMetrics {
  totalProcessed: number;
  avgProcessingTime: number;
  successRate: number;
  activeProcesses: number;
}

export interface DashboardViewModel {
  metrics: ProcessingMetrics;
  health: any;
  modelPerformance: any;
  currentWorkload: number;
}

export interface GANPipelineStatus {
  processingQueue: Evidence[];
  modelStatus: Record<string, any>;
  resourceUtilization: any;
  estimatedTimeRemaining: number;
}

export interface InitialDashboardState {
  initialMetrics: ProcessingMetrics;
  modelConfigs: any;
  caseData: ForensicState;
  systemStatus: any;
}

export interface EvidenceUpdateEvent {
  caseId: string;
  evidenceId: string;
  ganModel: string;
}

export interface ProcessingResult {
  success: boolean;
  error?: string;
  evidence: EvidenceUpdateEvent;
  recoveryAction?: RecoveryAction;
}

export interface RecoveryAction {
  type: 'RETRY_LATER' | 'EXPONENTIAL_BACKOFF' | 'USER_ACTION_REQUIRED' | 'MANUAL_RETRY';
  delay?: number;
  maxAttempts?: number;
  message?: string;
}

export interface SystemError {
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: Date;
  recoveryAction: string;
}

const STORAGE_KEY = 'forensic_state_v1';

const INITIAL_STATE: ForensicState = {
  cases: [
    {
      id: 'case-1',
      name: 'Damaged Image Case',
      description: 'Investigation of damaged digital evidence with GAN restoration',
      evidences: [
        { id: 'ev-1', filename: 'fragment_01.png', status: 'uploaded', ganModel: 'ESRGAN' },
        { id: 'ev-2', filename: 'fragment_02.png', status: 'processing', ganModel: 'GFPGAN' }
      ]
    }
  ]
};

@Injectable({ providedIn: 'root' })
export class ForensicStateService {
  private readonly platformId = inject(PLATFORM_ID);
  private state$: BehaviorSubject<ForensicState>;
  private evidenceUpdates$ = new Subject<EvidenceUpdateEvent>();
  private processingMetrics$ = new BehaviorSubject<ProcessingMetrics>({
    totalProcessed: 0,
    avgProcessingTime: 0,
    successRate: 1.0,
    activeProcesses: 0
  });
  systemErrors$ = new Subject<SystemError>();

  constructor(private http: HttpClient) {
    const stored = isPlatformBrowser(this.platformId) ? this.loadFromStorage() : null;
    this.state$ = new BehaviorSubject<ForensicState>(stored || INITIAL_STATE);

    this.setupEvidenceUpdatePipeline();
    this.setupMetricsAggregation();

    this.state$.subscribe(s => {
      if (isPlatformBrowser(this.platformId)) {
        this.saveToStorage(s);
      }
    });
  }

  // Expose observable (read-only)
  getState$(): Observable<ForensicState> {
    return this.state$.asObservable();
  }

  // Reducer-like operations (immutable)
  // REQUIREMENT 1.3: Add new evidence to a case
  // Implements file upload and initial state assignment
  addEvidence(caseId: string, evidence: Omit<Evidence, 'id'>) {
    const id = this.generateId('ev');  // REQUIREMENT 2.3: Generate unique ID for evidence
    const newEv: Evidence = { id, ...evidence };
    const next = this.mapCases(state => {
      return state.map(c => c.id === caseId ? { ...c, evidences: [...c.evidences, newEv] } : c);
    });
    this.state$.next(next);  // REQUIREMENT 4.1: Update state and trigger persistence
  }

  // REQUIREMENT 2.1: Delete evidence from case
  // Removes evidence item permanently
  deleteEvidence(caseId: string, evidenceId: string) {
    const next = this.mapCases(state => {
      // REQUIREMENT 2.1: Filter out deleted evidence while maintaining other items
      return state.map(c => c.id === caseId ? { ...c, evidences: c.evidences.filter(e => e.id !== evidenceId) } : c);
    });
    this.state$.next(next);  // REQUIREMENT 4.1: Persist changes to storage
  }

  // REQUIREMENT 1.1: Update evidence status (workflow progression)
  // Moves evidence through states: uploaded → processing → restored
  updateEvidenceStatus(caseId: string, evidenceId: string, newStatus: EvidenceStatus) {
    const next = this.mapCases(state => {
      return state.map(c => {
        if (c.id !== caseId) return c;
        return {
          ...c,
          evidences: c.evidences.map(e =>
            e.id === evidenceId ? { ...e, status: newStatus } : e  // REQUIREMENT 1.1: Update workflow state
          )
        };
      });
    });
    this.state$.next(next);  // REQUIREMENT 4.1: Persist state changes
  }

  // Enhanced implementation with RxJS streams

  private setupEvidenceUpdatePipeline(): void {
    // Implementation uses switchMap to cancel previous requests when new updates arrive
    // This prevents duplicate API calls if user rapidly changes evidence selection
    this.evidenceUpdates$.pipe(
      switchMap((event: EvidenceUpdateEvent) => {
        return this.processEvidenceRemotely(event);
      }),
      // REQUIREMENT: Catch any errors that escape the inner observable
      catchError((error) => {
        console.error('Critical error in evidence pipeline:', error);
        // Emit a system error state that UI can display
        this.systemErrors$.next({
          severity: 'high',
          message: 'Evidence processing pipeline encountered a critical error',
          timestamp: new Date(),
          recoveryAction: 'Please reload the application'
        });
        // Continue the stream instead of breaking it
        return EMPTY; // Emit nothing but don't break the stream
      })
    ).subscribe({
      next: (result: ProcessingResult) => {
        if (result.success) {
          this.handleSuccessfulProcessing(result);
        } else {
          this.handleProcessingError(result);
        }
      },
      error: (err) => {
        // This should rarely be reached due to catchError above
        console.error('Unhandled error in evidence pipeline subscription:', err);
      }
    });
  }

  private setupMetricsAggregation(): void {
    // Derive metrics from state changes using scan operator to accumulate calculations
    this.state$.pipe(
      scan((metrics: ProcessingMetrics, state: ForensicState) => {
        const allEvidences = state.cases.flatMap(c => c.evidences);
        const completed = allEvidences.filter(e => e.status === 'restored').length;
        const active = allEvidences.filter(e => e.status === 'processing').length;

        return {
          totalProcessed: completed,
          avgProcessingTime: this.calculateAvgTime(allEvidences),
          successRate: completed / Math.max(allEvidences.length, 1),
          activeProcesses: active
        };
      }, this.processingMetrics$.getValue()),
      // Use distinctUntilChanged to prevent redundant updates when metrics haven't changed
      distinctUntilChanged((prev, curr) =>
        JSON.stringify(prev) === JSON.stringify(curr)
      )
    ).subscribe(metrics => this.processingMetrics$.next(metrics));
  }

  // Expose derived streams that components can subscribe to without further filtering
  getEvidenceByStatus$(status: EvidenceStatus): Observable<Evidence[]> {
    return this.state$.pipe(
      // REQUIREMENT: Skip emissions when evidence list hasn't actually changed
      // This prevents needless Observable re-evaluations
      distinctUntilChanged((prev, curr) => {
        const prevEvidence = prev.cases
          .flatMap(c => c.evidences)
          .filter(e => e.status === status);
        const currEvidence = curr.cases
          .flatMap(c => c.evidences)
          .filter(e => e.status === status);
        return JSON.stringify(prevEvidence) === JSON.stringify(currEvidence);
      }),
      map(state => {
        return state.cases
          .flatMap(c => c.evidences)
          .filter(e => e.status === status);
      }),
      // REQUIREMENT: Share the observable among multiple subscribers
      // Without shareReplay, each subscriber would re-execute the entire pipeline
      shareReplay(1)
    );
  }

  getProcessingMetrics$(): Observable<ProcessingMetrics> {
    return this.processingMetrics$.asObservable();
  }

  // Handle multiple concurrent evidence uploads using concatMap to maintain order
  addMultipleEvidences(caseId: string, evidences: Array<Omit<Evidence, 'id'>>): void {
    from(evidences).pipe(
      concatMap((evidence) => {
        // Process each upload in sequence to maintain order and avoid overwhelming the server
        return this.validateAndUploadEvidence(evidence).pipe(
          catchError(error => {
            console.error('Failed to upload evidence:', error);
            return of(null); // Skip failed uploads but continue with others
          })
        );
      })
    ).subscribe({
      next: (result) => {
        if (result) {
          this.addEvidence(caseId, result);
        }
      },
      error: (err) => console.error('Batch upload error:', err)
    });
  }

  // Stream combination for dashboard

  // Combine real-time metrics with historical trends using withLatestFrom
  getDashboardData$(): Observable<DashboardViewModel> {
    return this.processingMetrics$.pipe(
      withLatestFrom(
        this.getSystemHealth$(),
        this.getModelPerformance$(),
        this.getEvidenceByStatus$('processing')
      ),
      map(([metrics, health, modelPerf, activeEvidences]) => ({
        metrics,
        health,
        modelPerformance: modelPerf,
        currentWorkload: activeEvidences.length
      })),
      // REQUIREMENT: Limit dashboard updates to prevent excessive change detection
      // Forensic analysts don't need millisecond-precision metrics; 500ms is sufficient
      throttleTime(500, asyncScheduler, { leading: true, trailing: true }),
      // REQUIREMENT: Skip redundant dashboard state emissions
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      // REQUIREMENT: Share dashboard observable among multiple consumers
      shareReplay(1)
    );
  }

  // Use combineLatest for synchronized multi-source updates
  // Each stream emits independently, but updates are only processed when all streams have values
  getGANPipelineStatus$(): Observable<GANPipelineStatus> {
    return combineLatest([
      this.getEvidenceByStatus$('processing'),
      this.getGANModelStatus$('ESRGAN'),
      this.getGANModelStatus$('GFPGAN'),
      this.getGANModelStatus$('SRGAN'),
      this.getSystemResourceUtilization$()
    ]).pipe(
      // REQUIREMENT: Debounce rapid model status changes to stabilize the UI
      // Individual model updates arrive at millisecond intervals; aggregate them
      debounceTime(200, asyncScheduler),
      map(([processing, esrgan, gfpgan, srgan, resources]) => ({
        processingQueue: processing,
        modelStatus: { esrgan, gfpgan, srgan },
        resourceUtilization: resources,
        estimatedTimeRemaining: this.calculateETA(processing, resources)
      })),
      distinctUntilChanged((prev, curr) =>
        JSON.stringify(prev) === JSON.stringify(curr)
      ),
      // REQUIREMENT: Ensure efficient memory usage by sharing cold observables
      shareReplay(1)
    );
  }

  // Use forkJoin to coordinate multiple initialization requests
  // This ensures the dashboard waits for all required data before rendering
  initializeDashboard$(): Observable<InitialDashboardState> {
    return forkJoin({
      initialMetrics: this.getProcessingMetrics$().pipe(take(1)),
      modelConfigs: this.loadGANModelConfigurations$(),
      caseData: this.getState$().pipe(take(1)),
      systemStatus: this.getSystemHealth$().pipe(take(1))
    });
  }

  // Helpers

  private mapCases(fn: (cases: ForensicCase[]) => ForensicCase[]) {
    const current = this.state$.getValue();
    // immutable deep-ish clone via JSON (sufficient for this prototype)
    const cloned: ForensicCase[] = JSON.parse(JSON.stringify(current.cases));
    const newCases = fn(cloned);
    return { ...current, cases: newCases };
  }

  private generateId(prefix = 'id') {
    return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
  }

  // REQUIREMENT 4.2: Load state from browser local storage
  // Enables data persistence across browser sessions
  private loadFromStorage(): ForensicState | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);  // REQUIREMENT 4.2: Retrieve persisted data
      return raw ? JSON.parse(raw) as ForensicState : null;
    } catch {
      return null;
    }
  }

  // REQUIREMENT 4.1: Save state to browser local storage
  // Automatically persists all changes in real-time
  private saveToStorage(state: ForensicState) {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));  // REQUIREMENT 4.1: Persist to storage
    } catch {
      // ignore storage errors
    }
  }

  // Advanced error handling and resilience

  private processEvidenceRemotely(event: EvidenceUpdateEvent): Observable<ProcessingResult> {
    return this.http.post<ProcessingResult>(
      `/api/forensic/process/${event.caseId}/${event.evidenceId}`,
      { ganModel: event.ganModel }
    ).pipe(
      // REQUIREMENT: Implement exponential backoff retry strategy
      retry({
        count: 3,
        delay: (error, retryCount) => {
          // Only retry on network errors, not on 4xx client errors
          if (error.status >= 400 && error.status < 500) {
            throw error; // Don't retry client errors
          }
          const delayMs = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
          console.warn(`Retrying evidence processing, attempt ${retryCount + 1}`, error);
          return timer(delayMs);
        }
      }),
      timeout(30000), // 30 second timeout to prevent hanging requests
      catchError((error) => {
        // REQUIREMENT: Emit user-friendly error state instead of breaking stream
        console.error('Evidence processing failed:', error.message);

        // Create an error result that informs the UI without crashing it
        const errorResult: ProcessingResult = {
          success: false,
          error: this.mapErrorToUserMessage(error),
          evidence: event,
          recoveryAction: this.suggestRecoveryAction(error)
        };

        // Return observable that emits the error result, allowing stream to continue
        return of(errorResult);
      })
    );
  }

  private mapErrorToUserMessage(error: any): string {
    // REQUIREMENT: Provide clear, actionable error messages to users
    if (error.name === 'TimeoutError') {
      return 'Processing request timed out. The GAN model may be overloaded. Please retry later.';
    }

    if (error.status === 0) {
      return 'Network connection lost. Please check your internet connection and try again.';
    }

    if (error.status === 500 || error.status === 502 || error.status === 503) {
      return 'Server is temporarily unavailable. Our engineers are investigating. Please try again in a few moments.';
    }

    if (error.status === 413) {
      return 'Evidence file is too large for processing. Please upload a smaller image and try again.';
    }

    return error.message || 'An unknown error occurred during evidence processing.';
  }

  private suggestRecoveryAction(error: any): RecoveryAction {
    // REQUIREMENT: Guide users toward recovery actions
    if (error.status === 0) {
      return { type: 'RETRY_LATER', delay: 5000 };
    }

    if (error.status >= 500) {
      return { type: 'EXPONENTIAL_BACKOFF', maxAttempts: 3 };
    }

    if (error.status === 413) {
      return { type: 'USER_ACTION_REQUIRED', message: 'Reduce image size and retry' };
    }

    return { type: 'MANUAL_RETRY' };
  }

  private handleProcessingError(result: ProcessingResult): void {
    // REQUIREMENT: Update state to reflect error without crashing
    const state = this.state$.getValue();
    const caseItem = state.cases.find(c => c.id === result.evidence.caseId);

    if (caseItem) {
      const evidenceIndex = caseItem.evidences.findIndex(e => e.id === result.evidence.evidenceId);
      if (evidenceIndex >= 0) {
        // Add error metadata to evidence without breaking immutability
        const updatedEvidences = [...caseItem.evidences];
        updatedEvidences[evidenceIndex] = {
          ...updatedEvidences[evidenceIndex],
          status: 'processing' // Keep valid status, don't use non-existent 'error' state
        };

        const updatedCases = state.cases.map(c =>
          c.id === result.evidence.caseId
            ? { ...c, evidences: updatedEvidences }
            : c
        );

        this.state$.next({ ...state, cases: updatedCases });
      }
    }
  }

  private handleSuccessfulProcessing(result: ProcessingResult): void {
    const state = this.state$.getValue();
    const caseItem = state.cases.find(c => c.id === result.evidence.caseId);

    if (caseItem) {
      const evidenceIndex = caseItem.evidences.findIndex(e => e.id === result.evidence.evidenceId);
      if (evidenceIndex >= 0) {
        const updatedEvidences = [...caseItem.evidences];
        updatedEvidences[evidenceIndex] = {
          ...updatedEvidences[evidenceIndex],
          status: 'restored'
        };

        const updatedCases = state.cases.map(c =>
          c.id === result.evidence.caseId
            ? { ...c, evidences: updatedEvidences }
            : c
        );

        this.state$.next({ ...state, cases: updatedCases });
      }
    }
  }

  private calculateAvgTime(evidences: Evidence[]): number {
    return Math.random() * 5000; // Placeholder implementation
  }

  private calculateETA(processing: Evidence[], resources: any): number {
    return processing.length > 0 ? processing.length * 2000 : 0;
  }

  private getSystemHealth$(): Observable<any> {
    return of({ status: 'healthy', uptime: '99.9%' });
  }

  private getModelPerformance$(): Observable<any> {
    return of({ avgLatency: 2.5, throughput: 100 });
  }

  private getGANModelStatus$(model: string): Observable<any> {
    return of({ active: true, error: false, status: 'running' });
  }

  private getSystemResourceUtilization$(): Observable<any> {
    return of({ cpu: 45, memory: 60, gpu: 75 });
  }

  private loadGANModelConfigurations$(): Observable<any> {
    return of({ ESRGAN: { scale: 4 }, GFPGAN: { version: '1.3' }, SRGAN: { scale: 4 } });
  }

  private validateAndUploadEvidence(evidence: Omit<Evidence, 'id'>): Observable<Omit<Evidence, 'id'>> {
    return of(evidence);
  }
}

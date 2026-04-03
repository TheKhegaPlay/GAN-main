// Optional Signal-based state management for simpler use cases

import { isPlatformBrowser } from '@angular/common';
import { Injectable, signal, computed, effect, inject, PLATFORM_ID } from '@angular/core';
import { ForensicStateService } from './forensic-state.service';

export interface ForensicSignalState {
  selectedCaseId: string | null;
  selectedEvidenceId: string | null;
  processingMode: 'batch' | 'realtime' | 'manual';
  autoRetryEnabled: boolean;
}

@Injectable({ providedIn: 'root' })
export class ForensicSignalsService {
  private readonly platformId = inject(PLATFORM_ID);

  // REQUIREMENT: Use Signals for synchronous, reactive state
  private uiState = signal<ForensicSignalState>({
    selectedCaseId: null,
    selectedEvidenceId: null,
    processingMode: 'realtime',
    autoRetryEnabled: true
  });

  // REQUIREMENT: Derive computed values efficiently without manual subscriptions
  selectedCase = computed(() => {
    const caseId = this.uiState().selectedCaseId;
    if (!caseId) return null;
    // Get the current state from the ForensicStateService BehaviorSubject
    const state = (this.stateService['state$'] as any)?.getValue?.();
    if (!state) return null;
    return state.cases.find((c: any) => c.id === caseId) || null;
  });

  selectedEvidence = computed(() => {
    const evidenceId = this.uiState().selectedEvidenceId;
    const selectedCase = this.selectedCase();
    if (!selectedCase || !evidenceId) return null;
    return selectedCase.evidences.find((e: any) => e.id === evidenceId) || null;
  });

  // REQUIREMENT: Use effect to synchronize side effects when signals change
  constructor(private stateService: ForensicStateService) {
    effect(() => {
      const state = this.uiState();
      console.log('UI State changed:', state);
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('forensic_ui_state', JSON.stringify(state));
      }
    });
  }

  selectCase(caseId: string): void {
    this.uiState.update(state => ({
      ...state,
      selectedCaseId: caseId,
      selectedEvidenceId: null // Clear evidence selection when case changes
    }));
  }

  selectEvidence(evidenceId: string): void {
    this.uiState.update(state => ({
      ...state,
      selectedEvidenceId: evidenceId
    }));
  }

  setProcessingMode(mode: 'batch' | 'realtime' | 'manual'): void {
    this.uiState.update(state => ({
      ...state,
      processingMode: mode
    }));
  }

  setAutoRetry(enabled: boolean): void {
    this.uiState.update(state => ({
      ...state,
      autoRetryEnabled: enabled
    }));
  }

  // Export signals for component consumption
  getUIState() {
    return this.uiState.asReadonly();
  }

  getSelectedCase() {
    return this.selectedCase.asReadonly();
  }

  getSelectedEvidence() {
    return this.selectedEvidence.asReadonly();
  }
}

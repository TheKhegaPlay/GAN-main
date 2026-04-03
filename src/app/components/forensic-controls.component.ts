import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ForensicSignalsService } from '../services/forensic-signals.service';
import { ForensicStateService } from '../services/forensic-state.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-forensic-controls',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="controls-panel">
      <label>Select Case:</label>
      <select [value]="signalService.getUIState()().selectedCaseId || ''"
              (change)="onCaseChange($event)">
        <option value="">-- Select a case --</option>
        <option *ngFor="let c of getCases()" [value]="c.id">
          {{ c.name }}
        </option>
      </select>

      <div *ngIf="signalService.getSelectedCase()() as selectedCase">
        <h4>Case: {{ selectedCase.name }}</h4>
        <p>Selected Evidence: {{ signalService.getSelectedEvidence()()?.filename || 'None' }}</p>
      </div>

      <div class="processing-mode">
        <label>Processing Mode:</label>
        <select [value]="signalService.getUIState()().processingMode"
                (change)="onModeChange($event)">
          <option value="realtime">Real-time</option>
          <option value="batch">Batch</option>
          <option value="manual">Manual</option>
        </select>
      </div>

      <label class="checkbox">
        <input type="checkbox"
               [checked]="signalService.getUIState()().autoRetryEnabled"
               (change)="onRetryChange($event)" />
        Auto-retry on failure
      </label>
    </div>
  `,
  styles: [`
    .controls-panel { padding: 16px; background: #f9f9f9; border-radius: 8px; border: 1px solid #e0e0e0; max-width: 400px; }
    label { display: block; margin-top: 12px; font-weight: 600; color: #333; }
    select { width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #ddd; border-radius: 4px; }
    .checkbox { display: flex; align-items: center; gap: 8px; margin-top: 12px; font-weight: normal; }
    .checkbox input { width: 18px; height: 18px; }
    h4 { margin: 12px 0 4px 0; color: #1976d2; }
    p { margin: 4px 0; color: #666; font-size: 13px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ForensicControlsComponent {
  constructor(
    public signalService: ForensicSignalsService,
    private stateService: ForensicStateService
  ) {}

  getCases() {
    let cases: any[] = [];
    this.stateService.getState$().pipe(
      map(state => cases = state.cases)
    ).subscribe();
    return cases;
  }

  onCaseChange(event: Event): void {
    const caseId = (event.target as HTMLSelectElement).value;
    if (caseId) {
      this.signalService.selectCase(caseId);
    }
  }

  onModeChange(event: Event): void {
    const mode = (event.target as HTMLSelectElement).value as 'batch' | 'realtime' | 'manual';
    this.signalService.setProcessingMode(mode);
  }

  onRetryChange(event: Event): void {
    const enabled = (event.target as HTMLInputElement).checked;
    this.signalService.setAutoRetry(enabled);
  }
}

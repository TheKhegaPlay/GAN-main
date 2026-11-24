import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, inject, Output } from '@angular/core';
import { BackendApiService, RestorationResponse, StoredFileResponse } from '../services/backend-api.service';

@Component({
  selector: 'app-log-restoration',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="logs-panel">
      <h2>Log file restoration</h2>
      <p>Upload a UTF-8 .log, .txt, .csv, or .json file for processing by the independent logs model.</p>
      <input
        type="file"
        accept=".log,.txt,.csv,.json,text/plain,application/json"
        (change)="selectFile($event)" />
      <p *ngIf="selectedFile">Selected: {{ selectedFile.name }} ({{ selectedFile.size | number }} bytes)</p>
      <label class="reference-upload">
        Optional clean reference CSV for evaluation only (same rows and order, without masks)
        <input type="file" accept=".csv,text/csv" (change)="selectReference($event)" />
      </label>
      <p *ngIf="referenceFile">Evaluation reference: {{ referenceFile.name }}</p>
      <p *ngIf="uploading">Uploading and calculating SHA-256...</p>
      <p *ngIf="uploadedRecord">SHA-256: <code>{{ uploadedRecord.sha256 }}</code></p>
      <button type="button" (click)="restore()" [disabled]="!uploadedRecord || processing || uploading">
        {{ processing ? 'Processing...' : 'Restore logs' }}
      </button>
      <p *ngIf="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
      <p *ngIf="sessionId">Session ID: <code>{{ sessionId }}</code></p>
      <div *ngIf="result as completed">
        <p>Session status: {{ completed.status }}</p>
        <p *ngIf="completed.confidence_score !== null && completed.confidence_score !== undefined">
          Model confidence: {{ completed.confidence_score | number:'1.1-2' }}%
          ({{ completed.confidence_metric || 'model-provided score' }})
        </p>
        <p *ngIf="completed.confidence_method">{{ completed.confidence_method }}</p>
        <p *ngIf="completed.confidence_score === null || completed.confidence_score === undefined">
          The model did not provide a confidence score.
        </p>
        <section *ngIf="completed.metrics as metrics" class="metrics-summary">
          <h3>Restoration metrics</h3>
          <p>Rows restored: {{ formatMetric(metrics['records_restored']) }} / {{ formatMetric(metrics['records_processed']) }}</p>
          <p>Masked fields restored: {{ formatMetric(metrics['fields_restored']) }} / {{ formatMetric(metrics['masked_fields']) }}</p>
          <ng-container *ngIf="metrics['quality_reference_available'] === true; else referenceNeeded">
            <p>Categorical exact-match accuracy: {{ formatMetric(metrics['categorical_accuracy_percent']) }}%</p>
            <p>Numeric MAE / RMSE by field: {{ metrics['numeric_metrics_by_field'] | json }}</p>
          </ng-container>
          <ng-template #referenceNeeded>
            <p>Accuracy, MAE, and RMSE require a clean reference CSV with the same rows in the same order.</p>
          </ng-template>
          <p *ngIf="metrics['quality_metric_note']" class="metric-note">
            {{ metrics['quality_metric_note'] }}
          </p>
        </section>
        <details *ngIf="completed.original_text">
          <summary>Original log content</summary>
          <pre>{{ completed.original_text }}</pre>
        </details>
        <details *ngIf="completed.original_data">
          <summary>Original records (JSON)</summary>
          <pre>{{ completed.original_data | json }}</pre>
        </details>
        <details *ngIf="completed.restored_data">
          <summary>Restored records (JSON)</summary>
          <pre>{{ completed.restored_data | json }}</pre>
        </details>
        <details *ngIf="completed.restored_text">
          <summary>Restored log content</summary>
          <pre>{{ completed.restored_text }}</pre>
        </details>
      </div>
    </section>
  `,
  styles: [`
    .logs-panel { margin: 20px 0; padding: 20px; border: 1px solid #d5dbe5; border-radius: 8px; background: #fff; }
    input, button { margin: 8px 8px 8px 0; }
    button { padding: 8px 14px; cursor: pointer; }
    button:disabled { cursor: not-allowed; opacity: .6; }
    .error { color: #b42318; }
    .reference-upload { display: block; margin-top: 12px; font-weight: 600; }
    .metrics-summary { margin: 16px 0; padding: 12px; background: #f5f7fa; border-radius: 6px; }
    .metric-note { color: #555; font-size: 13px; }
    code { overflow-wrap: anywhere; }
    pre { max-height: 360px; overflow: auto; white-space: pre-wrap; }
  `]
})
export class LogRestorationComponent {
  private readonly api = inject(BackendApiService);

  @Output() readonly restorationCompleted = new EventEmitter<string>();

  selectedFile: File | null = null;
  referenceFile: File | null = null;
  uploadedRecord: StoredFileResponse | null = null;
  uploading = false;
  processing = false;
  errorMessage = '';
  sessionId = '';
  result: RestorationResponse | null = null;

  selectFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
    this.referenceFile = null;
    this.uploadedRecord = null;
    this.uploading = this.selectedFile !== null;
    this.errorMessage = '';
    this.sessionId = '';
    this.result = null;
    const file = this.selectedFile;
    if (file) {
      this.api.uploadLogs(file).subscribe({
        next: storedFile => {
          if (this.selectedFile !== file) return;
          this.uploadedRecord = storedFile;
          this.uploading = false;
        },
        error: (error: HttpErrorResponse) => {
          if (this.selectedFile !== file) return;
          this.uploading = false;
          this.errorMessage = this.errorMessageFrom(error);
        }
      });
    }
  }

  selectReference(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.referenceFile = input.files?.[0] ?? null;
  }

  restore(): void {
    if (!this.uploadedRecord || this.processing || this.uploading) return;

    this.processing = true;
    this.errorMessage = '';
    this.api.restoreLogs(this.uploadedRecord.file_id, this.referenceFile).subscribe({
      next: result => {
        this.result = result;
        this.sessionId = result.session_id;
        this.processing = false;
        if (result.status === 'completed') {
          this.restorationCompleted.emit(result.session_id);
        }
      },
      error: (error: HttpErrorResponse) => {
        const detail = error.error?.detail;
        if (typeof detail === 'object' && detail !== null) {
          this.sessionId = typeof detail.session_id === 'string' ? detail.session_id : '';
          this.errorMessage = typeof detail.message === 'string' ? detail.message : 'Log restoration failed.';
        } else {
          this.errorMessage = this.errorMessageFrom(error);
        }
        this.processing = false;
      }
    });
  }

  private errorMessageFrom(error: HttpErrorResponse): string {
    const detail = error.error?.detail;
    return typeof detail === 'string' ? detail : error.message || 'Log restoration failed.';
  }

  formatMetric(value: unknown): string {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Number.isInteger(value) ? String(value) : value.toFixed(3);
    }
    if (typeof value === 'string') return value;
    return 'N/A';
  }
}

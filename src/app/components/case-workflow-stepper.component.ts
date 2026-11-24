import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StepComponent } from './Stepper/step.component';
import { StepperComponent } from './Stepper/stepper.component';
import { GanRestorationComponent } from './gan-restoration.component';
import { LogRestorationComponent } from './log-restoration.component';
import { BackendApiService } from '../services/backend-api.service';

type RestorationKind = 'image' | 'logs';

@Component({
  selector: 'app-case-workflow-stepper',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StepperComponent,
    StepComponent,
    GanRestorationComponent,
    LogRestorationComponent
  ],
  template: `
    <section class="workflow-panel">
      <header class="workflow-heading">
        <h2>Case investigation and restoration</h2>
        <p>Enter case details, restore evidence with the matching model, then generate its PDF report.</p>
      </header>

      <app-stepper [orientation]="'horizontal'">
        <app-step stepId="case-details" label="Case investigation">
          <form class="case-form" #caseForm="ngForm">
            <h3>Case Investigation Form</h3>
            <div class="field-grid">
              <label>
                Case identifier
                <input
                  name="caseIdentifier"
                  [(ngModel)]="caseIdentifier"
                  required
                  placeholder="e.g. CASE-2026-001" />
              </label>
              <label>
                Investigator
                <input
                  name="investigator"
                  [(ngModel)]="investigator"
                  required
                  placeholder="Full name" />
              </label>
              <label class="wide-field">
                Investigation summary
                <textarea
                  name="summary"
                  [(ngModel)]="summary"
                  rows="4"
                  placeholder="Briefly describe this investigation"></textarea>
              </label>
            </div>
            <p class="form-hint">The report identifies the authenticated employee and restoration session.</p>
          </form>
        </app-step>

        <app-step stepId="restore-evidence" label="Restore evidence">
          <div class="evidence-step">
            <p class="model-hint">
              These independent forms can upload and run at the same time. The image model requires a damage mask;
              the logs model accepts NetFlow CSV with the expected columns and masked fields.
            </p>
            <div class="inference-grid">
              <app-gan-restoration
                (restorationCompleted)="onRestorationCompleted('image', $event)">
              </app-gan-restoration>
              <app-log-restoration
                (restorationCompleted)="onRestorationCompleted('logs', $event)">
              </app-log-restoration>
            </div>
          </div>
        </app-step>

        <app-step stepId="pdf-report" label="PDF report">
          <div class="report-step">
            <h3>Generate investigation report</h3>
            <p *ngIf="!completedSessions.image && !completedSessions.logs" class="report-hint">
              Complete either or both independent restorations to enable the corresponding PDF reports.
            </p>
            <div class="report-grid">
              <article *ngIf="completedSessions.image" class="session-summary">
                <h4>Image restoration</h4>
                <p><strong>Case:</strong> {{ caseIdentifier || 'Not specified' }}</p>
                <p><strong>Investigator:</strong> {{ investigator || 'Authenticated user' }}</p>
                <p><strong>Session:</strong> <code>{{ completedSessions.image }}</code></p>
                <button
                  type="button"
                  class="report-button"
                  [disabled]="generatingReport !== null"
                  (click)="generateReport('image')">
                  {{ generatingReport === 'image' ? 'Generating PDF...' : 'Generate image PDF' }}
                </button>
                <p *ngIf="reportDownloaded.image" class="success-message" role="status">PDF report downloaded.</p>
                <p *ngIf="reportErrors.image" class="error-message" role="alert">{{ reportErrors.image }}</p>
              </article>
              <article *ngIf="completedSessions.logs" class="session-summary">
                <h4>NetFlow logs restoration</h4>
                <p><strong>Case:</strong> {{ caseIdentifier || 'Not specified' }}</p>
                <p><strong>Investigator:</strong> {{ investigator || 'Authenticated user' }}</p>
                <p><strong>Session:</strong> <code>{{ completedSessions.logs }}</code></p>
                <button
                  type="button"
                  class="report-button"
                  [disabled]="generatingReport !== null"
                  (click)="generateReport('logs')">
                  {{ generatingReport === 'logs' ? 'Generating PDF...' : 'Generate logs PDF' }}
                </button>
                <p *ngIf="reportDownloaded.logs" class="success-message" role="status">PDF report downloaded.</p>
                <p *ngIf="reportErrors.logs" class="error-message" role="alert">{{ reportErrors.logs }}</p>
              </article>
            </div>
          </div>
        </app-step>
      </app-stepper>
    </section>
  `,
  styles: [`
    .workflow-panel {
      margin: 20px 0;
      padding: 24px;
      border: 1px solid #d8e0ea;
      border-radius: 12px;
      background: #fff;
      box-shadow: 0 4px 16px rgba(22, 38, 61, .06);
    }

    .workflow-heading { margin-bottom: 18px; }
    .workflow-heading h2 { margin: 0 0 6px; color: #174a83; }
    .workflow-heading p, .form-hint, .model-hint, .report-hint { color: #596579; }
    .case-form, .report-step { max-width: 900px; margin: 0 auto; }
    .case-form h3, .report-step h3 { margin-top: 0; color: #24364b; }
    .field-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    label { display: flex; flex-direction: column; gap: 7px; color: #344054; font-weight: 600; }
    input, textarea, select {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 7px;
      font: inherit;
      font-weight: 400;
    }
    textarea { resize: vertical; }
    .wide-field { grid-column: 1 / -1; }
    .form-hint { margin-bottom: 0; font-size: 13px; }
    .model-hint { margin: 8px 0 16px; font-size: 13px; }
    .inference-grid, .report-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      align-items: start;
    }
    .session-summary {
      padding: 14px;
      border-radius: 8px;
      background: #f3f7fc;
      overflow-wrap: anywhere;
    }
    .session-summary h4 { margin: 0 0 12px; color: #174a83; }
    .session-summary p { margin: 6px 0; }
    .report-button {
      padding: 11px 18px;
      border: 0;
      border-radius: 7px;
      background: #1769aa;
      color: #fff;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    .report-button:disabled { cursor: not-allowed; opacity: .5; }
    .success-message { color: #167447; }
    .error-message { color: #b42318; }

    @media (max-width: 640px) {
      .workflow-panel { padding: 14px; }
      .field-grid { grid-template-columns: 1fr; }
      .inference-grid, .report-grid { grid-template-columns: 1fr; }
      .wide-field { grid-column: auto; }
    }
  `]
})
export class CaseWorkflowStepperComponent {
  private readonly api = inject(BackendApiService);

  caseIdentifier = '';
  investigator = '';
  summary = '';
  completedSessions: Record<RestorationKind, string | null> = {
    image: null,
    logs: null
  };
  generatingReport: RestorationKind | null = null;
  reportDownloaded: Partial<Record<RestorationKind, boolean>> = {};
  reportErrors: Partial<Record<RestorationKind, string>> = {};

  onRestorationCompleted(kind: RestorationKind, sessionId: string): void {
    this.completedSessions = { ...this.completedSessions, [kind]: sessionId };
    this.reportDownloaded = { ...this.reportDownloaded, [kind]: false };
    this.reportErrors = { ...this.reportErrors, [kind]: '' };
  }

  generateReport(kind: RestorationKind): void {
    const sessionId = this.completedSessions[kind];
    if (!sessionId || this.generatingReport) return;

    this.generatingReport = kind;
    this.reportErrors = { ...this.reportErrors, [kind]: '' };
    this.api.generateReport(sessionId).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `restoration-${kind}-${sessionId}.pdf`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.reportDownloaded = { ...this.reportDownloaded, [kind]: true };
        this.generatingReport = null;
      },
      error: (error: HttpErrorResponse) => {
        this.reportErrors = { ...this.reportErrors, [kind]: this.getErrorMessage(error) };
        this.generatingReport = null;
      }
    });
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    const detail = error.error?.detail;
    if (typeof detail === 'string') return detail;
    if (detail && typeof detail.message === 'string') return detail.message;
    return error.message || 'PDF report generation failed.';
  }
}

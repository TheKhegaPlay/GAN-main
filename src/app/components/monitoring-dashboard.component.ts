import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { ForensicStateService, DashboardViewModel, GANPipelineStatus } from '../services/forensic-state.service';
import { Evidence } from '../models/forensic.models';

@Component({
  selector: 'app-monitoring-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <h2>Forensic Processing Dashboard</h2>

      <div class="metrics-panel">
        <div *ngIf="dashboardData$ | async as dashboard" class="metrics-grid">
          <div class="metric-card">
            <h3>Total Processed</h3>
            <span class="metric-value">{{ dashboard.metrics.totalProcessed }}</span>
          </div>
          <div class="metric-card">
            <h3>Active Processes</h3>
            <span class="metric-value">{{ dashboard.metrics.activeProcesses }}</span>
          </div>
          <div class="metric-card">
            <h3>Success Rate</h3>
            <span class="metric-value">{{ (dashboard.metrics.successRate * 100) | number:'1.1-1' }}%</span>
          </div>
          <div class="metric-card">
            <h3>Avg Processing Time</h3>
            <span class="metric-value">{{ dashboard.metrics.avgProcessingTime | number:'1.0-0' }}ms</span>
          </div>
        </div>
      </div>

      <div class="pipeline-status">
        <h3>GAN Model Status</h3>
        <ng-container *ngIf="ganPipelineStatus$ | async as pipelineStatus">
          <div class="model-status-grid">
            <div *ngFor="let model of ['ESRGAN', 'GFPGAN', 'SRGAN']" class="model-card">
              <h4>{{ model }}</h4>
              <div class="status-indicator"
                   [class.active]="pipelineStatus.modelStatus[model]?.active"
                   [class.error]="pipelineStatus.modelStatus[model]?.error">
              </div>
              <span>{{ pipelineStatus.modelStatus[model]?.status }}</span>
            </div>
          </div>
        </ng-container>
      </div>

      <div class="processing-queue">
        <h3>Active Restorations</h3>
        <ng-container *ngIf="processingEvidences$ | async as evidences">
          <div class="queue-info">{{ evidences.length }} active</div>
          <div class="queue-items">
            <div *ngFor="let evidence of evidences; trackBy: trackByEvidenceId"
                 class="queue-item">
              <span class="filename">{{ evidence.filename }}</span>
              <span class="model">{{ evidence.ganModel }}</span>
              <div class="progress-bar">
                <div class="progress-fill" [style.width.%]="getProgress(evidence.id)"></div>
              </div>
            </div>
            <div *ngIf="evidences.length === 0" class="empty-state">
              No active restorations
            </div>
          </div>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container { padding: 20px; background: #f5f5f5; border-radius: 8px; }
    h2, h3 { color: #333; margin: 0 0 16px 0; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .metric-card { background: #fff; padding: 16px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .metric-value { font-size: 24px; font-weight: bold; color: #1976d2; display: block; margin-top: 8px; }
    .model-status-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .model-card { background: #fff; padding: 12px; border-radius: 6px; text-align: center; }
    .status-indicator { width: 12px; height: 12px; border-radius: 50%; background: #999; margin: 4px auto; }
    .status-indicator.active { background: #4caf50; }
    .status-indicator.error { background: #f44336; }
    .queue-info { color: #666; font-size: 13px; margin-bottom: 8px; }
    .queue-items { display: flex; flex-direction: column; gap: 8px; }
    .queue-item { background: #fff; padding: 8px; border-radius: 4px; display: flex; gap: 12px; align-items: center; }
    .filename { font-weight: 600; flex: 1; }
    .model { font-size: 12px; color: #666; }
    .progress-bar { flex: 0 0 200px; height: 4px; background: #e0e0e0; border-radius: 2px; overflow: hidden; }
    .progress-fill { background: linear-gradient(90deg, #4caf50, #81c784); height: 100%; transition: width 0.3s ease; }
    .empty-state { color: #999; padding: 16px; text-align: center; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MonitoringDashboardComponent implements OnInit {
  dashboardData$!: Observable<DashboardViewModel>;
  ganPipelineStatus$!: Observable<GANPipelineStatus>;
  processingEvidences$!: Observable<Evidence[]>;

  private progressMap = new Map<string, number>();

  constructor(private stateService: ForensicStateService) {}

  ngOnInit(): void {
    this.dashboardData$ = this.stateService.getDashboardData$();
    this.ganPipelineStatus$ = this.stateService.getGANPipelineStatus$();
    this.processingEvidences$ = this.stateService.getEvidenceByStatus$('processing');

    this.setupProgressSimulation();
  }

  private setupProgressSimulation(): void {
    setInterval(() => {
      this.processingEvidences$.pipe(
        take(1)
      ).subscribe(evidences => {
        evidences.forEach(ev => {
          const current = this.progressMap.get(ev.id) || 0;
          if (current < 100) {
            this.progressMap.set(ev.id, current + Math.random() * 10);
          }
        });
      });
    }, 1000);
  }

  trackByEvidenceId(_index: number, evidence: Evidence): string {
    return evidence.id;
  }

  getProgress(evidenceId: string): number {
    return Math.min(this.progressMap.get(evidenceId) || 0, 100);
  }
}

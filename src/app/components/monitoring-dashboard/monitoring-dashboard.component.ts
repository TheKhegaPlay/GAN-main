import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { ForensicStateService, DashboardViewModel, GANPipelineStatus } from '../../services/forensic-state.service';
import { Evidence } from '../../models/forensic.models';

@Component({
  selector: 'app-monitoring-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <h2>📊 Real-time GAN Processing Dashboard</h2>
      <p class="dashboard-subtitle">Monitor evidence restoration pipeline with advanced RxJS streams</p>

      <!-- Metrics Panel -->
      <div class="metrics-panel">
        <div *ngIf="dashboardData$ | async as dashboard" class="metrics-grid">
          <div class="metric-card">
            <div class="metric-icon">✅</div>
            <h3>Total Processed</h3>
            <span class="metric-value">{{ dashboard.metrics.totalProcessed }}</span>
            <p class="metric-description">Evidence items completed</p>
          </div>
          <div class="metric-card">
            <div class="metric-icon">⚙️</div>
            <h3>Active Processes</h3>
            <span class="metric-value">{{ dashboard.metrics.activeProcesses }}</span>
            <p class="metric-description">Currently processing</p>
          </div>
          <div class="metric-card">
            <div class="metric-icon">📈</div>
            <h3>Success Rate</h3>
            <span class="metric-value">{{ (dashboard.metrics.successRate * 100) | number:'1.1-1' }}%</span>
            <p class="metric-description">Restoration success</p>
          </div>
          <div class="metric-card">
            <div class="metric-icon">⏱️</div>
            <h3>Avg Processing Time</h3>
            <span class="metric-value">{{ dashboard.metrics.avgProcessingTime | number:'1.0-0' }}ms</span>
            <p class="metric-description">Average per item</p>
          </div>
        </div>
      </div>

      <!-- GAN Models Status -->
      <div class="models-section">
        <h3>GAN Model Status (Real-time Monitoring)</h3>
        <ng-container *ngIf="ganPipelineStatus$ | async as pipelineStatus">
          <div class="model-status-grid">
            <div *ngFor="let model of ['ESRGAN', 'GFPGAN', 'SRGAN']" class="model-card">
              <div class="model-header">
                <h4>{{ model }}</h4>
                <span class="status-badge"
                      [class.active]="pipelineStatus.modelStatus[model]?.active"
                      [class.error]="pipelineStatus.modelStatus[model]?.error">
                  {{ pipelineStatus.modelStatus[model]?.status }}
                </span>
              </div>
              <div class="status-indicator"
                   [class.active]="pipelineStatus.modelStatus[model]?.active"
                   [class.error]="pipelineStatus.modelStatus[model]?.error">
              </div>
              <div class="model-details">
                <p *ngIf="model === 'ESRGAN'">Super-Resolution up to 4x</p>
                <p *ngIf="model === 'GFPGAN'">Face Restoration v1.3</p>
                <p *ngIf="model === 'SRGAN'">General Super-Resolution</p>
              </div>
            </div>
          </div>
          <div class="pipeline-stats">
            <div class="stat-item">
              <span class="stat-label">Processing Queue:</span>
              <span class="stat-value">{{ pipelineStatus.processingQueue.length }} items</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">ETA:</span>
              <span class="stat-value">{{ pipelineStatus.estimatedTimeRemaining | number:'1.0-0' }}ms</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">GPU Usage:</span>
              <span class="stat-value">{{ pipelineStatus.resourceUtilization.gpu }}%</span>
            </div>
          </div>
        </ng-container>
      </div>

      <!-- Active Restorations Queue -->
      <div class="processing-queue-section">
        <h3>Active Restorations (Evidence Processing Queue)</h3>
        <ng-container *ngIf="processingEvidences$ | async as evidences">
          <div class="queue-header">
            <span class="queue-count">{{ evidences.length }} active</span>
            <span class="update-indicator">● Real-time updates</span>
          </div>
          <div class="queue-items">
            <div *ngFor="let evidence of evidences; trackBy: trackByEvidenceId"
                 class="queue-item">
              <div class="item-info">
                <span class="filename">{{ evidence.filename }}</span>
                <span class="model-tag">{{ evidence.ganModel }}</span>
              </div>
              <div class="progress-container">
                <div class="progress-bar">
                  <div class="progress-fill" [style.width.%]="getProgress(evidence.id)"></div>
                </div>
                <span class="progress-text">{{ getProgress(evidence.id) | number:'1.0-0' }}%</span>
              </div>
            </div>
            <div *ngIf="evidences.length === 0" class="empty-state">
              <p>✨ No active restorations at the moment</p>
            </div>
          </div>
        </ng-container>
      </div>

      <!-- RxJS Stream Info -->
      <div class="rxjs-info">
        <h4>Advanced RxJS Implementation</h4>
        <ul>
          <li><strong>withLatestFrom:</strong> Combines metrics with system health & model performance</li>
          <li><strong>combineLatest:</strong> Synchronizes multi-source GAN pipeline updates</li>
          <li><strong>throttleTime:</strong> Limits dashboard updates to 500ms for optimal performance</li>
          <li><strong>distinctUntilChanged:</strong> Prevents redundant emissions when data hasn't changed</li>
          <li><strong>shareReplay(1):</strong> Shares computed observables across multiple subscribers</li>
          <li><strong>OnPush Strategy:</strong> Minimizes change detection cycles</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 30px;
      background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
      border-radius: 12px;
      margin-top: 20px;
    }

    h2 {
      color: #1f2937;
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 700;
    }

    .dashboard-subtitle {
      color: #666;
      margin: 0 0 24px 0;
      font-size: 14px;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }

    .metric-card {
      background: #fff;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      text-align: center;
      transition: all 0.3s ease;
    }

    .metric-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    }

    .metric-icon {
      font-size: 32px;
      margin-bottom: 8px;
    }

    .metric-card h3 {
      margin: 0 0 8px 0;
      color: #374151;
      font-size: 14px;
      font-weight: 600;
    }

    .metric-value {
      font-size: 28px;
      font-weight: bold;
      color: #1976d2;
      display: block;
      margin: 8px 0;
    }

    .metric-description {
      color: #999;
      font-size: 12px;
      margin: 0;
    }

    .models-section {
      margin-bottom: 32px;
    }

    .models-section h3 {
      color: #1f2937;
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
    }

    .model-status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }

    .model-card {
      background: #fff;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .model-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .model-header h4 {
      margin: 0;
      color: #1f2937;
      font-size: 16px;
      font-weight: 600;
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      background: #f3f4f6;
      color: #666;
    }

    .status-badge.active {
      background: #dcfce7;
      color: #166534;
    }

    .status-badge.error {
      background: #fee2e2;
      color: #991b1b;
    }

    .status-indicator {
      width: 100%;
      height: 8px;
      border-radius: 4px;
      background: #e5e7eb;
      margin-bottom: 12px;
    }

    .status-indicator.active {
      background: linear-gradient(90deg, #4caf50, #81c784);
      box-shadow: 0 0 8px rgba(76, 175, 80, 0.4);
    }

    .status-indicator.error {
      background: linear-gradient(90deg, #f44336, #ef5350);
      box-shadow: 0 0 8px rgba(244, 67, 54, 0.4);
    }

    .model-details p {
      margin: 0;
      color: #666;
      font-size: 12px;
    }

    .pipeline-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
      padding: 16px;
      background: #f9fafb;
      border-radius: 8px;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .stat-label {
      color: #666;
      font-size: 12px;
      font-weight: 500;
    }

    .stat-value {
      color: #1976d2;
      font-size: 18px;
      font-weight: 700;
    }

    .processing-queue-section {
      margin-top: 32px;
    }

    .processing-queue-section h3 {
      color: #1f2937;
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
    }

    .queue-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: #f3f4f6;
      border-radius: 8px;
      margin-bottom: 12px;
    }

    .queue-count {
      font-weight: 600;
      color: #1f2937;
    }

    .update-indicator {
      color: #16a34a;
      font-size: 12px;
      font-weight: 600;
    }

    .queue-items {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 400px;
      overflow-y: auto;
    }

    .queue-item {
      background: #fff;
      padding: 12px;
      border-radius: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    }

    .item-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .filename {
      font-weight: 600;
      color: #1f2937;
      font-size: 14px;
    }

    .model-tag {
      font-size: 11px;
      color: #fff;
      background: #1976d2;
      padding: 2px 8px;
      border-radius: 4px;
      display: inline-block;
      width: fit-content;
    }

    .progress-container {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      margin-left: 16px;
    }

    .progress-bar {
      flex: 1;
      height: 6px;
      background: #e5e7eb;
      border-radius: 3px;
      overflow: hidden;
      min-width: 200px;
    }

    .progress-fill {
      background: linear-gradient(90deg, #4caf50, #81c784);
      height: 100%;
      transition: width 0.3s ease;
    }

    .progress-text {
      font-size: 12px;
      font-weight: 600;
      color: #1f2937;
      min-width: 40px;
      text-align: right;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #999;
    }

    .empty-state p {
      margin: 0;
      font-size: 14px;
    }

    .rxjs-info {
      margin-top: 32px;
      padding: 16px;
      background: #f0f9ff;
      border-left: 4px solid #0284c7;
      border-radius: 6px;
    }

    .rxjs-info h4 {
      margin: 0 0 12px 0;
      color: #0c4a6e;
      font-size: 14px;
    }

    .rxjs-info ul {
      margin: 0;
      padding-left: 20px;
      color: #0c4a6e;
      font-size: 12px;
    }

    .rxjs-info li {
      margin-bottom: 8px;
    }

    @media (max-width: 768px) {
      .dashboard-container {
        padding: 16px;
      }

      .metrics-grid {
        grid-template-columns: 1fr;
      }

      .model-status-grid {
        grid-template-columns: 1fr;
      }

      .queue-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .progress-container {
        flex-direction: column;
        align-items: flex-start;
        margin-left: 0;
      }
    }
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
    // REQUIREMENT: Initialize all observables without manual subscriptions
    this.dashboardData$ = this.stateService.getDashboardData$();
    this.ganPipelineStatus$ = this.stateService.getGANPipelineStatus$();
    this.processingEvidences$ = this.stateService.getEvidenceByStatus$('processing');

    this.setupProgressSimulation();
  }

  private setupProgressSimulation(): void {
    setInterval(() => {
      this.processingEvidences$.pipe(take(1)).subscribe(evidences => {
        evidences.forEach(ev => {
          const current = this.progressMap.get(ev.id) || 0;
          if (current < 100) {
            this.progressMap.set(ev.id, current + Math.random() * 15);
          }
        });
      });
    }, 800);
  }

  trackByEvidenceId(_index: number, evidence: Evidence): string {
    return evidence.id;
  }

  getProgress(evidenceId: string): number {
    return Math.min(this.progressMap.get(evidenceId) || 0, 100);
  }
}

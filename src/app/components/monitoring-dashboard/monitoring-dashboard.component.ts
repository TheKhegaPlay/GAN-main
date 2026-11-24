import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Observable, of, timer } from 'rxjs';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';
import { BackendApiService, ModelsStatusResponse } from '../../services/backend-api.service';

interface ModelHealthView {
  status: ModelsStatusResponse | null;
  checkedAt: Date;
  error: string | null;
}

@Component({
  selector: 'app-monitoring-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="monitoring-panel">
      <header class="monitoring-heading">
        <div>
          <h2>Model monitoring</h2>
          <p>Live readiness reported by the FastAPI model registry.</p>
        </div>
        <span *ngIf="health$ | async as health" class="checked-at">
          Checked {{ health.checkedAt | date:'shortTime' }} · refreshes every 30 seconds
        </span>
      </header>

      <ng-container *ngIf="health$ | async as health">
        <p *ngIf="health.error" class="error-message" role="alert">{{ health.error }}</p>
        <div class="model-grid">
          <article class="model-card">
            <div class="model-title">
              <h3>Image restoration</h3>
              <span class="status-badge"
                [class.ready]="health.status?.image?.inference_ready"
                [class.unavailable]="health.status && !health.status.image.inference_ready">
                {{ health.status?.image?.inference_ready ? 'Ready' : health.status ? 'Unavailable' : 'Checking' }}
              </span>
            </div>
            <p class="checkpoint">hfi_gan_final.pt</p>
            <p>HFI-GAN · mask-conditioned image inpainting</p>
            <p class="detail">{{ health.status?.image?.detail || 'Waiting for model status…' }}</p>
            <div class="readiness-row">
              <span>Checkpoint loaded</span>
              <strong>{{ health.status?.image?.checkpoint_loaded ? 'Yes' : 'No' }}</strong>
            </div>
          </article>

          <article class="model-card">
            <div class="model-title">
              <h3>NetFlow log restoration</h3>
              <span class="status-badge"
                [class.ready]="health.status?.logs?.inference_ready"
                [class.unavailable]="health.status && !health.status.logs.inference_ready">
                {{ health.status?.logs?.inference_ready ? 'Ready' : health.status ? 'Unavailable' : 'Checking' }}
              </span>
            </div>
            <p class="checkpoint">logs_best_checkpoint.pt</p>
            <p>RecordGenerator · masked NetFlow CSV fields</p>
            <p class="detail">{{ health.status?.logs?.detail || 'Waiting for model status…' }}</p>
            <div class="readiness-row">
              <span>Checkpoint loaded</span>
              <strong>{{ health.status?.logs?.checkpoint_loaded ? 'Yes' : 'No' }}</strong>
            </div>
          </article>
        </div>
      </ng-container>
    </section>
  `,
  styles: [`
    .monitoring-panel {
      margin: 20px 0;
      padding: 22px;
      border: 1px solid #d8e0ea;
      border-radius: 12px;
      background: #f7f9fc;
    }

    .monitoring-heading, .model-title, .readiness-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .monitoring-heading { margin-bottom: 16px; }
    .monitoring-heading h2 { margin: 0 0 5px; color: #173b65; }
    .monitoring-heading p, .checked-at { margin: 0; color: #596579; font-size: 13px; }
    .model-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    .model-card { padding: 18px; border: 1px solid #e0e6ef; border-radius: 9px; background: #fff; }
    .model-title h3 { margin: 0; color: #24364b; font-size: 17px; }
    .status-badge { padding: 4px 10px; border-radius: 999px; background: #eef2f6; color: #526174; font-size: 12px; font-weight: 700; }
    .status-badge.ready { background: #e4f6ed; color: #167447; }
    .status-badge.unavailable { background: #feeaeb; color: #b42318; }
    .checkpoint { margin: 14px 0 4px; color: #174a83; font-weight: 700; }
    .model-card > p { font-size: 13px; }
    .detail { min-height: 34px; color: #596579; overflow-wrap: anywhere; }
    .readiness-row { padding-top: 10px; border-top: 1px solid #edf0f4; color: #344054; font-size: 13px; }
    .error-message { color: #b42318; }

    @media (max-width: 700px) {
      .model-grid { grid-template-columns: 1fr; }
      .monitoring-heading { align-items: flex-start; flex-direction: column; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MonitoringDashboardComponent {
  readonly health$: Observable<ModelHealthView>;

  constructor(api: BackendApiService) {
    this.health$ = timer(0, 30000).pipe(
      switchMap(() => api.getModelsStatus().pipe(
        map(status => ({ status, checkedAt: new Date(), error: null })),
        catchError((error: HttpErrorResponse) => of({
          status: null,
          checkedAt: new Date(),
          error: error.error?.detail || error.message || 'Unable to load model status from backend.'
        }))
      )),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }
}

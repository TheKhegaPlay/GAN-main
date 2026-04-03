import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PerformanceOptimizationService, WebVitals } from '../services/performance-optimization.service';

@Component({
  selector: 'app-performance-metrics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="metrics-container">
      <h3>⚡ Web Vitals Performance Metrics</h3>

      <div class="metrics-grid">
        <div class="metric-card lcp" [class.good]="metrics.LCP && metrics.LCP < 2500" [class.needs-improvement]="metrics.LCP && metrics.LCP >= 2500">
          <div class="metric-label">LCP (Largest Contentful Paint)</div>
          <div class="metric-value">{{ metrics.LCP ? (metrics.LCP + 'ms') : 'Measuring...' }}</div>
          <div class="metric-info" *ngIf="metrics.LCP">
            <span *ngIf="metrics.LCP < 2500" class="badge good">✓ Good</span>
            <span *ngIf="metrics.LCP >= 2500" class="badge needs-improvement">⚠ Needs Improvement</span>
          </div>
        </div>

        <div class="metric-card cls" [class.good]="metrics.CLS && metrics.CLS < 0.1" [class.needs-improvement]="metrics.CLS && metrics.CLS >= 0.1">
          <div class="metric-label">CLS (Cumulative Layout Shift)</div>
          <div class="metric-value">{{ metrics.CLS ? metrics.CLS : 'Measuring...' }}</div>
          <div class="metric-info" *ngIf="metrics.CLS">
            <span *ngIf="metrics.CLS < 0.1" class="badge good">✓ Good</span>
            <span *ngIf="metrics.CLS >= 0.1" class="badge needs-improvement">⚠ Needs Improvement</span>
          </div>
        </div>

        <div class="metric-card fcp" [class.good]="metrics.FCP && metrics.FCP < 1800">
          <div class="metric-label">FCP (First Contentful Paint)</div>
          <div class="metric-value">{{ metrics.FCP ? (metrics.FCP + 'ms') : 'Measuring...' }}</div>
          <div class="metric-info" *ngIf="metrics.FCP">
            <span *ngIf="metrics.FCP < 1800" class="badge good">✓ Good</span>
            <span *ngIf="metrics.FCP >= 1800" class="badge needs-improvement">⚠ Needs Improvement</span>
          </div>
        </div>

        <div class="metric-card ttfb" [class.good]="metrics.TTFB && metrics.TTFB < 600">
          <div class="metric-label">TTFB (Time to First Byte)</div>
          <div class="metric-value">{{ metrics.TTFB ? (metrics.TTFB + 'ms') : 'N/A' }}</div>
          <div class="metric-info" *ngIf="metrics.TTFB">
            <span *ngIf="metrics.TTFB < 600" class="badge good">✓ Good</span>
            <span *ngIf="metrics.TTFB >= 600" class="badge needs-improvement">⚠ Needs Improvement</span>
          </div>
        </div>
      </div>

      <div class="optimization-tips">
        <h4>🎯 Optimization Tips</h4>
        <ul>
          <li>✓ Server-Side Rendering (SSR) enabled for faster initial page load</li>
          <li>✓ Image lazy loading activated</li>
          <li>✓ Code splitting and lazy component loading configured</li>
          <li>✓ Event coalescing enabled for better change detection</li>
          <li>✓ HTTP caching and compression configured</li>
          <li>✓ Web Vitals monitoring active</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .metrics-container {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin: 20px 0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
    }

    h3 {
      margin: 0 0 20px;
      color: #333;
      font-size: 18px;
      font-weight: 600;
    }

    h4 {
      margin: 20px 0 10px;
      color: #666;
      font-size: 14px;
      font-weight: 600;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .metric-card {
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
      transition: all 0.3s ease;
      background: #f9fafb;
    }

    .metric-card.good {
      border-color: #10b981;
      background: #f0fdf4;
    }

    .metric-card.needs-improvement {
      border-color: #f59e0b;
      background: #fffbf0;
    }

    .metric-label {
      font-size: 12px;
      color: #666;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 8px;
      letter-spacing: 0.5px;
    }

    .metric-value {
      font-size: 28px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 8px;
    }

    .metric-info {
      display: flex;
      justify-content: center;
    }

    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }

    .badge.good {
      background: #d1fae5;
      color: #065f46;
    }

    .badge.needs-improvement {
      background: #fef3c7;
      color: #92400e;
    }

    .optimization-tips {
      background: #f3f4f6;
      border-radius: 8px;
      padding: 16px;
      margin-top: 16px;
    }

    .optimization-tips ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .optimization-tips li {
      padding: 8px 0;
      color: #4b5563;
      font-size: 13px;
      line-height: 1.6;
    }
  `]
})
export class PerformanceMetricsComponent implements OnInit {
  private performanceService = inject(PerformanceOptimizationService);
  metrics: WebVitals = {
    LCP: null,
    FID: null,
    CLS: null,
    TTFB: null,
    FCP: null
  };

  ngOnInit() {
    // Initial metrics
    this.metrics = this.performanceService.getWebVitals();

    // Update metrics periodically
    setInterval(() => {
      this.metrics = this.performanceService.getWebVitals();
    }, 2000);
  }
}

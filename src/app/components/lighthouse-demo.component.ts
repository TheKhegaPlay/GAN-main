import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageOptimizationService } from '../services/image-optimization.service';
import { FontOptimizationService } from '../services/font-optimization.service';
import { HydrationMismatchService } from '../services/hydration-mismatch.service';
import { ServerApiService } from '../services/server-api.service';
import { ForensicStateService } from '../services/forensic-state.service';

@Component({
  selector: 'app-lighthouse-demo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="optimization-demo">
      <div class="header">
        <h2>🚀 Lighthouse Optimization Demo</h2>
        <p>All optimizations enabled for 90+ score</p>
      </div>

      <div class="demo-grid">
        <!-- Image Optimization Demo -->
        <div class="demo-card">
          <h3>📸 Image Optimization</h3>
          <div class="image-demo">
            <img
              loading="lazy"
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23667eea' width='400' height='300'/%3E%3Ctext fill='white' font-size='24' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EOptimized Image%3C/text%3E%3C/svg%3E"
              alt="Optimized Evidence"
              [srcset]="getResponsiveSrcset()"
            />
            <div class="metrics">
              <p>Average Load Time: {{ avgImageLoadTime.toFixed(2) }}ms</p>
              <p>Images Tracking: {{ imageMetricsCount }}</p>
            </div>
          </div>
        </div>

        <!-- Font Optimization Demo -->
        <div class="demo-card">
          <h3>🔤 Font Optimization</h3>
          <div class="font-demo">
            <div class="font-display" [class.fonts-loaded]="fontsLoaded">
              Display with optimized fonts
            </div>
            <div class="font-stack">
              {{ fontStack }}
            </div>
            <div class="status">
              Fonts Status:
              <span [class.loaded]="fontsLoaded">
                {{ fontsLoaded ? '✓ Loaded' : '⏳ Loading...' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Hydration Safety Demo -->
        <div class="demo-card">
          <h3>⚙️ Hydration Safety</h3>
          <div class="hydration-demo">
            <div [id]="stableId" class="hydration-content">
              Stable ID Content (no mismatches)
            </div>
            <div *ngIf="isClientOnly" class="platform-content">
              🌐 Client-only content (SSR safe)
            </div>
            <div class="validation">
              <p>Platform: {{ platformName }}</p>
              <p>Server: {{ isServer }}</p>
              <p>Issues: {{ hydrationWarnings.length }}</p>
            </div>
          </div>
        </div>

        <!-- API Service Demo -->
        <div class="demo-card">
          <h3>🔌 API Integration</h3>
          <div class="api-demo">
            <div class="endpoint" *ngFor="let endpoint of apiEndpoints">
              <p>{{ endpoint.name }}</p>
              <code>{{ endpoint.path }}</code>
            </div>
            <button (click)="testHealthCheck()" class="test-btn">
              Test Health Check
            </button>
            <div *ngIf="healthStatus" class="health-result">
              Status: <span [class]="healthStatus.status">
                {{ healthStatus.status }}
              </span>
              Response Time: {{ healthStatus.responseTime.toFixed(2) }}ms
            </div>
          </div>
        </div>
      </div>

      <!-- Performance Recommendations -->
      <div class="recommendations">
        <h3>📋 Lighthouse 90+ Recommendations</h3>
        <ul>
          <li *ngFor="let rec of recommendations" class="rec-item">
            {{ rec }}
          </li>
        </ul>
      </div>

      <!-- Optimization Checklist -->
      <div class="checklist">
        <h3>✅ Implementation Checklist</h3>
        <div class="checks" *ngFor="let check of optimizationChecks">
          <input type="checkbox" [checked]="check.done" disabled />
          <label>{{ check.name }}</label>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .optimization-demo {
      padding: 20px;
      background: #f9fafb;
      border-radius: 12px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .header {
      text-align: center;
      margin-bottom: 30px;
    }

    .header h2 {
      color: #333;
      font-size: 28px;
      margin: 0 0 8px;
    }

    .header p {
      color: #999;
      margin: 0;
    }

    .demo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .demo-card {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .demo-card h3 {
      margin: 0 0 15px;
      color: #333;
      font-size: 16px;
    }

    .image-demo img {
      width: 100%;
      height: auto;
      border-radius: 4px;
      margin-bottom: 10px;
      display: block;
    }

    .metrics {
      font-size: 12px;
      color: #666;
      background: #f5f5f5;
      padding: 10px;
      border-radius: 4px;
    }

    .metrics p {
      margin: 5px 0;
    }

    .font-demo {
      padding: 15px;
      background: #f5f5f5;
      border-radius: 4px;
    }

    .font-display {
      font-size: 18px;
      font-weight: 500;
      margin-bottom: 10px;
      color: #666;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .font-display.fonts-loaded {
      color: #333;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    }

    .font-stack {
      font-size: 11px;
      color: #999;
      word-break: break-all;
      margin-bottom: 10px;
    }

    .status {
      font-size: 12px;
      color: #666;
    }

    .status .loaded {
      color: #10b981;
      font-weight: 600;
    }

    .hydration-demo {
      padding: 15px;
      background: #f5f5f5;
      border-radius: 4px;
    }

    .hydration-content {
      background: white;
      padding: 10px;
      border-radius: 4px;
      margin-bottom: 10px;
    }

    .platform-content {
      background: #e0f2f1;
      padding: 10px;
      border-radius: 4px;
      margin-bottom: 10px;
      font-size: 12px;
    }

    .validation {
      font-size: 12px;
      color: #666;
    }

    .validation p {
      margin: 5px 0;
    }

    .api-demo {
      padding: 15px;
      background: #f5f5f5;
      border-radius: 4px;
    }

    .endpoint {
      background: white;
      padding: 8px;
      border-radius: 4px;
      margin-bottom: 8px;
      border-left: 3px solid #667eea;
    }

    .endpoint p {
      margin: 0 0 4px;
      font-size: 12px;
      font-weight: 600;
      color: #333;
    }

    .endpoint code {
      font-size: 11px;
      color: #999;
      background: #f0f0f0;
      padding: 2px 4px;
      border-radius: 2px;
    }

    .test-btn {
      width: 100%;
      padding: 10px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      margin: 10px 0;
      transition: all 0.3s ease;
    }

    .test-btn:hover {
      background: #764ba2;
    }

    .health-result {
      font-size: 12px;
      padding: 8px;
      background: white;
      border-radius: 4px;
      margin-top: 8px;
    }

    .health-result .healthy {
      color: #10b981;
      font-weight: 600;
    }

    .health-result .degraded {
      color: #f59e0b;
      font-weight: 600;
    }

    .health-result .unhealthy {
      color: #ef4444;
      font-weight: 600;
    }

    .recommendations {
      background: white;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .recommendations h3 {
      margin: 0 0 15px;
      color: #333;
    }

    .recommendations ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .rec-item {
      padding: 10px;
      background: #f5f5f5;
      margin-bottom: 8px;
      border-radius: 4px;
      font-size: 13px;
      color: #666;
      border-left: 3px solid #667eea;
    }

    .checklist {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .checklist h3 {
      margin: 0 0 15px;
      color: #333;
    }

    .checks {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      background: #f5f5f5;
      margin-bottom: 8px;
      border-radius: 4px;
    }

    .checks input {
      cursor: pointer;
      accent-color: #10b981;
    }

    .checks label {
      flex: 1;
      font-size: 13px;
      color: #666;
      cursor: pointer;
    }

    @media (max-width: 768px) {
      .demo-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class LighthouseDemoComponent implements OnInit {
  imageOptimization = inject(ImageOptimizationService);
  fontOptimization = inject(FontOptimizationService);
  hydration = inject(HydrationMismatchService);
  serverApi = inject(ServerApiService);

  // State
  stableId: string = '';
  avgImageLoadTime = 0;
  imageMetricsCount = 0;
  fontsLoaded = false;
  fontStack = '';
  isClientOnly = false;
  isServer = false;
  platformName = '';
  hydrationWarnings: string[] = [];
  healthStatus: any = null;

  apiEndpoints = [
    { name: 'Health Check', path: 'GET /api/health' },
    { name: 'Login', path: 'POST /api/auth/login' },
    { name: 'Forensic Cases', path: 'GET /api/forensic/cases' },
    { name: 'Web Vitals', path: 'GET /api/metrics/web-vitals' }
  ];

  recommendations = [
    '1. Ensure all images have width/height attributes to prevent CLS',
    '2. Use font-display: swap to prevent FOUT (Flash of Unstyled Text)',
    '3. Defer non-critical JavaScript to improve FCP',
    '4. Set up HTTP/2 and compression on server',
    '5. Use CDN for static assets to improve TTFB',
    '6. Implement lazy loading for below-the-fold images',
    '7. Remove unused CSS and JavaScript',
    '8. Use responsive images with srcset',
    '9. Preload critical resources',
    '10. Monitor Core Web Vitals in production'
  ];

  optimizationChecks = [
    { name: 'Server-Side Rendering (SSR)', done: true },
    { name: 'Image Optimization Service', done: true },
    { name: 'Font Optimization', done: true },
    { name: 'Hydration Safety', done: true },
    { name: 'API Interceptor with Caching', done: true },
    { name: 'Compression Enabled', done: true },
    { name: 'Security Headers', done: true },
    { name: 'Caching Headers', done: true },
    { name: 'Web Vitals Monitoring', done: true },
    { name: 'Code Splitting', done: true },
    { name: 'Critical CSS Inlined', done: true },
    { name: 'Performance Metrics Dashboard', done: true }
  ];

  ngOnInit() {
    this.initializeOptimizations();
  }

  private initializeOptimizations(): void {
    // Setup stable ID
    this.stableId = this.hydration.getStableId('lighthouse-demo');

    // Setup font optimization
    this.fontStack = this.fontOptimization.getSystemFontStack();
    this.fontOptimization.waitForFonts().then(() => {
      this.fontsLoaded = true;
    });

    // Setup hydration checks
    this.isServer = this.hydration.isServer();
    this.isClientOnly = this.hydration.isBrowser();
    this.platformName = this.isServer ? 'Server' : 'Browser';

    // Validate hydration
    const validation = this.hydration.validateHydration();
    this.hydrationWarnings = validation.warnings;

    // Get image metrics
    this.avgImageLoadTime = this.imageOptimization.getAverageImageLoadTime();
    this.imageMetricsCount = this.imageOptimization.getImageMetrics().size;
  }

  getResponsiveSrcset(): string {
    return this.imageOptimization.generateSrcSet('/images/evidence.jpg');
  }

  testHealthCheck(): void {
    this.serverApi.healthCheck('/api').subscribe(result => {
      this.healthStatus = result;
    });
  }
}

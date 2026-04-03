import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { PerformanceMetricsComponent } from '../components/performance-metrics.component';

@Component({
  selector: 'app-gan-models',
  standalone: true,
  imports: [CommonModule, DashboardComponent, PerformanceMetricsComponent],
  template: `
    <div class="gan-models-container">
      <div class="header-bar">
        <div class="header-content">
          <h1>🤖 GAN Models Dashboard</h1>
          <div class="user-actions">
            <span class="user-info">👤 {{ currentUser }}</span>
            <button (click)="logout()" class="logout-btn">Logout</button>
          </div>
        </div>
      </div>

      <div class="models-section">
        <app-performance-metrics></app-performance-metrics>
        <app-dashboard></app-dashboard>
      </div>
    </div>
  `,
  styles: [`
    .gan-models-container {
      min-height: 100vh;
      background: #f9fafb;
    }

    .header-bar {
      background: linear-gradient(135deg, #1976d2 0%, #0d47a1 100%);
      color: white;
      padding: 20px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .header-content {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-content h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }

    .user-actions {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .user-info {
      font-size: 14px;
      opacity: 0.95;
    }

    .logout-btn {
      padding: 8px 16px;
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 14px;
      transition: all 0.3s ease;
    }

    .logout-btn:hover {
      background: rgba(255, 255, 255, 0.3);
      border-color: rgba(255, 255, 255, 0.5);
    }

    .models-section {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }
  `]
})
export class GanModelsComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  currentUser = 'Forensic Investigator';

  constructor(private router: Router) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!sessionStorage.getItem('isAuthenticated')) {
      this.router.navigate(['/login']);
    }
  }

  logout() {
    if (confirm('Are you sure you want to logout?')) {
      if (isPlatformBrowser(this.platformId)) {
        sessionStorage.removeItem('isAuthenticated');
      }
      this.router.navigate(['/login']);
    }
  }
}



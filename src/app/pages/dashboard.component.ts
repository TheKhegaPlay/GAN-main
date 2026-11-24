import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { CaseWorkflowStepperComponent } from '../components/case-workflow-stepper.component';
import { MonitoringDashboardComponent } from '../components/monitoring-dashboard/monitoring-dashboard.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CaseWorkflowStepperComponent, MonitoringDashboardComponent],
  template: `
    <main class="dashboard-container">
      <header class="dashboard-heading">
        <h1>Forensic restoration workspace</h1>
        <p>Run image or NetFlow restoration, review model readiness, and create a PDF report.</p>
      </header>

      <app-case-workflow-stepper></app-case-workflow-stepper>
      <app-monitoring-dashboard></app-monitoring-dashboard>
    </main>
  `,
  styles: [`
    .dashboard-container {
      max-width: 1440px;
      margin: 0 auto;
      padding: 24px;
    }

    .dashboard-heading { margin: 0 0 20px; }
    .dashboard-heading h1 { margin: 0 0 8px; color: #173b65; }
    .dashboard-heading p { margin: 0; color: #596579; }

    @media (max-width: 640px) {
      .dashboard-container { padding: 12px; }
    }
  `]
})
export class DashboardComponent {}

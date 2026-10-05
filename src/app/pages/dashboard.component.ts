import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ForensicStateService } from '../services/forensic-state.service';
import { ForensicState, EvidenceStatus } from '../models/forensic.models';
import { EvidenceColumnComponent } from '../components/evidence-column.component';
import { FilterByStatusPipe } from '../pipes/filter-by-status.pipe';
import { StepperExampleComponent } from '../components/Stepper/stepper-example.component';
import { MonitoringDashboardComponent } from '../components/monitoring-dashboard/monitoring-dashboard.component';
import { Observable } from 'rxjs';
import { DynamicFormComponent } from '../dynamic-forms/dynamic-form.component';
import { FieldConfig } from '../dynamic-forms/dynamic-form.models';
import { LighthouseDemoComponent } from '../components/lighthouse-demo.component';
import { GanRestorationComponent } from '../components/gan-restoration.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    EvidenceColumnComponent,
    FilterByStatusPipe,
    StepperExampleComponent,
    MonitoringDashboardComponent,
    DynamicFormComponent,
    LighthouseDemoComponent,
    GanRestorationComponent
  ],
  template: `
    <div class="dashboard-container">
      <!-- Lighthouse Demo Toggle -->
      <div class="demo-header">
        <button (click)="showLighthouseDemo = !showLighthouseDemo" class="demo-toggle-btn">
          {{ showLighthouseDemo ? '✕ Hide' : '⚡ Show' }} Lighthouse Optimization Demo
        </button>
      </div>

      <!-- Lighthouse Demo Component -->
      <app-lighthouse-demo *ngIf="showLighthouseDemo"></app-lighthouse-demo>

      <!-- Original Dashboard Content -->
      <div [hidden]="showLighthouseDemo" class="forensic-content">
        <!-- Top Navigation Buttons -->
        <div class="nav-buttons">
          <button (click)="showRestoration = !showRestoration" class="nav-btn primary">
            🔧 {{ showRestoration ? 'Hide' : 'Show' }} GAN Image Restoration
          </button>
          <button (click)="showDashboard = !showDashboard" class="nav-btn">
            📊 {{ showDashboard ? 'Hide' : 'Show' }} Monitoring Dashboard
          </button>
          <button (click)="showStepper = !showStepper" class="nav-btn">
            📈 {{ showStepper ? 'Hide' : 'Show' }} Stepper
          </button>
          <button (click)="showDynamic = !showDynamic" class="nav-btn">
            📋 {{ showDynamic ? 'Hide' : 'Show' }} Dynamic Form
          </button>
        </div>

        <!-- GAN Restoration Component -->
        <div *ngIf="showRestoration" class="restoration-section m-4">
          <app-gan-restoration></app-gan-restoration>
        </div>

        <!-- Monitoring Dashboard -->
        <app-monitoring-dashboard *ngIf="showDashboard" class="m-4"></app-monitoring-dashboard>

        <!-- Stepper -->
        <div *ngIf="showStepper" class="stepper-section">
          <app-stepper-example></app-stepper-example>
        </div>

        <!-- Dynamic Form -->
        <div *ngIf="showDynamic" class="dynamic-form-section">
          <h2>Case Investigation Form</h2>
          <app-dynamic-form [config]="dynamicConfig"></app-dynamic-form>
        </div>

        <!-- Evidence Columns -->
        <div *ngIf="state$ | async as state" class="evidence-section">
          <h2>Evidence Management</h2>

          <div class="cases-container">
            <div *ngFor="let caseItem of state.cases" class="case-section">
              <h3>{{ caseItem.name }}</h3>
              <p class="case-description">{{ caseItem.description }}</p>

              <div class="evidence-columns">
                <app-evidence-column
                  *ngFor="let status of statuses"
                  [status]="status"
                  [evidences]="caseItem.evidences | filterByStatus: status"
                  [caseId]="caseItem.id"
                  (add)="onAdd(caseItem.id, status, \$event)"
                  (advance)="onAdvance(caseItem.id, \$event)"
                  (remove)="onRemove(caseItem.id, \$event)">
                </app-evidence-column>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 20px;
      background: #f9fafb;
      min-height: 100vh;
    }

    .demo-header {
      margin-bottom: 20px;
      text-align: center;
    }

    .demo-toggle-btn {
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .demo-toggle-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
    }

    .forensic-content {
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .nav-buttons {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .nav-btn {
      padding: 10px 16px;
      background: white;
      color: #333;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .nav-btn:hover {
      background: #f5f5f5;
      border-color: #667eea;
      color: #667eea;
    }

    .nav-btn.primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      font-weight: 600;
    }

    .nav-btn.primary:hover {
      background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .stepper-section,
    .dynamic-form-section,
    .restoration-section {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      margin-top: 20px;
    }

    .restoration-section {
      border-left: 4px solid #667eea;
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .evidence-section {
      margin-top: 20px;
    }

    .evidence-section h2 {
      margin-bottom: 15px;
      color: #333;
    }

    .cases-container {
      display: grid;
      gap: 20px;
    }

    .case-section {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .case-section h3 {
      margin: 0 0 8px;
      color: #333;
    }

    .case-description {
      color: #666;
      margin: 0 0 15px;
      font-size: 13px;
    }

    .evidence-columns {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
    }

    @media (max-width: 768px) {
      .dashboard-container {
        padding: 10px;
      }

      .nav-buttons {
        flex-direction: column;
      }

      .nav-btn {
        width: 100%;
      }

      .evidence-columns {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  state$!: Observable<ForensicState>;
  showLighthouseDemo = false;
  showRestoration = false;

  statuses: EvidenceStatus[] = ['uploaded', 'processing', 'restored'];
  showStepper = false;
  showDynamic = false;
  showDashboard = false;

  dynamicConfig: FieldConfig[] = [
    {
      name: 'investigator',
      label: 'Investigator Name',
      type: 'text',
      placeholder: 'Full name',
      validators: [{ name: 'required' }]
    },
    {
      name: 'priority',
      label: 'Priority Level',
      type: 'select',
      options: [
        { label: 'Low', value: 'low' },
        { label: 'Medium', value: 'medium' },
        { label: 'High', value: 'high' },
        { label: 'Critical', value: 'critical' }
      ],
      validators: [{ name: 'required' }]
    },
    {
      name: 'tags',
      label: 'Evidence Tags (Searchable)',
      type: 'multiselect-search',
      options: [
        { label: 'Face', value: 'face' },
        { label: 'License Plate', value: 'plate' },
        { label: 'Document', value: 'doc' },
        { label: 'Handwriting', value: 'hand' },
        { label: 'Vehicle', value: 'vehicle' },
        { label: 'Building', value: 'building' },
        { label: 'Weapon', value: 'weapon' },
        { label: 'Clothing', value: 'clothing' }
      ],
      validators: [{ name: 'required' }]
    },
    {
      name: 'phone',
      label: 'Contact Phone',
      type: 'phone',
      placeholder: '+1-234-567-8900',
      validators: [
        { name: 'required' },
        { name: 'phone' }
      ]
    },
    {
      name: 'email',
      label: 'Contact Email',
      type: 'email',
      placeholder: 'investigator@forensics.gov',
      validators: [
        { name: 'required' },
        { name: 'email' }
      ]
    },
    {
      name: 'restoreConfidence',
      label: 'Restoration Confidence Level',
      type: 'rating',
      validators: [{ name: 'required' }]
    },
    {
      name: 'ganModels',
      label: 'Select GAN Models for Processing',
      type: 'multiselect',
      options: [
        { label: 'ESRGAN (Super-Resolution)', value: 'esrgan' },
        { label: 'GFPGAN (Face Restoration)', value: 'gfpgan' },
        { label: 'SRGAN (General SR)', value: 'srgan' }
      ],
      validators: [{ name: 'required' }]
    }
  ];

  constructor(private stateService: ForensicStateService) {}

  ngOnInit() {
    this.state$ = this.stateService.getState$();
  }

  onAdd(caseId: string, columnStatus: EvidenceStatus, ev: { filename: string; ganModel: string; status: string }) {
    this.stateService.addEvidence(caseId, {
      filename: ev.filename,
      ganModel: ev.ganModel,
      status: columnStatus
    });
  }

  onAdvance(caseId: string, evidenceId: string) {
    const statusMap: { [key in EvidenceStatus]: EvidenceStatus } = {
      'uploaded': 'processing',
      'processing': 'restored',
      'restored': 'restored'
    };

    const currentState = (this.state$ as any).source?.value || {};
    const caseItem = currentState.cases?.find((c: any) => c.id === caseId);
    const evidence = caseItem?.evidences?.find((e: any) => e.id === evidenceId);

    if (evidence && evidence.status in statusMap) {
      const nextStatus = statusMap[evidence.status as EvidenceStatus];
      this.stateService.updateEvidenceStatus(caseId, evidenceId, nextStatus);
    }
  }

  onRemove(caseId: string, evidenceId: string) {
    if (confirm('Are you sure you want to delete this evidence?')) {
      this.stateService.deleteEvidence(caseId, evidenceId);
    }
  }
}

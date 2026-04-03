import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StepperComponent } from './stepper.component';
import { StepComponent } from './step.component';

@Component({
  selector: 'app-stepper-example',
  standalone: true,
  imports: [CommonModule, FormsModule, StepperComponent, StepComponent],
  template: `
    <div class="example-container">
      <h2>Multi-Step Form (Stepper Component Example)</h2>

      <app-stepper [orientation]="'horizontal'"
                   (stepChanged)="onStepChanged($event)"
                   (completed)="onCompleted()">

        <!-- Step 1: Personal Information -->
        <app-step stepId="step-1"
                  label="Personal Info">
          <div class="step-form">
            <h3>Step 1: Personal Information</h3>
            <div class="form-group">
              <label for="name">Full Name:</label>
              <input id="name" [(ngModel)]="formData.name" placeholder="Enter your name" />
            </div>
            <div class="form-group">
              <label for="email">Email:</label>
              <input id="email" [(ngModel)]="formData.email" type="email" placeholder="Enter your email" />
            </div>
            <button (click)="completeStep('step-1')">Mark as Complete</button>
          </div>
        </app-step>

        <!-- Step 2: Address -->
        <app-step stepId="step-2"
                  label="Address">
          <div class="step-form">
            <h3>Step 2: Address</h3>
            <div class="form-group">
              <label for="street">Street:</label>
              <input id="street" [(ngModel)]="formData.street" placeholder="Enter street address" />
            </div>
            <div class="form-group">
              <label for="city">City:</label>
              <input id="city" [(ngModel)]="formData.city" placeholder="Enter city" />
            </div>
            <button (click)="completeStep('step-2')">Mark as Complete</button>
          </div>
        </app-step>

        <!-- Step 3: Confirmation -->
        <app-step stepId="step-3"
                  label="Confirmation">
          <div class="step-form">
            <h3>Step 3: Confirmation</h3>
            <p><strong>Name:</strong> {{ formData.name }}</p>
            <p><strong>Email:</strong> {{ formData.email }}</p>
            <p><strong>Street:</strong> {{ formData.street }}</p>
            <p><strong>City:</strong> {{ formData.city }}</p>
            <button (click)="submitForm()">Submit</button>
          </div>
        </app-step>

      </app-stepper>
    </div>
  `,
  styles: [`
    .example-container {
      max-width: 600px;
      margin: 20px auto;
    }

    .step-form {
      padding: 20px;
    }

    .step-form h3 {
      margin-top: 0;
      color: #333;
    }

    .form-group {
      margin-bottom: 16px;
      display: flex;
      flex-direction: column;
    }

    .form-group label {
      margin-bottom: 6px;
      font-weight: 500;
      color: #555;
    }

    .form-group input {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }

    button {
      padding: 8px 16px;
      background: #1976d2;
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    }

    button:hover {
      background: #1565c0;
    }

    p {
      margin: 8px 0;
      color: #333;
    }
  `]
})
export class StepperExampleComponent {
  formData = {
    name: '',
    email: '',
    street: '',
    city: ''
  };

  onStepChanged(stepIndex: number): void {
    console.log('Step changed to:', stepIndex);
  }

  completeStep(stepId: string): void {
    console.log('Step completed:', stepId);
  }

  onCompleted(): void {
    console.log('All steps completed!');
  }

  submitForm(): void {
    console.log('Form submitted:', this.formData);
    alert('Form submitted successfully!');
  }
}

import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StepperStateService } from '../../services/stepper-state.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-step',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="step-content-wrapper"
         *ngIf="isActive$ | async"
         role="tabpanel"
         [attr.aria-labelledby]="stepId"
         [attr.aria-hidden]="!(isActive$ | async)">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .step-content-wrapper {
      animation: fadeIn 0.3s ease-in;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class StepComponent implements OnInit, OnDestroy {
  @Input() stepId!: string;
  @Input() label!: string;
  @Input() disabled = false;
  @Input() errorMessage?: string;

  isActive$!: Observable<boolean>;

  constructor(private stepperStateService: StepperStateService) {}

  ngOnInit() {
    this.stepperStateService.registerStep({
      id: this.stepId,
      label: this.label,
      disabled: this.disabled
    });

    this.isActive$ = this.stepperStateService.getState$().pipe(
      map(state => state.steps.findIndex(s => s.id === this.stepId) === state.currentStepIndex)
    );
  }

  ngOnDestroy() {
    // Cleanup if needed
  }

  markAsCompleted(): void {
    const state = this.stepperStateService['state$'].getValue();
    const index = state.steps.findIndex(s => s.id === this.stepId);
    if (index !== -1) {
      this.stepperStateService.markStepCompleted(index);
    }
  }

  setError(hasError: boolean): void {
    const state = this.stepperStateService['state$'].getValue();
    const index = state.steps.findIndex(s => s.id === this.stepId);
    if (index !== -1) {
      this.stepperStateService.setStepError(index, hasError);
    }
  }
}

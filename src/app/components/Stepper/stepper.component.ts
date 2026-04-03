import { Component, OnInit, Input, Output, EventEmitter, HostListener, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StepperStateService, StepperState } from '../../services/stepper-state.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-stepper',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stepper"
         [class.vertical]="(state$ | async)?.orientation === 'vertical'"
         [class.horizontal]="(state$ | async)?.orientation === 'horizontal'"
         role="tablist"
         [attr.aria-label]="'Step navigation'"
         [attr.aria-orientation]="(state$ | async)?.orientation">

      <!-- Step Header -->
      <div class="stepper-header" *ngIf="state$ | async as state">
        <div *ngFor="let step of state.steps; let i = index"
             class="step-header-item"
             [class.active]="i === state.currentStepIndex"
             [class.completed]="step.completed"
             [class.error]="step.error"
             [class.disabled]="step.disabled"
             role="tab"
             [attr.aria-selected]="i === state.currentStepIndex"
             [attr.aria-disabled]="step.disabled || false"
             [attr.tabindex]="i === state.currentStepIndex ? 0 : -1"
             (click)="selectStep(i)"
             (keydown)="onHeaderKeydown($event, i)">

          <div class="step-number">
            <span *ngIf="!step.completed && !step.error">{{ i + 1 }}</span>
            <span *ngIf="step.completed" class="icon-checkmark">✓</span>
            <span *ngIf="step.error" class="icon-error">!</span>
          </div>

          <div class="step-label">{{ step.label }}</div>

          <div *ngIf="i < (state.steps.length || 1) - 1" class="step-connector"
               [class.active]="i < state.currentStepIndex">
          </div>
        </div>
      </div>

      <!-- Step Content -->
      <div class="stepper-content">
        <ng-content></ng-content>
      </div>

      <!-- Navigation Buttons -->
      <div class="stepper-actions" *ngIf="state$ | async as state">
        <button (click)="previousStep()"
                [disabled]="state.currentStepIndex === 0"
                aria-label="Go to previous step">
          Previous
        </button>
        <button (click)="nextStep()"
                [disabled]="state.currentStepIndex === (state.steps.length || 1) - 1"
                aria-label="Go to next step">
          Next
        </button>
      </div>
    </div>
  `,
  styles: [`
    .stepper {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 20px;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .stepper-header {
      display: flex;
      gap: 0;
      align-items: center;
      justify-content: space-between;
    }

    .stepper.vertical .stepper-header {
      flex-direction: column;
      gap: 8px;
    }

    .step-header-item {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      padding: 12px;
      border-radius: 6px;
      transition: all 0.3s ease;
      border: 2px solid transparent;
      outline: none;
      position: relative;
      flex: 1;
      justify-content: center;
    }

    .step-header-item:focus {
      border-color: #1976d2;
      box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
    }

    .step-header-item.active {
      background: #e3f2fd;
      color: #1976d2;
      font-weight: 600;
    }

    .step-header-item.completed {
      color: #4caf50;
    }

    .step-header-item.error {
      color: #f44336;
    }

    .step-header-item.disabled {
      opacity: 0.5;
      cursor: not-allowed;
      color: #999;
    }

    .step-number {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      flex-shrink: 0;
    }

    .step-header-item.active .step-number {
      background: #1976d2;
      color: #fff;
    }

    .step-header-item.completed .step-number {
      background: #4caf50;
      color: #fff;
    }

    .step-header-item.error .step-number {
      background: #f44336;
      color: #fff;
    }

    .icon-checkmark, .icon-error {
      font-size: 18px;
    }

    .step-connector {
      flex: 1;
      height: 2px;
      background: #e0e0e0;
      margin: 0 8px;
    }

    .step-connector.active {
      background: #4caf50;
    }

    .stepper.vertical .step-connector {
      display: none;
    }

    .step-label {
      font-size: 14px;
      white-space: nowrap;
    }

    .stepper-content {
      min-height: 200px;
      padding: 20px;
      background: #f9f9f9;
      border-radius: 6px;
      border: 1px solid #e0e0e0;
    }

    .stepper-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding-top: 12px;
      border-top: 1px solid #e0e0e0;
    }

    button {
      padding: 8px 16px;
      border: 1px solid #1976d2;
      background: #fff;
      color: #1976d2;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.3s ease;
    }

    button:hover:not(:disabled) {
      background: #1976d2;
      color: #fff;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `],
  providers: [StepperStateService]
})
export class StepperComponent implements OnInit, AfterViewInit {
  @Input() orientation: 'horizontal' | 'vertical' = 'horizontal';
  @Output() stepChanged = new EventEmitter<number>();
  @Output() completed = new EventEmitter<void>();

  state$!: Observable<StepperState>;

  constructor(public stepperStateService: StepperStateService) {}

  ngOnInit() {
    this.state$ = this.stepperStateService.getState$();
    this.stepperStateService.setOrientation(this.orientation);
  }

  ngAfterViewInit() {
    // Focus first step header item
    const firstTabElement = document.querySelector('[role="tab"]');
    if (firstTabElement) {
      (firstTabElement as HTMLElement).focus();
    }
  }

  selectStep(index: number): void {
    this.stepperStateService.setCurrentStep(index);
    this.stepChanged.emit(index);
  }

  nextStep(): void {
    this.stepperStateService.nextStep();
    const state = this.stepperStateService['state$'].getValue();
    this.stepChanged.emit(state.currentStepIndex);
  }

  previousStep(): void {
    this.stepperStateService.previousStep();
    const state = this.stepperStateService['state$'].getValue();
    this.stepChanged.emit(state.currentStepIndex);
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const state = this.stepperStateService['state$'].getValue();

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        this.nextStep();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        this.previousStep();
        break;
      case 'Enter':
        event.preventDefault();
        this.nextStep();
        break;
    }
  }

  onHeaderKeydown(event: KeyboardEvent, index: number): void {
    const state = this.stepperStateService['state$'].getValue();

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        if (index < state.steps.length - 1) {
          this.selectStep(index + 1);
        }
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        if (index > 0) {
          this.selectStep(index - 1);
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectStep(index);
        break;
    }
  }
}

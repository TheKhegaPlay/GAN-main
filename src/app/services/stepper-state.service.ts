import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface StepConfig {
  id: string;
  label: string;
  completed?: boolean;
  disabled?: boolean;
  error?: boolean;
}

export interface StepperState {
  steps: StepConfig[];
  currentStepIndex: number;
  orientation: 'horizontal' | 'vertical';
}

@Injectable()
export class StepperStateService {
  private state$ = new BehaviorSubject<StepperState>({
    steps: [],
    currentStepIndex: 0,
    orientation: 'horizontal'
  });

  constructor() {}

  getState$(): Observable<StepperState> {
    return this.state$.asObservable();
  }

  getCurrentStepIndex$(): Observable<number> {
    return new Observable(observer => {
      this.state$.subscribe(state => observer.next(state.currentStepIndex));
    });
  }

  registerStep(step: StepConfig): void {
    const state = this.state$.getValue();
    const stepExists = state.steps.some(s => s.id === step.id);
    if (!stepExists) {
      const newSteps = [...state.steps, step];
      this.state$.next({ ...state, steps: newSteps });
    }
  }

  setCurrentStep(index: number): void {
    const state = this.state$.getValue();
    if (index >= 0 && index < state.steps.length && !state.steps[index].disabled) {
      this.state$.next({ ...state, currentStepIndex: index });
    }
  }

  nextStep(): void {
    const state = this.state$.getValue();
    const nextIndex = state.currentStepIndex + 1;
    if (nextIndex < state.steps.length) {
      this.setCurrentStep(nextIndex);
    }
  }

  previousStep(): void {
    const state = this.state$.getValue();
    const prevIndex = state.currentStepIndex - 1;
    if (prevIndex >= 0) {
      this.setCurrentStep(prevIndex);
    }
  }

  markStepCompleted(stepIndex: number): void {
    const state = this.state$.getValue();
    const updatedSteps = state.steps.map((step, idx) =>
      idx === stepIndex ? { ...step, completed: true } : step
    );
    this.state$.next({ ...state, steps: updatedSteps });
  }

  setStepError(stepIndex: number, hasError: boolean): void {
    const state = this.state$.getValue();
    const updatedSteps = state.steps.map((step, idx) =>
      idx === stepIndex ? { ...step, error: hasError } : step
    );
    this.state$.next({ ...state, steps: updatedSteps });
  }

  setOrientation(orientation: 'horizontal' | 'vertical'): void {
    const state = this.state$.getValue();
    this.state$.next({ ...state, orientation });
  }

  reset(): void {
    const state = this.state$.getValue();
    const resetSteps = state.steps.map(step => ({
      ...step,
      completed: false,
      error: false
    }));
    this.state$.next({ ...state, steps: resetSteps, currentStepIndex: 0 });
  }
}

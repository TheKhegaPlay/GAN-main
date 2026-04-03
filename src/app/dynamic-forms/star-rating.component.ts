import { Component, forwardRef, Input, Optional, Self, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  NG_VALIDATORS,
  Validator,
  AbstractControl,
  ValidationErrors,
  NgControl
} from '@angular/forms';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rating-wrapper" [class.invalid]="isInvalidTouched">
      <div class="radio-group">
        <label *ngFor="let _ of stars; let idx = index" class="radio-label">
          <input
            type="radio"
            [name]="nameAttr"
            [value]="idx + 1"
            [checked]="value === (idx + 1)"
            (change)="setValue(idx + 1)"
            [disabled]="disabled"
            [attr.aria-label]="'Rate ' + (idx + 1)"
            [attr.aria-required]="required ? 'true' : null">
          <span class="radio-text">{{ idx + 1 }}</span>
        </label>
      </div>
    </div>
  `,
  styles: [`
    .rating-wrapper { padding: 12px; border-radius: 4px; border: 1px solid #ddd; }
    .rating-wrapper.invalid { outline: 2px solid #f44336; background-color: #ffebee; border-color: #f44336; }
    .radio-group { display:flex; gap:16px; align-items:center; }
    .radio-label { display:flex; align-items:center; gap:6px; cursor:pointer; font-weight:500; margin:0; }
    .radio-label input[type="radio"] { cursor:pointer; width:18px; height:18px; margin:0; accent-color:#1976d2; }
    .radio-label input[type="radio"]:disabled { cursor:not-allowed; opacity:0.6; }
    .radio-text { user-select:none; font-size:14px; }
  `],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => StarRatingComponent), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => StarRatingComponent), multi: true }
  ]
})
export class StarRatingComponent implements ControlValueAccessor, Validator, OnInit {
  @Input() maxStars = 5;
  @Input() required = false;
  @Input() name?: string;

  value = 0;
  disabled = false;

  private onChange: (v: any) => void = () => {};
  private onTouched: () => void = () => {};
  private _uid = `rating-${Math.floor(Math.random() * 1000000)}`;

  constructor(@Optional() @Self() public ngControl: NgControl) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  ngOnInit(): void {
    // force validation update for parent form control
    this.ngControl?.control?.updateValueAndValidity();
  }

  get stars(): unknown[] {
    return new Array(this.maxStars);
  }

  get nameAttr(): string {
    return this.name || this._uid;
  }

  get isInvalidTouched(): boolean {
    const control = this.ngControl?.control;
    return !!(control && control.invalid && (control.touched || control.dirty));
  }

  setValue(v: number): void {
    if (this.disabled) return;
    this.value = v;
    this.onChange(this.value);
    this.onTouched();
  }

  // ControlValueAccessor
  writeValue(obj: any): void {
    this.value = typeof obj === 'number' && obj > 0 ? obj : 0;
  }
  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled = isDisabled; }

  // Validator
  validate(control: AbstractControl): ValidationErrors | null {
    if (this.required && (!this.value || this.value === 0)) {
      return { required: true };
    }
    return null;
  }
}

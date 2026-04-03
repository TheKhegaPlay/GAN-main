import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { DynamicFormService } from './dynamic-form.service';
import { FieldConfig } from './dynamic-form.models';

@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="dyn-form card">
      <h3 class="card-title">Dynamic Form</h3>

      <div class="field-grid">
        <div *ngFor="let f of config" class="field" [class.invalid]="isInvalid(f.name)">
          <label *ngIf="f.label" class="field-label">
            {{ f.label }}
            <span *ngIf="hasRequired(f)" class="req">*</span>
          </label>

          <ng-container [ngSwitch]="f.type">
            <input *ngSwitchCase="'text'" class="control" [formControlName]="f.name" [placeholder]="f.placeholder" />
            <select *ngSwitchCase="'select'" class="control" [formControlName]="f.name">
              <option value="">— Select —</option>
              <option *ngFor="let o of f.options" [value]="o.value">{{ o.label }}</option>
            </select>
            <label *ngSwitchCase="'checkbox'" class="toggle">
              <input type="checkbox" [formControlName]="f.name" />
              <span class="toggle-text">{{ f.label }}</span>
            </label>

            <!-- Рейтинг -->
            <div *ngSwitchCase="'rating'" class="rating-wrapper">
              <label class="rating-item" *ngFor="let _ of createArray(5); let idx = index">
                <input type="radio"
                       class="rating-input"
                       [formControlName]="f.name"
                       [value]="idx + 1"
                       [name]="f.name"
                       aria-hidden="false"
                       [attr.aria-label]="'Rate ' + (idx + 1)" />
                <span class="star">{{ idx + 1 }}</span>
              </label>
            </div>

            <input *ngSwitchCase="'phone'" class="control" type="tel" [formControlName]="f.name" [placeholder]="f.placeholder" />
            <input *ngSwitchCase="'email'" class="control" type="email" [formControlName]="f.name" [placeholder]="f.placeholder" />

            <!-- Обычный multiselect (чипы) -->
            <div *ngSwitchCase="'multiselect'" class="multiselect-wrapper">
              <label *ngFor="let option of f.options" class="chip-label">
                <input type="checkbox"
                       class="chip-input"
                       [checked]="(form.get(f.name)?.value || []).indexOf(option.value) > -1"
                       (change)="onMultiSelectChange(f.name, $event)" />
                <span class="chip">{{ option.label }}</span>
              </label>
            </div>

            <!-- multiselect с поиском -->
            <div *ngSwitchCase="'multiselect-search'" class="multiselect-search">
              <input class="search" type="search" placeholder="Поиск..." (input)="onSearchChange(f.name, $any($event.target).value)" />
              <div class="options-list">
                <label *ngFor="let option of getFilteredOptions(f)" class="option-row">
                  <input type="checkbox"
                         [value]="option.value"
                         [checked]="(form.get(f.name)?.value || []).indexOf(option.value) > -1"
                         (change)="onMultiSelectChange(f.name, $event)" />
                  <span class="option-label">{{ option.label }}</span>
                </label>
                <div *ngIf="getFilteredOptions(f).length === 0" class="no-results">Ничего не найдено</div>
              </div>
            </div>

          </ng-container>

          <div class="error" *ngIf="isInvalid(f.name)">
            <small *ngIf="form.controls[f.name].errors?.['required']">Поле обязательно для заполнения.</small>
            <small *ngIf="form.controls[f.name].errors?.['min']">Значение слишком мало.</small>
            <small *ngIf="form.controls[f.name].errors?.['max']">Значение слишком велико.</small>
            <small *ngIf="form.controls[f.name].errors?.['pattern']">Неверный формат.</small>
          </div>
        </div>
      </div>

      <div class="actions">
        <button type="submit" class="btn" [disabled]="form.invalid">Отправить</button>
      </div>
    </form>
  `,
  styles: [`
    :host { display:flex; justify-content:center; padding:12px; }

    .card { width:100%; max-width:900px; background:#fff; border-radius:12px; box-shadow:0 6px 18px rgba(20,30,50,0.08); padding:20px; box-sizing:border-box; }
    .card-title { margin:0 0 12px 0; font-size:18px; color:#1f2937; border-bottom:1px solid #eef2f6; padding-bottom:8px; }

    .field-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:14px; margin-top:12px; }
    .field { display:flex; flex-direction:column; gap:6px; }
    .field.invalid .control, .field.invalid .rating-wrapper, .field.invalid .multiselect-wrapper, .field.invalid .multiselect-search { outline: 2px solid rgba(244,67,54,0.18); border-radius:6px; padding:6px; }

    .field-label { font-weight:600; color:#374151; display:flex; gap:8px; align-items:center; }
    .req { color:#d32f2f; font-weight:700; margin-left:6px; }

    .control { width:100%; padding:10px 12px; border:1px solid #d1d5db; border-radius:8px; background:#fff; box-sizing:border-box; font-size:14px; transition:all 0.15s ease; }
    .control:focus { outline:none; border-color:#1976d2; box-shadow:0 0 0 4px rgba(25,118,210,0.06); }

    .toggle { display:flex; align-items:center; gap:10px; }
    .toggle input { width:18px; height:18px; }
    .toggle-text { color:#374151; }

    /* multiselect-search styles */
    .multiselect-search { display:flex; flex-direction:column; gap:8px; }
    .search { padding:8px 10px; border:1px solid #e5e7eb; border-radius:8px; font-size:14px; }
    .options-list { display:flex; flex-direction:column; gap:6px; max-height:180px; overflow:auto; padding:6px 0; }
    .option-row { display:flex; gap:10px; align-items:center; padding:6px 8px; border-radius:6px; cursor:pointer; }
    .option-row:hover { background:#f8fafc; }
    .option-row input { width:16px; height:16px; }
    .no-results { color:#888; padding:8px; font-size:13px; }

    /* другие стили (чипы/рейтинг/кнопки) */
    .multiselect-wrapper { display:flex; gap:8px; flex-wrap:wrap; padding:6px 0; }
    .chip-label { display:flex; align-items:center; gap:8px; cursor:pointer; }
    .chip-input { display:none; }
    .chip { padding:8px 12px; background:#f3f4f6; border-radius:20px; font-size:13px; color:#374151; border:1px solid transparent; transition:all 0.12s ease; }
    .chip-label .chip-input:checked + .chip { background:linear-gradient(90deg,#1976d2,#1565c0); color:#fff; border-color:rgba(0,0,0,0.06); }

    .rating-wrapper { display:flex; gap:8px; align-items:center; padding:6px 0; }
    .rating-item { display:inline-flex; align-items:center; gap:8px; cursor:pointer; }
    .rating-input { display:none; }
    .star { width:36px; height:36px; display:inline-flex; align-items:center; justify-content:center; border-radius:8px; background:linear-gradient(180deg,#f3f4f6,#ffffff); border:1px solid #e5e7eb; color:#374151; font-weight:600; transition:all 0.12s ease; box-shadow:0 2px 6px rgba(16,24,40,0.04); }
    .rating-item .rating-input:checked + .star, .rating-item .rating-input:focus + .star { background:linear-gradient(180deg,#1976d2,#115293); color:#fff; border-color:#0d47a1; transform:translateY(-2px); }

    .error small { color:#d32f2f; font-size:12px; }

    .actions { margin-top:16px; display:flex; justify-content:flex-end; }
    .btn { padding:10px 18px; border-radius:10px; border:none; cursor:pointer; background:linear-gradient(90deg,#1976d2,#0d47a1); color:#fff; font-weight:700; box-shadow:0 6px 18px rgba(16,24,40,0.08); transition:transform .12s ease, opacity .12s ease; }
    .btn[disabled] { opacity:0.5; cursor:not-allowed; transform:none; box-shadow:none; }
  `]
})
export class DynamicFormComponent implements OnInit {
  @Input() config: FieldConfig[] = [];
  form!: any;

  // search queries per multiselect-search field
  searchQueries: Record<string, string> = {};

  constructor(private df: DynamicFormService) {}

  ngOnInit(): void {
    this.form = this.df.buildGroup(this.config);
  }

  // вспомогательный метод для *ngFor на радиокнопках
  createArray(n: number): number[] {
    return Array.from({ length: n });
  }

  hasRequired(f: FieldConfig) {
    return !!(f.validators || []).find(v => v.name === 'required');
  }

  isInvalid(name: string) {
    const c = this.form.controls[name];
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  submit() {
    if (this.form.valid) {
      console.log('Dynamic form submit', this.form.value);
      alert('Форма успешно отправлена (см. консоль)');
    } else {
      Object.values(this.form.controls).forEach((ctrl) => (ctrl as AbstractControl).markAsTouched());
    }
  }

  onMultiSelectChange(fieldName: string, event: Event): void {
    const control = this.form.get(fieldName);
    const selectedOptions = control.value || [];
    const value = (event.target as HTMLInputElement).value;
    if ((event.target as HTMLInputElement).checked) {
      control.setValue([...selectedOptions, value]);
    } else {
      control.setValue(selectedOptions.filter((v: any) => v !== value));
    }
    control.markAsDirty();
    control.markAsTouched();
  }

  onSearchChange(fieldName: string, query: string): void {
    this.searchQueries[fieldName] = query?.toLowerCase() || '';
  }

  getFilteredOptions(f: FieldConfig) {
    const q = (this.searchQueries[f.name] || '').trim();
    if (!f.options) return [];
    if (!q) return f.options;
    return f.options.filter(o => String(o.label).toLowerCase().includes(q) || String(o.value).toLowerCase().includes(q));
  }
}

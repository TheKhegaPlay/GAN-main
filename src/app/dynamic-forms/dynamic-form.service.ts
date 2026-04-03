import { Injectable } from '@angular/core';
import { FormBuilder, Validators, AbstractControlOptions } from '@angular/forms';
import { FieldConfig } from './dynamic-form.models';

@Injectable({ providedIn: 'root' })
export class DynamicFormService {
  constructor(private fb: FormBuilder) {}

  buildGroup(fields: FieldConfig[]) {
    const group: Record<string, any> = {};
    for (const f of fields) {
      const validators = this.mapValidators(f.validators || []);
      // default values: multiselect -> [], checkbox -> false, otherwise null
      let defaultValue: any = null;
      if (f.type === 'multiselect' || f.type === 'multiselect-search') defaultValue = [];
      if (f.type === 'checkbox') defaultValue = false;
      group[f.name] = [{ value: defaultValue, disabled: !!f.disabled }, validators];
    }
    return this.fb.group(group);
  }

  private mapValidators(configs: any[]) {
    const arr = [];
    for (const c of configs) {
      switch (c.name) {
        case 'required':
          arr.push(Validators.required);
          break;
        case 'min':
          arr.push(Validators.min(c.args));
          break;
        case 'max':
          arr.push(Validators.max(c.args));
          break;
        case 'pattern':
          arr.push(Validators.pattern(c.args));
          break;
        case 'email':
          arr.push(Validators.email);
          break;
        case 'phone':
          arr.push(Validators.pattern(/^\+?[1-9]\d{1,14}$/)); // Пример: международный формат
          break;
      }
    }
    return arr;
  }
}

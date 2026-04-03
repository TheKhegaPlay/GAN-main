export type FieldType = 'text' | 'select' | 'checkbox' | 'rating' | 'phone' | 'email' | 'multiselect' | 'multiselect-search';

export interface ValidatorConfig {
  name: 'required' | 'min' | 'max' | 'pattern' | 'phone' | 'email';
  args?: any;
}

export interface MultiSelectOption {
  label: string;
  value: any;
}

export interface FieldConfig {
  name: string;
  label?: string;
  type: FieldType;
  options?: MultiSelectOption[]; // для select и multiselect
  validators?: ValidatorConfig[];
  placeholder?: string;
  disabled?: boolean;
  multiple?: boolean; // для multiselect
}

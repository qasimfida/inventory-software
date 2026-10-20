export interface CommandField {
  name: string;
  label: string;
  kind?: 'text' | 'number' | 'boolean' | 'select' | 'multiline';
  options?: { value: string; label: string }[];
  value?: string | number | boolean;
  required?: boolean;
}
export type FormValues = Record<string, string | number | boolean>;
export interface CommandForm {
  title: string;
  fields: CommandField[];
  submit: (values: FormValues) => Promise<unknown>;
}
export const formText = (values: FormValues, key: string) => String(values[key] ?? '');

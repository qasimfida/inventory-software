import type { Preferences } from '@inventory/contracts';
import { currencySchema } from '@inventory/contracts';
export const preferenceFields = [
  { key: 'currency', label: 'Currency', options: currencySchema.options },
  { key: 'appearance', label: 'Appearance', options: ['system', 'light', 'dark'] },
  { key: 'accent', label: 'Theme color', options: ['default', 'teal', 'violet', 'rose', 'amber'] },
  { key: 'motion', label: 'Animation', options: ['enabled', 'reduced', 'disabled'] },
  { key: 'density', label: 'Spacing', options: ['comfortable', 'compact'] },
  { key: 'pagination', label: 'List loading', options: ['pages', 'scroll'] },
  { key: 'radius', label: 'Control shape', options: ['rounded', 'circle'] },
  { key: 'iconSize', label: 'Icon size', options: ['small', 'medium', 'large'] },
  { key: 'textSize', label: 'Text size', options: ['small', 'medium', 'large'] },
  { key: 'font', label: 'Font', options: ['system', 'Karla', 'Lora', 'serif', 'monospace'] },
  {
    key: 'states',
    label: 'Loading and empty states / contextual actions',
    options: ['simple', 'enhanced'],
  },
  { key: 'visualizations', label: 'Visualization detail', options: ['simple', 'enhanced'] },
] as const satisfies readonly {
  key: keyof Preferences;
  label: string;
  options: readonly string[];
}[];
export const notificationFields = [
  { key: 'notifyUser', label: 'Notify affected user' },
  { key: 'notifyBusinessAdmins', label: 'Business alerts to eligible members' },
  { key: 'notifyPlatformAdmins', label: 'Notify platform administrators' },
] as const;

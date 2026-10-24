import { useId, useSyncExternalStore } from 'react';
import { preferenceFields } from '@inventory/api-client';
import { preferencePatchSchema } from '@inventory/contracts';
import { settingsModel } from '@/platform/settings';
import { Segmented } from '@/components/ui/Segmented';
import { Select } from '@/components/ui/FormControls';
import { FontPicker } from './FontPicker';
const groups = [
  { title: 'Appearance', keys: ['appearance', 'accent'] },
  { title: 'Typography', keys: ['font', 'textSize'] },
  { title: 'Layout & controls', keys: ['density', 'radius', 'iconSize', 'pagination'] },
  { title: 'Regional', keys: ['currency'] },
  {
    title: 'Accessibility & performance',
    keys: ['motion', 'states', 'visualizations'],
  },
];
export function PreferenceFields() {
  const paletteName = useId();
  const state = useSyncExternalStore(settingsModel.subscribe, settingsModel.snapshot),
    effective = settingsModel.effective();
  return (
    <>
      {groups.map((group) => (
        <section key={group.title} className="preference-group space-y-4">
          <h3>{group.title}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {preferenceFields
              .filter((f) => group.keys.includes(f.key))
              .sort((a, b) => group.keys.indexOf(a.key) - group.keys.indexOf(b.key))
              .map((field) => {
                const enforced =
                  state.snapshot?.platform.values.enforced[field.key] ??
                  state.business?.values.enforced[field.key];
                const disabled = state.busy || !state.snapshot || enforced !== undefined;
                const label = `${field.label === 'Appearance' ? 'Account appearance' : field.label}${enforced !== undefined ? ' (enforced)' : ''}`;
                const change = (value: string) =>
                  void settingsModel.save(preferencePatchSchema.parse({ [field.key]: value }));
                if (field.key === 'font')
                  return (
                    <FontPicker
                      key={field.key}
                      disabled={disabled}
                      value={effective.font}
                      onChange={change}
                    />
                  );
                if (field.key === 'accent')
                  return (
                    <fieldset key={field.key} disabled={disabled}>
                      <legend>{label}</legend>
                      <div className="palette-options" role="radiogroup" aria-label={label}>
                        {field.options.map((color) => (
                          <label
                            key={color}
                            className="palette-option"
                            data-selected={effective.accent === color}
                          >
                            <input
                              className="palette-radio"
                              type="radio"
                              name={paletteName}
                              aria-label={color === 'default' ? 'Blue' : color}
                              value={color}
                              checked={effective.accent === color}
                              disabled={disabled}
                              onChange={() => change(color)}
                            />
                            <span
                              className="palette-swatch"
                              data-color={color}
                              aria-hidden="true"
                            />
                            {color === 'default' ? 'Blue' : color}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  );
                if (field.options.length <= 3)
                  return (
                    <Segmented
                      key={field.key}
                      label={label}
                      value={effective[field.key]}
                      options={field.options}
                      disabled={disabled}
                      onChange={change}
                    />
                  );
                return (
                  <label key={field.key}>
                    {label}
                    <Select
                      aria-label={label}
                      value={effective[field.key]}
                      disabled={disabled}
                      onChange={(e) => change(e.target.value)}
                    >
                      {field.options.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </Select>
                  </label>
                );
              })}
          </div>
        </section>
      ))}
    </>
  );
}

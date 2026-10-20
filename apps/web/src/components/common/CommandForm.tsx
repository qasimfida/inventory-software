import type { CommandForm as Definition, FormValues } from '@inventory/api-client';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/FormControls';
export function CommandForm({
  definition,
  run,
}: {
  definition: Definition;
  run: (work: () => Promise<unknown>) => void;
}) {
  return (
    <form
      aria-label={definition.title}
      className="space-y-2 rounded border p-3"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const values: FormValues = {};
        for (const field of definition.fields) {
          const raw = String(data.get(field.name) ?? '');
          values[field.name] =
            field.kind === 'number' ? Number(raw) : field.kind === 'boolean' ? raw === 'true' : raw;
        }
        run(() => definition.submit(values));
      }}
    >
      <h4>{definition.title}</h4>
      {definition.fields.map((field) => {
        const id = `${definition.title}-${field.name}`.replace(/\s+/g, '-');
        return (
          <div key={field.name}>
            <label htmlFor={id}>{field.label}</label>
            {field.kind === 'select' || field.kind === 'boolean' ? (
              <Select
                id={id}
                name={field.name}
                defaultValue={String(field.value ?? '')}
                required={field.required ?? true}
              >
                {(field.kind === 'boolean'
                  ? [
                      { value: 'false', label: 'No' },
                      { value: 'true', label: 'Yes' },
                    ]
                  : (field.options ?? [])
                ).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            ) : field.kind === 'multiline' ? (
              <textarea
                className="w-full rounded border p-2"
                id={id}
                name={field.name}
                defaultValue={String(field.value ?? '')}
                required={field.required ?? true}
                maxLength={2500}
              />
            ) : (
              <Input
                id={id}
                name={field.name}
                type={field.kind === 'number' ? 'number' : 'text'}
                defaultValue={String(field.value ?? '')}
                required={field.required ?? true}
                maxLength={500}
              />
            )}
          </div>
        );
      })}
      <Button type="submit">{definition.title}</Button>
    </form>
  );
}

import { useState } from 'react';
import { FormSheet } from './FormSheet';
import { Plus } from 'lucide-react';
import type { CommandForm as Definition, FormValues } from '@inventory/api-client';
import { FormField } from './FormField';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/FormControls';
export function CommandForm({
  definition,
  run,
  inline = false,
}: {
  definition: Definition;
  inline?: boolean;
  run: (work: () => Promise<unknown>) => void;
}) {
  const [open, setOpen] = useState(false);
  const form = (
    <form
      aria-label={definition.title}
      className="command-form"
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
      <h3>{definition.title}</h3>
      {definition.fields.map((field) => {
        const id = `${definition.title}-${field.name}`.replace(/\s+/g, '-');
        return (
          <FormField key={field.name} id={id} label={field.label} required={field.required ?? true}>
            {(control) => (
              <>
                {field.kind === 'select' || field.kind === 'boolean' ? (
                  <Select {...control} name={field.name} defaultValue={String(field.value ?? '')}>
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
                  <Textarea
                    {...control}
                    name={field.name}
                    defaultValue={String(field.value ?? '')}
                    maxLength={2500}
                  />
                ) : (
                  <Input
                    {...control}
                    name={field.name}
                    type={field.kind === 'number' ? 'number' : 'text'}
                    defaultValue={String(field.value ?? '')}
                    maxLength={500}
                  />
                )}
              </>
            )}
          </FormField>
        );
      })}
      <Button type="submit">{definition.title}</Button>
    </form>
  );
  return inline ? (
    form
  ) : (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Plus aria-hidden="true" />
        {definition.title}
      </Button>
      <FormSheet title={definition.title} open={open} onOpenChange={setOpen}>
        {form}
      </FormSheet>
    </>
  );
}

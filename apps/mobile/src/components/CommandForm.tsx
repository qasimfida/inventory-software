import { SidePanel } from '../ui/SidePanel';
import { Text } from '../ui/Themed';
import { Fragment, useState } from 'react';
import { Surface } from '../ui/Surface';
import type { CommandForm as Definition, FormValues } from '@inventory/api-client';
import { Action, Choice, Field } from '../organization/Controls';
export function CommandForm({
  definition,
  error,
  run,
  inline = false,
}: {
  definition: Definition;
  /** Safe workflow error, repeated inside the active drawer for assistive technology. */
  error?: string | undefined;
  inline?: boolean;
  run: (work: () => Promise<unknown>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<FormValues>(() =>
    Object.fromEntries(
      definition.fields.map((f) => [
        f.name,
        f.value ??
          (f.kind === 'select' ? (f.options?.[0]?.value ?? '') : f.kind === 'boolean' ? false : ''),
      ]),
    ),
  );
  const change = (key: string, value: string | number | boolean) =>
    setValues((current) => ({ ...current, [key]: value }));
  const form = (
    <Surface>
      <Text accessibilityRole="header">{definition.title}</Text>
      {Boolean(error) && <Text accessibilityRole="alert">{error}</Text>}
      {definition.fields.map((field) => (
        <Fragment key={field.name}>
          {field.section && <Text accessibilityRole="header">{field.section}</Text>}
          {field.kind === 'select' || field.kind === 'boolean' ? (
            <Choice
              key={field.name}
              label={field.label}
              value={String(values[field.name] ?? '')}
              options={
                field.kind === 'boolean'
                  ? [
                      { value: 'false', label: 'No' },
                      { value: 'true', label: 'Yes' },
                    ]
                  : (field.options ?? [])
              }
              onChange={(value) =>
                change(field.name, field.kind === 'boolean' ? value === 'true' : value)
              }
            />
          ) : (
            <Field
              key={field.name}
              label={field.label}
              value={String(values[field.name] ?? '')}
              onChange={(value) => change(field.name, value)}
              maxLength={field.kind === 'multiline' ? 2500 : 500}
              multiline={field.kind === 'multiline'}
            />
          )}
        </Fragment>
      ))}
      <Action
        label={definition.title}
        onPress={() => {
          const input = Object.fromEntries(
            definition.fields.map((field) => [
              field.name,
              field.kind === 'number' ? Number(values[field.name]) : (values[field.name] ?? ''),
            ]),
          );
          run(() => definition.submit(input));
        }}
      />
    </Surface>
  );
  return inline ? (
    form
  ) : (
    <>
      <Action label={definition.title} onPress={() => setOpen(true)} />
      <SidePanel title={definition.title} open={open} onClose={() => setOpen(false)}>
        {form}
      </SidePanel>
    </>
  );
}

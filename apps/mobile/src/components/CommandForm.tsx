import { useState } from 'react';
import { Text, View } from 'react-native';
import type { CommandForm as Definition, FormValues } from '@inventory/api-client';
import { Action, Choice, Field, styles } from '../organization/Controls';
export function CommandForm({
  definition,
  run,
}: {
  definition: Definition;
  run: (work: () => Promise<unknown>) => void;
}) {
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
  return (
    <View style={styles.group}>
      <Text accessibilityRole="header">{definition.title}</Text>
      {definition.fields.map((field) =>
        field.kind === 'select' || field.kind === 'boolean' ? (
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
        ),
      )}
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
    </View>
  );
}

import type { ImportWorkflow } from '@inventory/api-client';
import { importFields, mappingIssues } from '@inventory/api-client';
import { View } from 'react-native';
import { Action, Choice, Field } from '../ui/Controls';
import { Text } from '../ui/Themed';
import { ConfirmAction } from '../ui/ConfirmAction';
export function ImportMappingEditor({ model }: { model: ImportWorkflow }) {
  const state = model.snapshot(),
    source = state.source;
  if (!source) return null;
  const issues = mappingIssues(source, state.mapping);
  return (
    <View>
      <Text accessibilityRole="header">Map source columns to product fields</Text>
      <Choice
        label="Business mapping template"
        value={state.templateId}
        disabled={state.busy}
        onChange={model.selectTemplate}
        options={[
          { value: '', label: 'New mapping' },
          ...state.templates.map((t) => ({ value: t.id, label: t.name })),
        ]}
      />
      <Action
        label="Reload templates"
        disabled={state.busy}
        onPress={() => void model.loadTemplates()}
      />
      {issues.map((issue) => (
        <Text key={issue} accessibilityRole={state.templateId ? 'alert' : 'text'}>
          {issue}
        </Text>
      ))}
      {importFields.map((field) => {
        const column = state.mapping[field.key],
          exists = source.headers.includes(column);
        return (
          <View key={field.key}>
            <Choice
              label={`${field.label} · ${field.required ? 'Required' : 'Optional'}`}
              disabled={state.busy}
              value={column}
              onChange={(v) => model.edit({ mapping: { ...state.mapping, [field.key]: v } })}
              options={[
                {
                  value: '',
                  label: field.required
                    ? 'Select a column'
                    : field.key === 'quantity'
                      ? 'Not mapped — zero stock'
                      : 'Not mapped — empty description',
                },
                ...(column && !exists ? [{ value: column, label: `${column} (missing)` }] : []),
                ...source.headers.map((h) => ({ value: h, label: h })),
              ]}
            />
            <Text>
              Sample:{' '}
              {exists
                ? source.rows.find((r) => r[source.headers.indexOf(column)])?.[
                    source.headers.indexOf(column)
                  ] || 'Empty'
                : '—'}{' '}
              ·{' '}
              {column
                ? exists
                  ? 'Mapped'
                  : 'Missing column'
                : field.required
                  ? 'Required mapping missing'
                  : 'Optional default'}
            </Text>
          </View>
        );
      })}
      <Field
        label="Template name"
        value={state.templateName}
        disabled={state.busy}
        maxLength={80}
        onChange={(v) => model.edit({ templateName: v })}
      />
      <Action
        label={state.templateId ? 'Save template changes' : 'Create template'}
        disabled={state.busy || !!issues.length || !state.templateName.trim()}
        onPress={() => void model.saveTemplate()}
      />
      {!!state.templateId && (
        <>
          <Action
            label="Save as new template"
            disabled={state.busy || !!issues.length || !state.templateName.trim()}
            onPress={() => void model.saveTemplate(true)}
          />
          <ConfirmAction
            label="Delete template"
            description="Remove this business mapping template? Products and the current import draft are unchanged."
            confirmLabel="Delete template"
            disabled={state.busy}
            onConfirm={() => void model.deleteTemplate()}
          />
        </>
      )}
      <Text>
        Use a different name when saving a copy. Templates contain mappings only, never uploaded
        rows.
      </Text>
      <Text>
        Ignored source columns:{' '}
        {source.headers
          .filter((header) => !Object.values(state.mapping).includes(header))
          .join(', ') || 'None'}
        . Only the mapped fields above will be imported.
      </Text>
    </View>
  );
}

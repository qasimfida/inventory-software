import type { ImportWorkflow } from '@inventory/api-client';
import { importFields, mappingIssues } from '@inventory/api-client';
import { Input, Select } from '@/components/ui/FormControls';
import { Button } from '@/components/ui/Button';
import { Table, TableScroll } from '@/components/ui/Table';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
export function ImportMappingEditor({ model }: { model: ImportWorkflow }) {
  const state = model.snapshot(),
    source = state.source;
  if (!source) return null;
  const issues = mappingIssues(source, state.mapping);
  return (
    <section aria-label="Column mapping" className="space-y-2">
      <h3>Map source columns to product fields</h3>
      <label htmlFor="import-template">Business mapping template</label>
      <Select
        id="import-template"
        value={state.templateId}
        disabled={state.busy}
        onChange={(e) => model.selectTemplate(e.target.value)}
      >
        <option value="">New mapping</option>
        {state.templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </Select>
      <Button variant="ghost" disabled={state.busy} onClick={() => void model.loadTemplates()}>
        Reload templates
      </Button>
      {!!issues.length && (
        <div
          role={state.templateId ? 'alert' : undefined}
          className="text-sm text-muted-foreground"
        >
          {issues.map((issue) => (
            <p key={issue}>{issue}</p>
          ))}
        </div>
      )}
      <TableScroll label="Column mappings">
        <Table className="min-w-[48rem]">
          <thead>
            <tr>
              {['Product field', 'Source column', 'Sample source value', 'Status'].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {importFields.map((field) => {
              const column = state.mapping[field.key];
              const exists = source.headers.includes(column);
              return (
                <tr key={field.key}>
                  <th scope="row">
                    {field.label} · {field.required ? 'Required' : 'Optional'}
                  </th>
                  <td>
                    <Select
                      className="min-w-48"
                      aria-label={`Source for ${field.label}`}
                      disabled={state.busy}
                      value={column}
                      onChange={(e) =>
                        model.edit({ mapping: { ...state.mapping, [field.key]: e.target.value } })
                      }
                    >
                      <option value="">
                        {field.required
                          ? 'Select a column'
                          : field.key === 'quantity'
                            ? 'Not mapped — zero stock'
                            : 'Not mapped — empty description'}
                      </option>
                      {column && !exists && <option value={column}>{column} (missing)</option>}
                      {source.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td>
                    {exists
                      ? source.rows.find((r) => r[source.headers.indexOf(column)])?.[
                          source.headers.indexOf(column)
                        ] || 'Empty'
                      : '—'}
                  </td>
                  <td>
                    {column
                      ? exists
                        ? 'Mapped'
                        : 'Missing column'
                      : field.required
                        ? 'Required mapping missing'
                        : 'Optional default'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </TableScroll>
      <label htmlFor="import-template-name">Template name</label>
      <Input
        id="import-template-name"
        value={state.templateName}
        disabled={state.busy}
        maxLength={80}
        onChange={(e) => model.edit({ templateName: e.target.value })}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={state.busy || !!issues.length || !state.templateName.trim()}
          onClick={() => void model.saveTemplate()}
        >
          {state.templateId ? 'Save template changes' : 'Create template'}
        </Button>
        {state.templateId && (
          <>
            <Button
              variant="outline"
              disabled={state.busy || !!issues.length || !state.templateName.trim()}
              onClick={() => void model.saveTemplate(true)}
            >
              Save as new template
            </Button>
            <ConfirmDialog
              title="Delete mapping template?"
              description="This removes the reusable mapping for this business. Products and this import draft are unchanged."
              confirmLabel="Delete template"
              onConfirm={() => void model.deleteTemplate()}
              trigger={
                <Button variant="destructive" disabled={state.busy}>
                  Delete template
                </Button>
              }
            />
          </>
        )}
      </div>
      <p>
        Use a different name when saving a copy. Templates contain column mappings only, never
        uploaded rows.
      </p>
      <p>
        Ignored source columns:{' '}
        {source.headers
          .filter((header) => !Object.values(state.mapping).includes(header))
          .join(', ') || 'None'}
        . Only the mapped fields above will be imported.
      </p>
    </section>
  );
}

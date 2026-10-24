import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Checkbox, Input, Select } from '@/components/ui/FormControls';
import { FormField, ErrorSummary } from '@/components/common/FormField';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Cluster, Panel } from '@/components/common/Layout';

export function FormDemo() {
  const [name, setName] = useState('');
  const [size, setSize] = useState('Comfortable');
  const [hints, setHints] = useState(true);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState('');
  const summary = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (error) summary.current?.focus();
  }, [error, attempt]);

  return (
    <Panel id="showcase-forms" tabIndex={-1} aria-labelledby="form-heading">
      <h2 id="form-heading">Form controls</h2>
      <p className="text-sm text-muted-foreground">
        A local preview only. Nothing is saved or sent.
      </p>
      <form
        noValidate
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          setMessage('');
          setAttempt((value) => value + 1);
          if (!name.trim()) {
            setError('Enter a preview label.');
            return;
          }
          setError(undefined);
          setMessage(
            `Preview updated: ${name.trim()}, ${size.toLowerCase()}, descriptions ${hints ? 'on' : 'off'}.`,
          );
        }}
      >
        <ErrorSummary
          ref={summary}
          errors={error ? [{ id: 'preview-label', message: error }] : []}
        />
        <FormField
          id="preview-label"
          label="Preview label"
          description="Use a short label, up to 40 characters."
          error={error}
          required
        >
          {(control) => (
            <Input
              {...control}
              maxLength={40}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (error) setError(undefined);
              }}
            />
          )}
        </FormField>
        <FormField label="Spacing preference">
          {(control) => (
            <Select {...control} value={size} onChange={(event) => setSize(event.target.value)}>
              <option>Comfortable</option>
              <option>Compact</option>
            </Select>
          )}
        </FormField>
        <label
          htmlFor="preview-hints"
          className="flex min-h-(--target-size) items-center gap-3 text-sm"
        >
          <Checkbox
            id="preview-hints"
            checked={hints}
            onCheckedChange={(checked) => setHints(checked === true)}
          />
          Include supporting descriptions
        </label>
        <Cluster>
          <Button type="submit">Update preview</Button>
          <ConfirmDialog
            trigger={<Button variant="outline">Reset example</Button>}
            title="Reset this example?"
            description="The preview label and preferences will return to their initial values. This only affects this demo."
            confirmLabel="Reset example"
            onConfirm={() => {
              setName('');
              setSize('Comfortable');
              setHints(true);
              setError(undefined);
              setMessage('Example reset.');
            }}
          />
        </Cluster>
        <p role="status" className="text-sm text-success">
          {message}
        </p>
      </form>
    </Panel>
  );
}

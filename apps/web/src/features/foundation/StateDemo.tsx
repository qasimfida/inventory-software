import { useState } from 'react';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState';
import { FormField } from '@/components/common/FormField';
import { Panel } from '@/components/common/Layout';
import { Select } from '@/components/ui/FormControls';

export function StateDemo() {
  const [state, setState] = useState('empty');
  return (
    <Panel aria-labelledby="states-heading">
      <h2 id="states-heading">Application feedback</h2>
      <FormField label="Example state">
        {(control) => (
          <Select {...control} value={state} onChange={(event) => setState(event.target.value)}>
            <option value="empty">Empty</option>
            <option value="loading">Loading</option>
            <option value="error">Error and retry</option>
          </Select>
        )}
      </FormField>
      <div className="rounded-lg border border-dashed bg-muted/40 p-5">
        {state === 'empty' && (
          <EmptyState message="There is nothing to display in this example yet." />
        )}
        {state === 'loading' && <LoadingState message="Loading the example…" />}
        {state === 'error' && (
          <ErrorState
            message="The example could not be loaded."
            onRetry={() => setState('empty')}
          />
        )}
      </div>
    </Panel>
  );
}

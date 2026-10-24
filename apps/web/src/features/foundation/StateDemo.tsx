import { FilterButton } from '@/components/common/FilterButton';
import { useState } from 'react';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState';
import { FormField } from '@/components/common/FormField';
import { Panel } from '@/components/common/Layout';
import { Select } from '@/components/ui/FormControls';

export function StateDemo() {
  const [state, setState] = useState('empty');
  return (
    <Panel id="showcase-feedback" tabIndex={-1} aria-labelledby="states-heading">
      <h2 id="states-heading">Application feedback</h2>
      <FilterButton
        active={state === 'empty' ? [] : [`Example: ${state}`]}
        onClick={() => setState('empty')}
      />
      <FormField label="Example state">
        {(control) => (
          <Select {...control} value={state} onChange={(event) => setState(event.target.value)}>
            <option value="empty">Empty</option>
            <option value="loading">Loading</option>
            <option value="error">Error and retry</option>
            <option value="offline">Offline / pending</option>
            <option value="success">Success notification</option>
          </Select>
        )}
      </FormField>
      <div className="rounded-lg border border-dashed bg-muted/40 p-5">
        {state === 'empty' && (
          <EmptyState
            message="No example records yet"
            description="Create a local preview to see the completed state. No business data is changed."
            action={{ label: 'Create local example', onClick: () => setState('success') }}
          />
        )}
        {state === 'loading' && <LoadingState message="Loading the example…" />}
        {state === 'offline' && (
          <p role="status" className="text-warning">
            Offline example: saved locally, waiting to sync. No server confirmation.
          </p>
        )}
        {state === 'success' && (
          <p role="status" className="text-success">
            Local preview complete. No business records changed.
          </p>
        )}
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

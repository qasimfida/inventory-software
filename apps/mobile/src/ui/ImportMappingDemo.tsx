import { useMemo, useSyncExternalStore } from 'react';
import { createImportDemo } from '@inventory/api-client/mock';
import { operationKey } from '../platform/operation-key';
import { FormSection } from './FormSection';
import { Action } from './Controls';
import { Text } from './Themed';
import { ImportMappingEditor } from '../catalog/ImportMappingEditor';
export function ImportMappingDemo() {
  const demo = useMemo(() => createImportDemo(operationKey), []);
  const state = useSyncExternalStore(
    demo.model.subscribe,
    demo.model.snapshot,
    demo.model.snapshot,
  );
  return (
    <FormSection title="Import column mapping">
      <Text>Local example only. Templates reset on reload and no products can be created.</Text>
      <Action label="Load example columns" onPress={() => void demo.load()} />
      {state.source && <ImportMappingEditor model={demo.model} />}
      <Text accessibilityLiveRegion="polite">{state.message}</Text>
    </FormSection>
  );
}

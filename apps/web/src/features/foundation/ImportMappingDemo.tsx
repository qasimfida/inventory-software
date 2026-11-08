import { useMemo, useSyncExternalStore } from 'react';
import { createImportDemo } from '@inventory/api-client/mock';
import { AccordionSection } from '@/components/ui/Accordion';
import { Button } from '@/components/ui/Button';
import { ImportMappingEditor } from '../catalog/ImportMappingEditor';
export function ImportMappingDemo() {
  const demo = useMemo(() => createImportDemo(() => crypto.randomUUID()), []);
  const state = useSyncExternalStore(demo.model.subscribe, demo.model.snapshot);
  return (
    <AccordionSection title="Import column mapping">
      <p>Local example only. Templates reset on reload and no products can be created.</p>
      <Button onClick={() => void demo.load()}>Load example columns</Button>
      {state.source && <ImportMappingEditor model={demo.model} />}
      <p role="status">{state.message}</p>
    </AccordionSection>
  );
}

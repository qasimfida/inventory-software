import { RecordDetails } from '../ui/RecordDetails';
import { SidePanel } from '../ui/SidePanel';
import { Choice } from '../ui/Controls';
import { StatusBadge } from '../ui/StatusBadge';
import { Text } from '../ui/Themed';
import { CommandForm } from '../components/CommandForm';
import { useState } from 'react';
import type { createStorageClient, CommandForm as Definition } from '@inventory/api-client';
import { LocationLabel } from './LocationLabel';
type Storage = Awaited<ReturnType<ReturnType<typeof createStorageClient>['load']>>;
export function StorageDetails({
  storage,
  selectedId,
  forms,
  close,
  run,
}: {
  storage: Storage;
  selectedId: string;
  forms: Definition[];
  close: () => void;
  run: (work: () => Promise<unknown>) => void;
}) {
  const [detailTab, setDetailTab] = useState('Details');
  return (
    <SidePanel title="Storage location details" open={!!selectedId} onClose={() => close()}>
      {(() => {
        const location = storage.locations.find((l) => l.id === selectedId);
        const form = location && forms.find((f) => f.title === `Save location ${location.code}`);
        return location ? (
          <>
            {form && (
              <Choice
                inline
                label="Location details view"
                value={detailTab}
                options={['Details', 'Edit location'].map((value) => ({
                  value,
                  label: value,
                }))}
                onChange={setDetailTab}
              />
            )}
            {detailTab === 'Edit location' && form ? (
              <CommandForm key={location.id} inline definition={form} run={run} />
            ) : (
              <>
                <Text accessibilityRole="header">{location.name}</Text>
                <StatusBadge
                  tone={location.state === 'active' ? 'success' : 'neutral'}
                  label={location.state}
                />
                <RecordDetails
                  label="Location information"
                  items={[
                    { label: 'Code', value: location.code },
                    { label: 'Type', value: location.type },
                    {
                      label: 'Capacity',
                      value:
                        location.capacity === null
                          ? 'Not specified'
                          : `${location.capacity} ${location.capacityUnit}`,
                    },
                    {
                      label: 'Parent',
                      value:
                        storage.locations.find((l) => l.id === location.parentId)?.name ??
                        (location.parentId ? 'Outside this page' : 'Warehouse root'),
                    },
                  ]}
                />
                <Text tone="muted">{location.notes || 'No notes added.'}</Text>
                <LocationLabel id={location.id} code={location.code} />
              </>
            )}
          </>
        ) : null;
      })()}
    </SidePanel>
  );
}

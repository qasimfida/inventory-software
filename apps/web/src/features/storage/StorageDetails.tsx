import { RecordDetails } from '@/components/common/RecordDetails';
import { FormSheet } from '@/components/common/FormSheet';
import { Segmented } from '@/components/ui/Segmented';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CommandForm } from '@/components/common/CommandForm';
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
    <FormSheet
      title="Storage location details"
      open={!!selectedId}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      {(() => {
        const location = storage.locations.find((l) => l.id === selectedId);
        const form = location && forms.find((f) => f.title === `Save location ${location.code}`);
        return location ? (
          <>
            {form && (
              <Segmented
                label="Location details view"
                value={detailTab}
                options={['Details', 'Edit location']}
                onChange={setDetailTab}
              />
            )}
            {detailTab === 'Edit location' && form ? (
              <CommandForm key={location.id} inline definition={form} run={run} />
            ) : (
              <>
                <h3>{location.name}</h3>
                <StatusBadge tone={location.state === 'active' ? 'success' : 'neutral'}>
                  {location.state}
                </StatusBadge>
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
                <p className="text-sm text-muted-foreground">
                  {location.notes || 'No notes added.'}
                </p>
                <LocationLabel id={location.id} code={location.code} />
              </>
            )}
          </>
        ) : null;
      })()}
    </FormSheet>
  );
}

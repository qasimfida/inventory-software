import { useState } from 'react';
import type { createCashClient, CommandForm as Definition } from '@inventory/api-client';
import { businessTime } from '@inventory/contracts';
import { RecordDetails } from '../ui/RecordDetails';
import { EmptyState } from '../ui/AsyncState';
import { RecordTable } from '../ui/RecordTable';
import { Action } from '../ui/Controls';
import { SidePanel } from '../ui/SidePanel';
import { CommandForm } from '../components/CommandForm';
type Shift = Awaited<ReturnType<ReturnType<typeof createCashClient>['list']>>['shifts'][number];
/** Read-only reconciliation uses server amounts; existing commands retain their owner. */
export function CashRecords({
  error,
  filtered = false,
  shifts,
  forms,
  run,
  timeZone,
}: {
  filtered?: boolean;
  error?: string | undefined;
  shifts: Shift[];
  forms: Definition[];
  run: (work: () => Promise<unknown>) => void;
  timeZone: string | undefined;
}) {
  const [selected, setSelected] = useState('');
  const shift = shifts.find((s) => s.id === selected);
  const columns = [
    'Opened',
    'State',
    'Currency',
    'Expected (minor units)',
    'Counted (minor units)',
    'Discrepancy (minor units)',
  ];
  return (
    <>
      {!shifts.length ? (
        <EmptyState
          message={filtered ? 'No matching cash shifts' : 'No cash shifts'}
          description={
            filtered
              ? 'Try another search or clear the filters.'
              : 'Authorized staff can open a shift before collecting cash.'
          }
        />
      ) : (
        <RecordTable
          label="Cash shifts"
          columns={columns}
          rows={shifts.map((s) => ({
            id: s.id,
            cells: [
              <Action
                key="open"
                variant="link"
                label={businessTime(s.openedAt, timeZone)}
                onPress={() => setSelected(s.id)}
              />,
              s.state,
              s.currency,
              s.expectedMinor,
              s.countedMinor ?? 'Not counted',
              s.discrepancyMinor ?? 'Not reconciled',
            ],
          }))}
        />
      )}
      <SidePanel title="Cash shift details" open={Boolean(shift)} onClose={() => setSelected('')}>
        {shift && (
          <>
            <RecordDetails
              label="Cash shift details"
              items={[
                { label: 'Shift reference', value: shift.id },
                { label: 'State', value: shift.state },
                { label: 'Currency', value: `${shift.currency} minor units` },
                { label: 'Opening float', value: shift.openingMinor },
                { label: 'Expected', value: shift.expectedMinor },
                { label: 'Counted', value: shift.countedMinor ?? 'Not counted' },
                { label: 'Discrepancy', value: shift.discrepancyMinor ?? 'Not reconciled' },
                { label: 'Opened', value: businessTime(shift.openedAt, timeZone) },
                {
                  label: 'Closed',
                  value: shift.closedAt ? businessTime(shift.closedAt, timeZone) : 'Still open',
                },
                { label: 'Terminal reference', value: shift.terminalName ?? shift.terminalId },
                { label: 'Actor reference', value: shift.actorName ?? shift.actorId },
              ]}
            />
            {forms
              .filter((f) => f.title.endsWith(shift.id))
              .map((f) => (
                <CommandForm error={error} key={f.title} definition={f} run={run} />
              ))}
          </>
        )}
      </SidePanel>
    </>
  );
}

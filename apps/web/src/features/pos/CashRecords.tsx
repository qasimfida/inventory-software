import { useState } from 'react';
import type { createCashClient, CommandForm as Definition } from '@inventory/api-client';
import { businessTime } from '@inventory/contracts';
import { RecordDetails } from '@/components/common/RecordDetails';
import { EmptyState } from '@/components/common/AsyncState';
import { Table, TableScroll } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { FormSheet } from '@/components/common/FormSheet';
import { CommandForm } from '@/components/common/CommandForm';
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
        <TableScroll label="Cash shifts">
          <Table>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c} scope="col" data-numeric={c.includes('minor units') || undefined}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shifts.map((s) => (
                <tr key={s.id}>
                  <th scope="row">
                    <Button variant="link" onClick={() => setSelected(s.id)}>
                      {businessTime(s.openedAt, timeZone)}
                    </Button>
                  </th>
                  <td>{s.state}</td>
                  <td>{s.currency}</td>
                  <td data-numeric>{s.expectedMinor}</td>
                  <td data-numeric>{s.countedMinor ?? 'Not counted'}</td>
                  <td data-numeric>{s.discrepancyMinor ?? 'Not reconciled'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableScroll>
      )}
      <FormSheet
        title="Cash shift details"
        description="Review recorded cash totals before closing or adjusting this shift."
        open={Boolean(shift)}
        onOpenChange={(open) => {
          if (!open) setSelected('');
        }}
      >
        {shift && (
          <div className="min-w-0 shrink-0 space-y-3">
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
          </div>
        )}
      </FormSheet>
    </>
  );
}

import { AccordionSection } from '@/components/ui/Accordion';
import { MetricCard } from '@/components/common/MetricCard';
import { useState } from 'react';
import { Panel } from '@/components/common/Layout';
import { FormField } from '@/components/common/FormField';
import { Input } from '@/components/ui/FormControls';
import { Table, TableScroll } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';

export function DataPresentationDemo() {
  const [from, setFrom] = useState('2026-10-01');
  return (
    <Panel id="showcase-data" tabIndex={-1} aria-label="Data presentation examples">
      <h2>Data presentation</h2>
      <div className="metric-grid">
        <MetricCard
          label="Exact amount example"
          value="9007199254740993"
          unit="USD minor units · local example"
          primary
        />
        <MetricCard label="Quantity example" value="1234.567890" unit="Units · local example" />
      </div>
      <p className="text-sm text-muted-foreground">
        Local examples; exact values and units remain visible.
      </p>
      <TableScroll label="Exact-value example table">
        <Table>
          <caption>Example values, not business totals</caption>
          <thead>
            <tr>
              <th scope="col">Measure</th>
              <th scope="col" data-numeric>
                Value
              </th>
              <th scope="col">Unit / status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Exact amount</th>
              <td data-numeric>9007199254740993</td>
              <td>USD minor units</td>
            </tr>
            <tr data-selected="true">
              <th scope="row">Quantity</th>
              <td data-numeric>1234.567890</td>
              <td>each</td>
            </tr>
            <tr>
              <th scope="row">Recorded state</th>
              <td data-numeric>0</td>
              <td>
                <StatusBadge tone="neutral">Example only</StatusBadge>
              </td>
            </tr>
          </tbody>
        </Table>
      </TableScroll>
      <FormField
        label="Example date (UTC)"
        description="Native date picker; the stored date remains YYYY-MM-DD."
      >
        {(control) => (
          <Input
            {...control}
            type="date"
            value={from}
            min="2026-01-01"
            max="2026-12-31"
            onChange={(event) => setFrom(event.target.value)}
          />
        )}
      </FormField>
      <AccordionSection className="rounded-md border p-4" title={<>Expandable example</>}>
        <p>Expanded content keeps its controls and values.</p>
        <FormField label="Retained disclosure value">
          {(control) => <Input {...control} defaultValue="Local draft" />}
        </FormField>
      </AccordionSection>
    </Panel>
  );
}

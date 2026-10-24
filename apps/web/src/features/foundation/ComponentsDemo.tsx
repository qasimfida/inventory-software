import { ControlStatesDemo } from './ControlStatesDemo';
import { SectionNavigation } from '@/components/layout/SectionNavigation';
import { useState } from 'react';
import { RefreshCw, LoaderCircle } from 'lucide-react';
import { Panel, Cluster } from '@/components/common/Layout';
import { IconButton } from '@/components/common/IconButton';
import { Pagination } from '@/components/common/Pagination';
import { MoneyValue, BusinessDate } from '@/components/common/DataValue';
import { CommandForm } from '@/components/common/CommandForm';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/FormControls';
export function ComponentsDemo() {
  const [section, setSection] = useState('first');
  const [offset, setOffset] = useState(0);
  const [message, setMessage] = useState('');
  return (
    <Panel id="showcase-actions" tabIndex={-1} aria-labelledby="components-heading">
      <h2 id="components-heading">Actions, status and common components</h2>
      <Cluster>
        <Button onClick={() => setMessage('Primary example selected.')}>Primary example</Button>
        <Button variant="secondary">Secondary example</Button>
        <Button variant="outline" size="sm">
          A longer action label that wraps on small screens
        </Button>
        <Button variant="destructive">Destructive example</Button>
        <Button loading>Saving example</Button>
        <IconButton
          label="Refresh example"
          icon={RefreshCw}
          onClick={() => setMessage('Example refreshed.')}
        />
      </Cluster>
      <Cluster>
        {(['neutral', 'success', 'warning', 'error', 'info'] as const).map((tone) => (
          <StatusBadge key={tone} tone={tone}>
            {tone}
          </StatusBadge>
        ))}
      </Cluster>
      <label htmlFor="example-notes" className="block">
        Example notes
        <Textarea id="example-notes" placeholder="Add a note for this local example" />
      </label>
      <ControlStatesDemo />
      <Skeleton />
      <SectionNavigation
        label="Example navigation"
        current={section}
        onSelect={setSection}
        items={[
          { name: 'first', label: 'First section' },
          { name: 'second', label: 'Second section' },
        ]}
      />
      <p>Selected example section: {section}</p>
      <div className="lg:w-20">
        <SectionNavigation
          rail
          label="Example icon rail"
          current={section}
          onSelect={setSection}
          items={[
            { name: 'first', label: 'First section', Icon: RefreshCw },
            { name: 'second', label: 'Second section', Icon: LoaderCircle },
          ]}
        />
      </div>
      <Pagination
        label="example records"
        offset={offset}
        pageSize={25}
        hasMore={offset < 50}
        onChange={setOffset}
      />
      <p>
        Exact money: <MoneyValue amount="123456789012345" currency="USD" />
      </p>
      <p>
        Business time: <BusinessDate value="2026-10-20T12:00:00Z" timeZone="Asia/Karachi" />
      </p>
      <CommandForm
        definition={{
          title: 'Preview command form',
          fields: [{ name: 'quantity', label: 'Example decimal quantity', value: '1.250000' }],
          submit: (values) => {
            setMessage(`Local preview: ${String(values.quantity)}`);
            return Promise.resolve();
          },
        }}
        run={(work) => {
          void work();
        }}
      />
      <p role="status">{message}</p>
    </Panel>
  );
}

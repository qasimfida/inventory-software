import { ProfileIdentity } from '@/shell/ProfileIdentity';
import { SearchControl } from '@/components/common/SearchControl';
import { OverflowTabs } from '@/components/common/OverflowTabs';
import * as Tabs from '@radix-ui/react-tabs';
import { Hint } from '@/components/ui/Tooltip';
import { useState } from 'react';
import { AccordionSection } from '@/components/ui/Accordion';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
import { Progress } from '@/components/ui/Progress';
import { Button } from '@/components/ui/Button';
import { FormSheet } from '@/components/common/FormSheet';
import { RecordCollection } from '@/components/common/RecordCollection';
export function NavigationControlsDemo() {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  return (
    <section className="space-y-4">
      <h2>Navigation, drawers and record views</h2>
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="min-w-0 rounded-lg border p-3">
          <ProfileIdentity email="alex@example.test" role={String('owner')} />
        </div>
        <div className="min-w-0 rounded-lg border p-3">
          <ProfileIdentity
            email=""
            displayName="Example business"
            role={String('owner · Main store')}
          />
        </div>
      </div>
      <AccordionSection title="Example section" defaultOpen>
        <p>Chevron accordion with keyboard navigation.</p>
      </AccordionSection>
      <Popover>
        <PopoverTrigger asChild>
          <Button>Example filters</Button>
        </PopoverTrigger>
        <PopoverContent>
          <p>Local filter panel. Dynamic selection is demonstrated above.</p>
        </PopoverContent>
      </Popover>
      <Button onClick={() => setOpen(true)}>Open example form drawer</Button>
      <FormSheet title="Example form drawer" open={open} onOpenChange={setOpen}>
        <p>This is local demonstration state.</p>
        <Button onClick={() => setOpen(false)}>Done</Button>
      </FormSheet>
      <Hint label="Keyboard and pointer tooltip">
        <Button variant="ghost">Inspect tooltip</Button>
      </Hint>
      <Tabs.Root defaultValue="general">
        <OverflowTabs>
          <Tabs.List
            className="settings-navigation settings-tabs view-tabs"
            aria-label="Example overflow tabs"
          >
            {[
              'general',
              'appearance',
              'accessibility',
              'device',
              'notifications',
              'security',
              'integrations',
            ].map((tab) => (
              <Tabs.Trigger key={tab} value={tab}>
                {tab}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </OverflowTabs>
        {[
          'general',
          'appearance',
          'accessibility',
          'device',
          'notifications',
          'security',
          'integrations',
        ].map((tab) => (
          <Tabs.Content key={tab} value={tab}>
            Local {tab} preview.
          </Tabs.Content>
        ))}
      </Tabs.Root>
      <Progress value={50} label="Example measured progress" />
      <Progress label="Example unknown progress" />
      <RecordCollection
        toolbar={
          <div className="collection-search">
            <SearchControl label="Search example records" value={search} onChange={setSearch} />
          </div>
        }
        label="example records"
        columns={['Customer', 'Reference', 'Currency']}
        items={[
          {
            id: 'example',
            title: 'Example customer',
            subtitle: 'LOCAL-1',
            detail: 'USD',
            status: 'active',
            tone: 'success' as const,
          },
        ].filter((item) => item.title.toLowerCase().includes(search.toLowerCase()))}
        onOpen={() => setOpen(true)}
      />
    </section>
  );
}

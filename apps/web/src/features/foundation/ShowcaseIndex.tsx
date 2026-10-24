import { Search } from 'lucide-react';
import { AccordionSection } from '@/components/ui/Accordion';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/common/Layout';

const sections = [
  ['tokens', 'Tokens, themes, typography and spacing'],
  ['actions', 'Buttons, badges, navigation and pagination'],
  ['data', 'Cards, tables, dates and disclosures'],
  ['common', 'Custom workspace controls'],
  ['forms', 'Inputs, validation and confirmation dialogs'],
  ['feedback', 'Loading, empty, offline and error states'],
  ['menus', 'Menus and status feedback'],
] as const;

export function ShowcaseIndex() {
  return (
    <Panel aria-label="Showcase guide">
      <h2>Component library</h2>
      <nav aria-label="Showcase sections" className="flex flex-wrap gap-2">
        {sections.map(([id, label]) => (
          <Button
            key={id}
            variant="outline"
            size="sm"
            onClick={() => {
              const section = document.getElementById(`showcase-${id}`);
              section?.focus({ preventScroll: true });
              section?.scrollIntoView({ block: 'start', behavior: 'instant' });
            }}
          >
            {label}
          </Button>
        ))}
      </nav>
      <p className="text-sm text-muted-foreground">
        Use Tab to inspect focus, hover with a pointer, and activate the examples to inspect
        selected, invalid, loading and destructive states. Appearance changes only this preview.
      </p>
      <div className="flex gap-2" aria-label="Icon size variants">
        {(['small', 'medium', 'large'] as const).map((size) => (
          <Button key={size} variant="ghost" size="icon" aria-label={`${size} search icon`}>
            <Search data-icon-size={size} />
          </Button>
        ))}
      </div>
      <AccordionSection title={<>Tabs, popovers, tooltips, drawers and notifications</>}>
        <p>
          The application uses route tabs, Radix accordions, popovers, menus and Vaul right-side
          form drawers. Dynamic selections use a searchable command list. Progress is indeterminate
          unless actual completion is known. Examples below use local state and never write business
          records.
        </p>
      </AccordionSection>
    </Panel>
  );
}

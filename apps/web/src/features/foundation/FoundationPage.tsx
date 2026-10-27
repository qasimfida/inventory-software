import { NavigationControlsDemo } from './NavigationControlsDemo';
import { AccordionSection } from '@/components/ui/Accordion';
import { InventoryControlsDemo } from './InventoryControlsDemo';
import { PreferenceControlsDemo } from './PreferenceControlsDemo';
import { DataPresentationDemo } from './DataPresentationDemo';
import { TokensDemo } from './TokensDemo';
import { WorkspaceControlsDemo } from './WorkspaceControlsDemo';
import { ComponentsDemo } from './ComponentsDemo';
import { ShowcaseIndex } from './ShowcaseIndex';
import { AppearanceProvider, AppearanceControl } from '@/theme/Appearance';
import usage from '../../../../../docs/design-system.md?raw';
import { Page, Grid, Stack } from '@/components/common/Layout';
import { FormDemo } from './FormDemo';
import { StateDemo } from './StateDemo';
import { ReferencePanel } from './ReferencePanel';

const webCatalog =
  usage.split('## Web component API reference')[1]?.split('## Native component API reference')[0] ??
  '';
const nativeCatalog = usage.split('## Native component API reference')[1] ?? '';

export function FoundationPage() {
  return (
    <AppearanceProvider preview>
      <Showcase />
    </AppearanceProvider>
  );
}
function Showcase() {
  return (
    <Page>
      <Stack className="max-w-2xl gap-3">
        <a href="#/" className="text-sm font-medium text-primary">
          Back to workspace
        </a>
        <h1>Design system</h1>
        <p className="text-muted-foreground">
          Actual application components. All examples are local and reset on reload; no account
          preferences or business records are saved.
        </p>
      </Stack>
      <AppearanceControl />
      <ShowcaseIndex />
      <TokensDemo />
      <ComponentsDemo />
      <PreferenceControlsDemo />
      <InventoryControlsDemo />
      <NavigationControlsDemo />
      <DataPresentationDemo />
      <WorkspaceControlsDemo />
      <AccordionSection
        className="rounded-md border p-4"
        title={<>Component usage documentation</>}
      >
        <pre className="mt-4 whitespace-pre-wrap break-words text-sm">{usage}</pre>
      </AccordionSection>
      {[
        ['Web component API reference', webCatalog],
        ['Native component API reference', nativeCatalog],
      ].map(([title, content]) => (
        <AccordionSection key={title} className="rounded-md border p-4" title={<>{title}</>}>
          <pre className="mt-4 whitespace-pre-wrap break-words text-sm">{content}</pre>
        </AccordionSection>
      ))}
      <Grid>
        <FormDemo />
        <StateDemo />
        <ReferencePanel />
      </Grid>
      <p className="text-sm text-muted-foreground">
        Keyboard: Tab between controls, arrow keys within menus, and Escape to dismiss a dialog.
      </p>
    </Page>
  );
}

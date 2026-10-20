import { Page, Grid, Stack } from '@/components/common/Layout';
import { ConnectionPanel } from './ConnectionPanel';
import { FormDemo } from './FormDemo';
import { StateDemo } from './StateDemo';
import { AuthPanel } from '../auth/AuthPanel';
import { ReferencePanel } from './ReferencePanel';

export function FoundationPage() {
  return (
    <Page>
      <Stack className="max-w-2xl gap-3">
        <p className="text-sm font-medium tracking-wide text-primary">ONLINE WORKSPACE</p>
        <h1>Inventory platform</h1>
        <p className="text-muted-foreground">
          Manage your business, customers, stock and cash sales. Online checkout requires a
          connection; prepared registers support bounded offline cash sales.
        </p>
      </Stack>
      <AuthPanel />
      <Grid>
        <ConnectionPanel />
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

import { useState } from 'react';
import { Panel, Cluster } from '@/components/common/Layout';
import { Button } from '@/components/ui/Button';
import { Menu, MenuTrigger, MenuContent, MenuItem, MenuSeparator } from '@/components/ui/Menu';
import { Table } from '@/components/ui/Table';

export function ReferencePanel() {
  const [message, setMessage] = useState('');
  return (
    <Panel id="showcase-menus" tabIndex={-1} aria-labelledby="reference-heading">
      <h2 id="reference-heading">Semantic styles</h2>
      <Table>
        <caption>Color communicates meaning alongside text.</caption>
        <thead>
          <tr>
            <th scope="col">Role</th>
            <th scope="col">Example</th>
          </tr>
        </thead>
        <tbody>
          <tr data-selected="true">
            <th scope="row">Selected row</th>
            <td>Selection remains readable in either theme</td>
          </tr>
          <tr>
            <th scope="row">Primary</th>
            <td className="text-primary">Continue an action</td>
          </tr>
          <tr>
            <th scope="row">Success</th>
            <td className="text-success">Completed successfully</td>
          </tr>
          <tr>
            <th scope="row">Error</th>
            <td className="text-destructive">Needs attention</td>
          </tr>
        </tbody>
      </Table>
      <Cluster>
        <Button variant="secondary" disabled>
          Unavailable
        </Button>
        <Menu>
          <MenuTrigger asChild>
            <Button variant="outline">
              Example actions <span aria-hidden="true">▾</span>
            </Button>
          </MenuTrigger>
          <MenuContent align="start" aria-label="Example actions">
            <MenuItem onSelect={() => setMessage('Example action selected.')}>
              Show feedback
            </MenuItem>
            <MenuItem disabled>Unavailable action</MenuItem>
            <MenuSeparator />
            <MenuItem onSelect={() => setMessage('')}>Clear feedback</MenuItem>
          </MenuContent>
        </Menu>
      </Cluster>
      <p role="status" className="text-sm text-muted-foreground">
        {message}
      </p>
    </Panel>
  );
}

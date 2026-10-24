import { EmptyState } from './AsyncState';
import { ViewTabs } from './ViewTabs';
import type { ReactNode } from 'react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Table, TableScroll } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
export type CollectionRecord = {
  id: string;
  title: string;
  subtitle: string;
  detail: string;
  status: string;
  tone: 'success' | 'warning' | 'neutral';
};
/** Read-only collection navigation. Mutations belong to permission-checked feature actions. */
export function RecordCollection({
  items,
  label,
  onOpen,
  toolbar,
  columns = ['Name', 'Reference', 'Contact / currency'],
}: {
  items: CollectionRecord[];
  label: string;
  toolbar?: ReactNode;
  columns?: readonly [string, string, string];
  onOpen: (id: string) => void;
}) {
  const viewId = useId();
  const [grid, setGrid] = useState(false);
  return (
    <div className="space-y-3">
      <div className="collection-toolbar">
        {toolbar}
        <ViewTabs
          panelId={viewId}
          label={label}
          value={grid ? 'grid' : 'list'}
          onChange={(next) => setGrid(next === 'grid')}
        />
      </div>
      <div
        id={viewId}
        role="tabpanel"
        aria-label={`${label} ${grid ? 'grid' : 'list'} view`}
        tabIndex={0}
      >
        {!items.length ? (
          <EmptyState announce message={`No matching ${label}.`} />
        ) : grid ? (
          <div className="inventory-product-grid">
            {items.map((item) => (
              <article key={item.id} className="inventory-product-card selectable-card">
                <Button
                  className="product-card-title"
                  variant="ghost"
                  onClick={() => onOpen(item.id)}
                >
                  {item.title}
                </Button>
                <p>{item.subtitle}</p>
                <p>{item.detail}</p>
                <StatusBadge tone={item.tone}>{item.status}</StatusBadge>
              </article>
            ))}
          </div>
        ) : (
          <TableScroll label={label}>
            <Table>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <th scope="row">
                      <Button
                        className="product-card-title"
                        variant="ghost"
                        onClick={() => onOpen(item.id)}
                      >
                        {item.title}
                      </Button>
                    </th>
                    <td>{item.subtitle}</td>
                    <td>{item.detail}</td>
                    <td>
                      <StatusBadge tone={item.tone}>{item.status}</StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableScroll>
        )}
      </div>
    </div>
  );
}

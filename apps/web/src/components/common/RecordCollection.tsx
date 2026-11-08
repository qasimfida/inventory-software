import { ExportRecords } from './ExportRecords';
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
  /** Original evidence for CSV when the display includes an indicative equivalent. */
  exportDetail?: string;
  status: string;
  tone: 'success' | 'warning' | 'neutral';
};
/** Read-only collection navigation. Mutations belong to permission-checked feature actions. */
export function RecordCollection({
  items,
  label,
  onOpen,
  toolbar,
  emptyState,
  actions,
  showExport = true,
  allowGrid = true,
  columns = ['Name', 'Reference', 'Contact / currency'],
}: {
  items: CollectionRecord[];
  label: string;
  toolbar?: ReactNode;
  /** Optional loading, failure or contextual empty content supplied by the owning screen. */
  emptyState?: ReactNode;
  /** Permission-aware creation commands, placed after filters and view controls. */
  actions?: ReactNode;
  /** Hide only when the owning screen renders its export in the page action row. */
  showExport?: boolean;
  /** Use a fixed list for transaction history; product browsing keeps both views. */
  allowGrid?: boolean;
  columns?: readonly [string, string, string];
  onOpen: (id: string) => void;
}) {
  const viewId = useId();
  const [gridSelected, setGrid] = useState(false);
  const grid = allowGrid && gridSelected;
  return (
    <div className="space-y-3">
      <div className="collection-toolbar">
        {toolbar}
        {allowGrid && (
          <ViewTabs
            panelId={viewId}
            label={label}
            value={grid ? 'grid' : 'list'}
            onChange={(next) => setGrid(next === 'grid')}
          />
        )}
        {showExport && (
          <ExportRecords
            headers={['Name', 'Reference', 'Details', 'Status']}
            rows={items.map((item) => [
              item.title,
              item.subtitle,
              item.exportDetail ?? item.detail,
              item.status,
            ])}
          />
        )}
        {actions}
      </div>
      <div
        id={viewId}
        role={allowGrid ? 'tabpanel' : 'region'}
        aria-label={`${label} ${grid ? 'grid' : 'list'} view`}
        tabIndex={0}
      >
        {!items.length ? (
          (emptyState ?? <EmptyState announce message={`No matching ${label}.`} />)
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

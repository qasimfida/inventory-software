import { CashPanel } from '@/features/pos/CashPanel';
import { ReceiptPanel } from '@/features/pos/ReceiptPanel';
import { useWorkspace } from './WorkspaceContext';
export function CommercePage({ cash = false }: { cash?: boolean }) {
  const { business, locations } = useWorkspace();
  const warehouses = locations.filter((l) => l.kind === 'warehouses' && l.state === 'active');
  const warehouseId = warehouses[0]?.id;
  if (!business) return null;
  return (
    <section className="space-y-5">
      {warehouseId ? (
        cash ? (
          <CashPanel business={business} warehouseId={warehouseId} locations={locations} />
        ) : (
          <ReceiptPanel business={business} warehouseId={warehouseId} />
        )
      ) : (
        <p>Add a warehouse in Settings to begin.</p>
      )}
    </section>
  );
}

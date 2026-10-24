import type { createInventoryClient } from '@inventory/api-client';
import { inventoryForms } from '@inventory/api-client';
import { CommandForm } from '../components/CommandForm';
import { SidePanel } from '../ui/SidePanel';
import { Text } from '../ui/Themed';
type Client = ReturnType<typeof createInventoryClient>;
export function StockAdjustment({
  sku,
  data,
  client,
  warehouseId,
  error,
  busy,
  run,
  onClose,
}: {
  sku: string;
  data: Awaited<ReturnType<Client['load']>> | null;
  client: Client;
  warehouseId: string;
  error: string;
  busy: boolean;
  run: (work: () => Promise<unknown>) => void;
  onClose: () => void;
}) {
  const item = data?.items.find((item) => item.sku === sku);
  const form = data && item ? inventoryForms(client, data, warehouseId)[0] : undefined;
  return (
    <SidePanel
      title="Adjust stock"
      open={!!sku}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      {!!error && <Text accessibilityRole="alert">{error}</Text>}
      {busy ? (
        <Text accessibilityLiveRegion="polite">Loading stock…</Text>
      ) : form && item ? (
        <CommandForm
          key={item.id}
          inline
          definition={{
            ...form,
            fields: form.fields.map((field) => ({
              ...field,
              ...(field.name === 'variantId'
                ? { value: item.id }
                : field.name === 'unitId'
                  ? { value: item.baseUnitId }
                  : field.name === 'type'
                    ? { value: 'adjustment_in' }
                    : {}),
            })),
          }}
          run={(work) =>
            run(async () => {
              const result = await work();
              onClose();
              return result;
            })
          }
        />
      ) : (
        !error && (
          <Text>
            The selected item is not available in this warehouse. Refresh inventory and try again.
          </Text>
        )
      )}
    </SidePanel>
  );
}

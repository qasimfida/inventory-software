import type { createInventoryClient } from '@inventory/api-client';
import { inventoryForms } from '@inventory/api-client';
import { CommandForm } from '@/components/common/CommandForm';
import { FormSheet } from '@/components/common/FormSheet';
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
    <FormSheet
      title="Adjust stock"
      open={!!sku}
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      description="Post an auditable stock movement. Confirm the item, direction, unit and reason."
    >
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status">Loading stock…</p>}
      {form && item && (
        <fieldset disabled={busy}>
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
        </fieldset>
      )}
      {!busy && !error && !item && (
        <p>
          The selected item is not available in the current warehouse results. Refresh inventory and
          try again.
        </p>
      )}
    </FormSheet>
  );
}

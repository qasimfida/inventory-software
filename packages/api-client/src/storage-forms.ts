import { storageInputSchema } from '@inventory/contracts';
import type { CommandForm, CommandField } from './forms.js';
import type { createStorageClient } from './storage.js';
import type { createInventoryClient } from './inventory.js';
type Client = ReturnType<typeof createStorageClient>;
const text = (name: string, label: string, value = '', required = true): CommandField => ({
  name,
  label,
  kind: 'text',
  value,
  required,
});
export function storageForms(
  client: Client,
  data: Awaited<ReturnType<Client['load']>>,
  warehouseId: string,
): CommandForm[] {
  return [undefined, ...data.locations.filter((l) => l.type !== 'warehouse')].map((l) => ({
    title: l ? `Save location ${l.code}` : 'Create storage location',
    fields: [
      text('name', 'Location name', l?.name),
      text('code', 'Location code', l?.code),
      {
        name: 'parentId',
        label: 'Parent location',
        kind: 'select',
        value: l?.parentId ?? warehouseId,
        options: data.locations
          .filter((p) => p.id !== l?.id && p.state === 'active')
          .map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` })),
      },
      {
        name: 'type',
        label: 'Location type',
        kind: 'select',
        value: l?.type ?? 'bin',
        options: ['zone', 'aisle', 'rack', 'shelf', 'bin'].map((value) => ({
          value,
          label: value,
        })),
      },
      {
        name: 'state',
        label: 'Location status',
        kind: 'select',
        value: l?.state ?? 'active',
        options: ['active', 'inactive', 'archived'].map((value) => ({ value, label: value })),
      },
      text('capacity', 'Capacity (optional)', l?.capacity ?? '', false),
      text('capacityUnit', 'Capacity unit', l?.capacityUnit, false),
      text('notes', 'Location notes', l?.notes, false),
      text('photos', 'Photo HTTPS URLs (comma separated)', l?.photos.join(', '), false),
    ],
    submit: (v) =>
      client.save(
        storageInputSchema.parse({
          ...v,
          warehouseId,
          capacity: v.capacity || null,
          photos: String(v.photos ?? '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
        l?.id,
        l?.version,
      ),
  }));
}
export function storageMoveForm(
  client: Client,
  data: Awaited<ReturnType<Client['load']>>,
  stock: Awaited<ReturnType<ReturnType<typeof createInventoryClient>['load']>>,
  warehouseId: string,
): CommandForm {
  const options = data.locations
    .filter((l) => l.state === 'active')
    .map((l) => ({ value: l.id, label: `${l.code} · ${l.name}` }));
  return {
    title: 'Move stock between locations',
    fields: [
      { name: 'sourceId', label: 'Source storage location', kind: 'select', options },
      { name: 'destinationId', label: 'Destination storage location', kind: 'select', options },
      {
        name: 'variantId',
        label: 'Move item',
        kind: 'select',
        options: stock.items.map((i) => ({ value: i.id, label: i.sku })),
      },
      {
        name: 'unitId',
        label: 'Move unit',
        kind: 'select',
        options: stock.units.map((u) => ({ value: u.id, label: u.code })),
      },
      text('quantity', 'Move quantity', '1'),
      text('reason', 'Move reason'),
    ],
    submit: (v) =>
      client.move({
        warehouseId,
        sourceId: String(v.sourceId),
        destinationId: String(v.destinationId),
        variantId: String(v.variantId),
        unitId: String(v.unitId),
        quantity: String(v.quantity),
        reason: String(v.reason),
      }),
  };
}

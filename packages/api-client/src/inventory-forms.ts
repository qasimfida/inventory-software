import { movementInputSchema, reservationInputSchema } from '@inventory/contracts';
import type { CommandForm, CommandField } from './forms.js';
import type { createInventoryClient } from './inventory.js';
import { formText } from './forms.js';
type Client = ReturnType<typeof createInventoryClient>;
type Data = Awaited<ReturnType<Client['load']>>;
export function inventoryForms(client: Client, data: Data, warehouseId: string): CommandForm[] {
  const target: CommandField[] = [
    {
      name: 'variantId',
      label: 'Stock item',
      kind: 'select',
      options: data.items.map((i) => ({ value: i.id, label: `${i.sku} · ${i.name}` })),
    },
    {
      name: 'locationId',
      label: 'Stock location',
      kind: 'select',
      required: false,
      options: [
        { value: '', label: 'Warehouse root' },
        ...data.locations.map((l) => ({ value: l.id, label: `${l.code} · ${l.name}` })),
      ],
    },
    {
      name: 'unitId',
      label: 'Movement unit',
      kind: 'select',
      options: data.units.map((u) => ({ value: u.id, label: u.name })),
    },
    { name: 'quantity', label: 'Movement quantity', value: '1' },
    { name: 'reason', label: 'Reason / source reference' },
  ];
  const placeholder = '00000000-0000-4000-8000-000000000000';
  return [
    {
      title: 'Post stock movement',
      fields: [
        ...target,
        {
          name: 'type',
          label: 'Movement type',
          kind: 'select',
          options: [
            'opening',
            'receive',
            'sale',
            'return',
            'adjustment_in',
            'adjustment_out',
            'damage',
            'restore',
          ].map((t) => ({ value: t, label: t.replaceAll('_', ' ') })),
          value: 'receive',
        },
      ],
      submit: (v) => {
        const parsed = movementInputSchema.parse({
          ...v,
          warehouseId,
          locationId: v.locationId || null,
          idempotencyKey: placeholder,
        });
        const { idempotencyKey, ...input } = parsed;
        void idempotencyKey;
        return client.post(input);
      },
    },
    {
      title: 'Reserve stock',
      fields: target,
      submit: (v) => {
        const parsed = reservationInputSchema.parse({
          ...v,
          warehouseId,
          locationId: v.locationId || null,
          idempotencyKey: placeholder,
        });
        const { idempotencyKey, ...input } = parsed;
        void idempotencyKey;
        return client.reserve(input);
      },
    },
    {
      title: 'Release reservation',
      fields: [
        {
          name: 'id',
          label: 'Active reservation',
          kind: 'select',
          options: data.reservations.map((r) => ({
            value: r.id,
            label: `${data.items.find((i) => i.id === r.variantId)?.sku ?? r.variantId} · ${r.remaining}`,
          })),
        },
        { name: 'reason', label: 'Release reason' },
      ],
      submit: (v) => client.release(formText(v, 'id'), formText(v, 'reason')),
    },
    {
      title: 'Reverse movement',
      fields: [
        {
          name: 'id',
          label: 'Manual movement to reverse',
          kind: 'select',
          options: data.movements
            .filter((m) => m.sourceKind === 'manual' && !m.reversalOf)
            .map((m) => ({
              value: m.id,
              label: `${m.type} · ${data.items.find((i) => i.id === m.variantId)?.sku ?? m.variantId} · ${m.quantityDelta}`,
            })),
        },
        { name: 'reason', label: 'Reversal reason' },
      ],
      submit: (v) => client.reverse(formText(v, 'id'), formText(v, 'reason')),
    },
  ];
}

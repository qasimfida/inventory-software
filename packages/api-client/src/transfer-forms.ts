import type { Location } from '@inventory/contracts';
import { transferLineInputSchema } from '@inventory/contracts';
import type { createTransferClient } from './transfers.js';
import type { createInventoryClient } from './inventory.js';
import type { CommandForm, CommandField } from './forms.js';
type Client = ReturnType<typeof createTransferClient>;
const text = (name: string, label: string, value = '', required = true): CommandField => ({
  name,
  label,
  kind: 'text',
  value,
  required,
});
export function transferCreateForm(
  client: Client,
  stock: Awaited<ReturnType<ReturnType<typeof createInventoryClient>['load']>>,
  warehouses: Location[],
  warehouseId: string,
): CommandForm {
  return {
    title: 'Create transfer draft',
    fields: [
      text('reference', 'Transfer reference'),
      {
        name: 'destinationWarehouseId',
        label: 'Destination warehouse',
        kind: 'select',
        options: warehouses.map((w) => ({ value: w.id, label: w.name })),
      },
      {
        name: 'sourceLocationId',
        label: 'Source location',
        required: false,
        kind: 'select',
        options: [
          { value: '', label: 'Warehouse root' },
          ...stock.locations.map((l) => ({ value: l.id, label: l.code })),
        ],
      },
      text('destinationLocationId', 'Destination location ID (blank = root)', '', false),
      {
        name: 'variantId',
        label: 'Transfer item',
        kind: 'select',
        options: stock.items.map((i) => ({ value: i.id, label: i.sku })),
      },
      {
        name: 'unitId',
        label: 'Transfer unit',
        kind: 'select',
        options: stock.units.map((u) => ({ value: u.id, label: u.code })),
      },
      text('quantity', 'Transfer quantity', '1'),
    ],
    submit: (v) =>
      client.create({
        sourceWarehouseId: warehouseId,
        sourceLocationId: v.sourceLocationId ? String(v.sourceLocationId) : null,
        destinationWarehouseId: String(v.destinationWarehouseId),
        destinationLocationId: v.destinationLocationId ? String(v.destinationLocationId) : null,
        reference: String(v.reference),
        lines: [
          transferLineInputSchema.parse({
            variantId: v.variantId,
            unitId: v.unitId,
            quantity: v.quantity,
          }),
        ],
      }),
  };
}
export function transferDetailForms(
  client: Client,
  data: Awaited<ReturnType<Client['detail']>>,
): CommandForm[] {
  const t = data.transfer,
    forms: CommandForm[] = [];
  const actions =
    t.state === 'draft'
      ? (['approve', 'cancel'] as const)
      : t.state === 'approved'
        ? (['dispatch', 'cancel'] as const)
        : [];
  for (const action of actions)
    forms.push({
      title: `${action} transfer ${t.reference}`,
      fields: [text('reason', 'Transfer transition reason')],
      submit: (v) =>
        client.transition(t.id, { action, version: t.version, reason: String(v.reason) }),
    });
  if (['dispatched', 'partially_received'].includes(t.state))
    forms.push({
      title: 'Confirm destination receipt',
      fields: [
        {
          name: 'lineId',
          label: 'Transfer line (base units)',
          kind: 'select',
          options: data.lines.map((l) => ({
            value: l.id,
            label: `${l.variantId} · approved ${l.baseQuantity} · settled ${l.settled}`,
          })),
        },
        text('received', 'Good received (base units)', '0'),
        text('damaged', 'Damaged received (base units)', '0'),
        text('shortage', 'Confirmed shortage / loss (base units)', '0'),
        text('reason', 'Receipt / discrepancy reason'),
      ],
      submit: (v) =>
        client.receive(t.id, {
          lineId: String(v.lineId),
          received: String(v.received),
          damaged: String(v.damaged),
          shortage: String(v.shortage),
          reason: String(v.reason),
        }),
    });
  return forms;
}

export function transferAddLineForm(
  client: Client,
  stock: Awaited<ReturnType<ReturnType<typeof createInventoryClient>['load']>>,
  warehouses: Location[],
  data: Awaited<ReturnType<Client['detail']>>,
): CommandForm {
  const create = transferCreateForm(client, stock, warehouses, data.transfer.sourceWarehouseId);
  return {
    title: 'Add draft transfer line',
    fields: create.fields.filter((f) => ['variantId', 'unitId', 'quantity'].includes(f.name)),
    submit: (v) =>
      client.addLine(data.transfer.id, {
        ...transferLineInputSchema.parse(v),
        version: data.transfer.version,
      }),
  };
}

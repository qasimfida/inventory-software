import { hasPermission, stockReasonInputSchema, reorderInputSchema } from '@inventory/contracts';
import type { Business, StockPlanning } from '@inventory/contracts';
import type { CommandForm, CommandField } from './forms.js';
import { formText } from './forms.js';
import type { createStockPlanningClient } from './stock-planning.js';
import type { createInventoryClient } from './inventory.js';
type Stock = Awaited<ReturnType<ReturnType<typeof createInventoryClient>['load']>>;
export function stockPlanningForms(
  client: ReturnType<typeof createStockPlanningClient>,
  data: StockPlanning,
  stock: Stock,
  business: Business,
  warehouseId: string,
): CommandForm[] {
  const target: CommandField[] = [
    {
      name: 'variantId',
      label: 'Stock item',
      kind: 'select',
      options: stock.items.map((v) => ({ value: v.id, label: `${v.sku} · ${v.name}` })),
    },
    {
      name: 'locationId',
      label: 'Stock location',
      kind: 'select',
      required: false,
      options: [
        { value: '', label: 'Warehouse root' },
        ...stock.locations.map((l) => ({ value: l.id, label: l.name })),
      ],
    },
  ];
  const forms: CommandForm[] = [];
  if (hasPermission(business, 'stock.write')) {
    forms.push({
      title: 'Create order stock hold',
      fields: [
        ...target,
        {
          name: 'unitId',
          label: 'Unit',
          kind: 'select',
          options: stock.units.map((u) => ({ value: u.id, label: u.name })),
        },
        { name: 'quantity', label: 'Quantity to hold', value: '1' },
        { name: 'reference', label: 'Unique order reference' },
        {
          name: 'expiresInMinutes',
          label: 'Expires after minutes (1–1440)',
          kind: 'number',
          value: 30,
        },
        { name: 'reason', label: 'Hold reason' },
      ],
      submit: (v) =>
        client.hold({
          warehouseId,
          variantId: formText(v, 'variantId'),
          locationId: formText(v, 'locationId') || null,
          unitId: formText(v, 'unitId'),
          quantity: formText(v, 'quantity'),
          reference: formText(v, 'reference'),
          expiresInMinutes: Number(v.expiresInMinutes),
          reason: formText(v, 'reason'),
        }),
    });
    if (data.holds.some((h) => h.state === 'open'))
      forms.push({
        title: 'Cancel order stock hold',
        fields: [
          {
            name: 'id',
            label: 'Open order hold',
            kind: 'select',
            options: data.holds
              .filter((h) => h.state === 'open')
              .map((h) => ({ value: h.id, label: `${h.reference} · ${h.remaining}` })),
          },
          { name: 'reason', label: 'Cancellation reason' },
        ],
        submit: (v) => client.cancel(formText(v, 'id'), formText(v, 'reason')),
      });
  }
  if (
    hasPermission(business, 'business.write') &&
    !business.scope?.storeId &&
    !business.scope?.warehouseId
  ) {
    forms.push({
      title: 'Save reorder policy',
      fields: [
        ...target,
        { name: 'reorderPoint', label: 'Reorder point (base units)', value: '0' },
        { name: 'targetQuantity', label: 'Target quantity (base units)', value: '0' },
        { name: 'active', label: 'Policy active', kind: 'boolean', value: true },
      ],
      submit: (v) => {
        const variantId = formText(v, 'variantId'),
          locationId = formText(v, 'locationId') || warehouseId;
        const existing = data.reorders.find(
          (p) => p.variantId === variantId && p.locationId === locationId,
        );
        return client.reorder(
          reorderInputSchema.parse({
            ...v,
            warehouseId,
            locationId,
            version: existing?.version ?? 0,
          }),
        );
      },
    });
    const fields: CommandField[] = [
      { name: 'code', label: 'Custom code (lowercase / underscores)' },
      { name: 'label', label: 'Reason label' },
      {
        name: 'directions',
        label: 'Applicable directions',
        kind: 'select',
        options: [
          { value: 'in', label: 'Stock in' },
          { value: 'out', label: 'Stock out' },
          { value: 'in,out', label: 'Stock in and out' },
          { value: 'damage,restore', label: 'Damage and restore' },
          { value: 'in,out,damage,restore', label: 'All directions' },
        ],
      },
      { name: 'active', label: 'Reason active', kind: 'boolean', value: true },
    ];
    forms.push({
      title: 'Save custom reason code',
      fields,
      submit: (v) => {
        const code = formText(v, 'code');
        return client.reason(
          stockReasonInputSchema.parse({
            ...v,
            code,
            directions: formText(v, 'directions').split(','),
            version: data.reasons.find((r) => r.code === code)?.version ?? 0,
          }),
        );
      },
    });
  }
  return forms;
}

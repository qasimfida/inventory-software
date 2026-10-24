import { supplierInputSchema, purchaseLineInputSchema, currencySchema } from '@inventory/contracts';
import type { createPurchasingClient } from './purchasing.js';
import type { createInventoryClient } from './inventory.js';
import type { CommandForm, CommandField } from './forms.js';
type Client = ReturnType<typeof createPurchasingClient>;
type Workspace = Awaited<ReturnType<Client['load']>>;
type Detail = Awaited<ReturnType<Client['detail']>>;
const text = (name: string, label: string, value = '', required = true): CommandField => ({
  name,
  label,
  kind: 'text',
  value,
  required,
});
export function supplierForms(client: Client, data: Workspace): CommandForm[] {
  return [undefined, ...data.suppliers].map((s) => ({
    title: s ? `Save supplier ${s.code}` : 'Create supplier',
    fields: [
      text('name', 'Supplier name', s?.name),
      text('code', 'Supplier code', s?.code),
      text('email', 'Supplier email', s?.email, false),
      text('phone', 'Supplier phone', s?.phone, false),
      text('notes', 'Supplier notes', s?.notes, false),
      {
        name: 'state',
        label: 'Supplier status',
        kind: 'select',
        value: s?.state ?? 'active',
        options: ['active', 'inactive', 'archived'].map((value) => ({ value, label: value })),
      },
    ],
    submit: (v) => client.supplier(supplierInputSchema.parse(v), s?.id, s?.version),
  }));
}
export function purchaseCreateForm(
  client: Client,
  data: Workspace,
  stock: Awaited<ReturnType<ReturnType<typeof createInventoryClient>['load']>>,
  warehouseId: string,
): CommandForm {
  return {
    title: 'Create purchase order',
    fields: [
      text('reference', 'Purchase reference'),
      {
        name: 'supplierId',
        label: 'Supplier',
        kind: 'select',
        options: data.suppliers
          .filter((s) => s.state === 'active')
          .map((s) => ({ value: s.id, label: s.name })),
      },
      {
        name: 'currency',
        label: 'Purchase currency',
        kind: 'select',
        options: currencySchema.options.map((value) => ({ value, label: value })),
      },
      {
        name: 'variantId',
        label: 'Purchase item',
        kind: 'select',
        options: stock.items.map((i) => ({ value: i.id, label: i.sku })),
      },
      {
        name: 'unitId',
        label: 'Purchase unit',
        kind: 'select',
        options: stock.units.map((u) => ({ value: u.id, label: u.code })),
      },
      text('quantity', 'Order quantity', '1'),
      text('unitCost', 'Unit cost', '0'),
    ],
    submit: (v) =>
      client.create({
        warehouseId,
        supplierId: String(v.supplierId),
        reference: String(v.reference),
        currency: currencySchema.parse(v.currency),
        lines: [
          purchaseLineInputSchema.parse({
            variantId: v.variantId,
            unitId: v.unitId,
            quantity: v.quantity,
            unitCost: v.unitCost,
          }),
        ],
      }),
  };
}
export function purchaseDetailForms(client: Client, data: Detail): CommandForm[] {
  const order = data.order,
    forms: CommandForm[] = [];
  const actions =
    order.state === 'draft'
      ? ['approve', 'cancel']
      : order.state === 'approved'
        ? ['order', 'cancel']
        : ['ordered', 'partially_received'].includes(order.state)
          ? ['cancel']
          : [];
  for (const action of actions)
    forms.push({
      title: `${action} purchase ${order.reference}`,
      fields: [text('reason', 'Transition reason')],
      submit: (v) =>
        client.transition(order.id, {
          action: action as 'approve' | 'order' | 'cancel',
          version: order.version,
          reason: String(v.reason),
        }),
    });
  if (['ordered', 'partially_received'].includes(order.state))
    forms.push({
      title: 'Receive purchase delivery',
      fields: [
        {
          name: 'lineId',
          label: 'Purchase line',
          kind: 'select',
          options: data.lines.map((l) => ({
            value: l.id,
            label: `${l.variantId} · ordered ${l.quantity} · received ${l.received}`,
          })),
        },
        text('quantity', 'Delivery quantity', '1'),
        text('locationId', 'Storage location ID (blank = warehouse root)', '', false),
      ],
      submit: (v) =>
        client.receive(order.id, {
          lineId: String(v.lineId),
          quantity: String(v.quantity),
          locationId: v.locationId ? String(v.locationId) : null,
        }),
    });
  if (data.receipts.length)
    forms.push({
      title: 'Return received goods',
      fields: [
        {
          name: 'receiptId',
          label: 'Receipt',
          kind: 'select',
          options: data.receipts.map((r) => ({
            value: r.id,
            label: `${r.id} · received ${r.quantity} · returned ${r.returned}`,
          })),
        },
        text('quantity', 'Return quantity', '1'),
        text('damaged', 'Damaged quantity included in return', '0'),
        text('reason', 'Return reason'),
        text('creditReference', 'Supplier credit reference'),
      ],
      submit: (v) =>
        client.returnGoods(order.id, {
          receiptId: String(v.receiptId),
          quantity: String(v.quantity),
          damaged: String(v.damaged),
          reason: String(v.reason),
          creditReference: String(v.creditReference),
        }),
    });
  if (['ordered', 'partially_received', 'completed'].includes(order.state))
    forms.push({
      title: 'Record supplier invoice reference',
      fields: [
        text('reference', 'Invoice reference'),
        text('amountMinor', `Invoice amount in ${order.currency} minor units`),
        text('dueDate', 'Due date (YYYY-MM-DD)'),
      ],
      submit: (v) =>
        client.invoice(order.id, {
          reference: String(v.reference),
          amountMinor: String(v.amountMinor),
          dueDate: String(v.dueDate),
        }),
    });
  return forms;
}

export function purchaseAddLineForm(
  client: Client,
  data: Workspace,
  stock: Awaited<ReturnType<ReturnType<typeof createInventoryClient>['load']>>,
  detail: Detail,
): CommandForm {
  const create = purchaseCreateForm(client, data, stock, detail.order.warehouseId);
  return {
    title: 'Add draft purchase line',
    fields: create.fields.filter((f) =>
      ['variantId', 'unitId', 'quantity', 'unitCost'].includes(f.name),
    ),
    submit: (v) =>
      client.addLine(detail.order.id, {
        ...purchaseLineInputSchema.parse(v),
        version: detail.order.version,
      }),
  };
}

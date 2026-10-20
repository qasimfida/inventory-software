import type { CommandForm } from './forms.js';
import { formText as text } from './forms.js';
import { createPurchasingClient } from './purchasing.js';
import { createTransferClient } from './transfers.js';
import { createStorageClient } from './storage.js';
import type { OrganizationTransport } from './organization.js';
export async function warehouseForms(
  request: OrganizationTransport,
  key: () => string,
  businessId: string,
  context: {
    warehouseId: string;
    variantId: string;
    unitId: string;
    sourceId: string;
    destinationId: string;
    documentId: string;
    mode: string;
  },
): Promise<CommandForm[]> {
  const c = context,
    quantity = { name: 'quantity', label: 'Quantity in the selected unit', value: '1' },
    reason = { name: 'reason', label: 'Reason / receiving note', value: '' };
  if (c.mode === 'move') {
    const client = createStorageClient(request, key, businessId);
    return [
      {
        title: 'Confirm scanned location movement',
        fields: [quantity, reason],
        submit: (v) =>
          client.move({
            warehouseId: c.warehouseId,
            variantId: c.variantId,
            unitId: c.unitId,
            sourceId: c.sourceId,
            destinationId: c.destinationId,
            quantity: text(v, 'quantity'),
            reason: text(v, 'reason'),
          }),
      },
    ];
  }
  if (c.mode === 'purchase') {
    const client = createPurchasingClient(request, key, businessId),
      detail = await client.detail(c.documentId);
    if (detail.order.warehouseId !== c.warehouseId)
      throw new Error('Purchase belongs to another warehouse.');
    const lines = detail.lines.filter((l) => l.variantId === c.variantId && l.unitId === c.unitId);
    if (!lines.length)
      throw new Error(
        'Unexpected product or unit. Quarantine goods; ask purchasing to amend the order before receipt.',
      );
    return lines.map((l) => ({
      title: `Receive purchase line ${l.id} (ordered ${l.quantity}, received ${l.received})`,
      fields: [
        quantity,
        { name: 'damaged', label: 'Damaged quantity included in received quantity', value: '0' },
        reason,
      ],
      submit: (v) =>
        client.receive(c.documentId, {
          lineId: l.id,
          locationId: c.destinationId,
          quantity: text(v, 'quantity'),
          damaged: text(v, 'damaged'),
          damageReason: text(v, 'reason'),
        }),
    }));
  }
  const client = createTransferClient(request, key, businessId),
    detail = await client.detail(c.documentId),
    transfer = detail.transfer;
  if (c.mode === 'dispatch') {
    if (transfer.sourceWarehouseId !== c.warehouseId || transfer.sourceLocationId !== c.sourceId)
      throw new Error('Scan the transfer source warehouse and location.');
    return [
      {
        title: `Dispatch ALL approved transfer lines (${detail.lines.length})`,
        fields: [reason],
        submit: (v) =>
          client.transition(c.documentId, {
            action: 'dispatch',
            version: transfer.version,
            reason: text(v, 'reason'),
          }),
      },
    ];
  }
  if (
    transfer.destinationWarehouseId !== c.warehouseId ||
    transfer.destinationLocationId !== c.destinationId
  )
    throw new Error('Scan the transfer destination warehouse and location.');
  const lines = detail.lines.filter((l) => l.variantId === c.variantId && l.unitId === c.unitId);
  if (!lines.length) throw new Error('Unexpected product or unit for this transfer.');
  return lines.map((l) => ({
    title: `Receive transfer line ${l.id} (sent ${l.quantity}, settled ${l.settled})`,
    fields: [
      { name: 'received', label: 'Good quantity received', value: '0' },
      { name: 'damaged', label: 'Damaged quantity received', value: '0' },
      { name: 'shortage', label: 'Confirmed shortage', value: '0' },
      reason,
    ],
    submit: (v) =>
      client.receive(c.documentId, {
        lineId: l.id,
        received: text(v, 'received'),
        damaged: text(v, 'damaged'),
        shortage: text(v, 'shortage'),
        reason: text(v, 'reason'),
      }),
  }));
}

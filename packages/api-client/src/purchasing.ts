import type { PurchaseAddLine } from '@inventory/contracts';
import {
  purchaseWorkspaceSchema,
  purchaseDetailSchema,
  purchaseQuerySchema,
} from '@inventory/contracts';
import type {
  PurchaseInput,
  PurchaseQuery,
  PurchaseTransition,
  PurchaseReceive,
  PurchaseReturn,
  SupplierInput,
  SupplierInvoice,
} from '@inventory/contracts';
import type { OrganizationTransport } from './organization.js';
import { RetryableCommands } from './retryable-commands.js';
import { queryString } from './catalog.js';
export function createPurchasingClient(
  request: OrganizationTransport,
  newKey: () => string,
  businessId: string,
) {
  const path = `/${encodeURIComponent(businessId)}`,
    commands = new RetryableCommands(request, newKey),
    parse = (v: unknown) => purchaseDetailSchema.parse(v);
  return {
    addLine: (id: string, input: Omit<PurchaseAddLine, 'idempotencyKey'>) =>
      commands.run(`${path}/purchases/${encodeURIComponent(id)}/lines`, input, parse),
    load: async (q: Partial<PurchaseQuery>) =>
      purchaseWorkspaceSchema.parse(
        await request(`${path}/purchasing?${queryString(purchaseQuerySchema.parse(q))}`),
      ),
    detail: async (id: string) =>
      parse(await request(`${path}/purchases/${encodeURIComponent(id)}`)),
    supplier: (input: SupplierInput, id?: string, version?: number) =>
      request(`${path}/suppliers${id ? '/' + encodeURIComponent(id) : ''}`, id ? 'PATCH' : 'POST', {
        ...input,
        ...(id ? { version } : {}),
      }),
    create: (input: Omit<PurchaseInput, 'idempotencyKey'>) =>
      commands.run(`${path}/purchases`, input, parse),
    transition: (id: string, input: Omit<PurchaseTransition, 'idempotencyKey'>) =>
      commands.run(`${path}/purchases/${encodeURIComponent(id)}/transitions`, input, parse),
    receive: (
      id: string,
      input: Omit<PurchaseReceive, 'idempotencyKey' | 'damaged' | 'damageReason'> &
        Partial<Pick<PurchaseReceive, 'damaged' | 'damageReason'>>,
    ) => commands.run(`${path}/purchases/${encodeURIComponent(id)}/receipts`, input, parse),
    returnGoods: (id: string, input: Omit<PurchaseReturn, 'idempotencyKey'>) =>
      commands.run(`${path}/purchases/${encodeURIComponent(id)}/returns`, input, parse),
    invoice: (id: string, input: Omit<SupplierInvoice, 'idempotencyKey'>) =>
      commands.run(`${path}/purchases/${encodeURIComponent(id)}/invoices`, input, parse),
  };
}

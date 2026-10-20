import { Inject, Injectable } from '@nestjs/common';
import { LedgerCore } from '../inventory/ledger-core.js';
import type { OrganizationContext } from '../organization/organization.scope.js';
import { getTransfer } from './transfer.repository.js';
@Injectable()
export class TransferAccess {
  constructor(@Inject(LedgerCore) readonly ledger: LedgerCore) {}
  async get(ctx: OrganizationContext, id: string) {
    const transfer = await getTransfer(ctx, id);
    await this.ledger.warehouse(ctx, transfer.sourceWarehouseId);
    await this.ledger.warehouse(ctx, transfer.destinationWarehouseId);
    return transfer;
  }
}

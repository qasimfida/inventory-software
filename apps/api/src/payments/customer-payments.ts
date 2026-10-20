import { ConflictException, Inject, Injectable } from '@nestjs/common';
import type { CustomerPayment } from '@inventory/contracts';
import { OrganizationScope } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
import { CustomerAccess } from '../customers/customer-access.js';
import { ReceivableCore } from '../customers/receivable-core.js';
import { CashCore } from './cash-core.js';
import { idempotent } from '../database/idempotency.js';
@Injectable()
export class CustomerPayments {
  constructor(
    @Inject(CustomerAccess) private readonly customers: CustomerAccess,
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
    @Inject(ReceivableCore) private readonly receivables: ReceivableCore,
    @Inject(CashCore) private readonly cash: CashCore,
  ) {}
  collect(actor: Actor, b: string, id: string, input: CustomerPayment) {
    return this.scope.run(actor, b, 'payments.write', async (ctx) => {
      const receivable = await this.receivables.get(ctx, input.receivableId);
      if (receivable.customerId !== id) throw new ConflictException();
      return idempotent(
        ctx,
        'customer.payment',
        input.idempotencyKey,
        { ...input, id },
        async () => {
          if (BigInt(input.amountMinor) > BigInt(receivable.outstandingMinor))
            throw new ConflictException();
          const paymentId = await this.cash.record(ctx, {
            customerId: id,
            warehouseId: receivable.warehouseId,
            saleId: receivable.saleId,
            currency: receivable.currency,
            amountMinor: input.amountMinor,
            reference: input.reference,
          });
          await this.receivables.allocate(ctx, receivable.id, paymentId, input.amountMinor);
          await this.customers.touch(ctx, id);
          return { paymentId };
        },
      );
    });
  }
}

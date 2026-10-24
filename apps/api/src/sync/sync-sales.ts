import { ConflictException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { offlineQuote, decimal } from '@inventory/domain';
import { hasPermission, leaseSchema, offlinePolicySchema } from '@inventory/contracts';
import type { OfflineSale, OfflineLease } from '@inventory/contracts';
import type { OrganizationContext } from '../organization/organization.scope.js';
import { CheckoutService } from '../sales/checkout.service.js';
import { SalePricing } from '../sales/sale-pricing.js';
import { ShiftCore } from '../payments/shift-core.js';
import { LedgerCore } from '../inventory/ledger-core.js';
import { accessHash } from './sync-cursor.js';
@Injectable()
export class SyncSales {
  constructor(
    @Inject(CheckoutService) private readonly checkout: CheckoutService,
    @Inject(SalePricing) private readonly prices: SalePricing,
    @Inject(ShiftCore) private readonly shifts: ShiftCore,
    @Inject(LedgerCore) private readonly ledger: LedgerCore,
  ) {}
  async apply(ctx: OrganizationContext, input: OfflineSale, reconcile = false) {
    const row = (
      await ctx.tx.query<{
        actor_id: string;
        device_id: string;
        warehouse_id: string;
        shift_id: string;
        currency: string;
        access_hash: string;
        policy: unknown;
        snapshot: unknown;
        created_at: Date;
        expires_at: Date;
        revoked_at: Date | null;
      }>('SELECT * FROM offline_leases WHERE business_id=$1 AND id=$2', [
        ctx.business.id,
        input.leaseId,
      ])
    ).rows[0];
    if (!row || (!reconcile && row.actor_id !== ctx.actor.accountId))
      throw new ForbiddenException();
    const lease: OfflineLease = leaseSchema.parse({
      id: input.leaseId,
      businessId: ctx.business.id,
      actorId: row.actor_id,
      deviceId: row.device_id,
      warehouseId: row.warehouse_id,
      shiftId: row.shift_id,
      currency: row.currency,
      createdAt: row.created_at.toISOString(),
      expiresAt: row.expires_at.toISOString(),
      policy: row.policy,
      snapshot: row.snapshot,
    });
    const current = offlinePolicySchema.parse(
      (
        await ctx.tx.query('SELECT policy FROM offline_policies WHERE business_id=$1', [
          ctx.business.id,
        ])
      ).rows[0]?.policy ?? {},
    );
    if (
      !current.enabled ||
      (!reconcile &&
        (row.revoked_at !== null ||
          row.access_hash !== accessHash(ctx) ||
          current.version !== lease.policy.version ||
          Date.now() > row.expires_at.getTime() + 86400000))
    )
      throw new ConflictException();
    const occurred = Date.parse(input.occurredAt);
    if (
      occurred < row.created_at.getTime() ||
      occurred > row.expires_at.getTime() ||
      occurred > Date.now() + 60000
    )
      throw new ConflictException();
    const shift = await this.shifts.active(ctx, row.warehouse_id, row.currency);
    if (!reconcile && shift !== row.shift_id) throw new ConflictException();
    if (
      input.lines.some((l) => l.manualDiscountBasisPoints > 0) &&
      !hasPermission(ctx.business, 'products.write')
    )
      throw new ForbiddenException();
    const quote = (() => {
      try {
        return offlineQuote(lease, input.lines);
      } catch {
        throw new ConflictException();
      }
    })();
    if (
      quote.totalMinor !== input.totalMinor ||
      BigInt(input.cashReceivedMinor) < BigInt(input.totalMinor)
    )
      throw new ConflictException();
    const consumed = BigInt(
      (
        await ctx.tx.query<{ amount: string }>(
          "SELECT COALESCE(sum((payload->>'totalMinor')::numeric),0)::text AS amount FROM sync_operations WHERE business_id=$1 AND lease_id=$2 AND state='synced'",
          [ctx.business.id, lease.id],
        )
      ).rows[0]!.amount,
    );
    if (consumed + BigInt(input.totalMinor) > BigInt(lease.policy.maxLeaseMinor))
      throw new ConflictException();
    for (const l of input.lines) await this.ledger.catalog.active(ctx, l.variantId);
    if (current.pricePolicy === 'reject_changed') {
      const now = await this.prices.quote(ctx, {
        warehouseId: lease.warehouseId,
        customerId: null,
        lines: input.lines,
      });
      if (
        now.lines.some(
          (l, i) =>
            l.priceId !== quote.lines[i]!.priceId ||
            l.promotionId !== quote.lines[i]!.promotionId ||
            l.totalMinor !== quote.lines[i]!.totalMinor ||
            l.baseQuantity !== quote.lines[i]!.baseQuantity,
        )
      )
        throw new ConflictException();
    }
    // Globally available stock is authoritative even if the business permits online backorders.
    for (const item of lease.snapshot.items.filter((i) => i.trackInventory)) {
      const qty = quote.lines
        .filter((l) => l.variantId === item.id)
        .reduce((n, l) => n + decimal(l.baseQuantity), 0n);
      if (!qty) continue;
      const available =
        (
          await ctx.tx.query<{ available: string }>(
            'SELECT (on_hand-reserved-damaged)::text AS available FROM stock_balances WHERE business_id=$1 AND warehouse_id=$2 AND location_id=$2 AND variant_id=$3',
            [ctx.business.id, lease.warehouseId, item.id],
          )
        ).rows[0]?.available ?? '0';
      if (decimal(available) < qty) throw new ConflictException();
    }
    const receipt = await this.checkout.complete(
      ctx,
      {
        warehouseId: lease.warehouseId,
        customerId: null,
        lines: input.lines,
        quoteFingerprint: quote.quoteFingerprint,
        cashAppliedMinor: input.totalMinor,
        cashReceivedMinor: input.cashReceivedMinor,
        creditOverrideReason: '',
        idempotencyKey: input.id,
      },
      quote,
    );
    return { id: input.id, state: 'synced' as const, code: 'CONFIRMED', saleId: receipt.sale.id };
  }
}

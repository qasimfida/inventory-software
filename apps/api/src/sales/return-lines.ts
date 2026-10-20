import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { decimal, decimalString, roundRatio } from '@inventory/domain';
import type { SaleReturn } from '@inventory/contracts';
import type { OrganizationContext } from '../organization/organization.scope.js';
import { LedgerCore } from '../inventory/ledger-core.js';
interface OriginalLine {
  id: string;
  variantId: string;
  locationId: string;
  quantity: string;
  baseQuantity: string;
  net: string;
  tax: string;
  track: boolean;
  returned: string;
  returnedNet: string;
  returnedTax: string;
}
@Injectable()
export class ReturnLines {
  constructor(@Inject(LedgerCore) private readonly ledger: LedgerCore) {}
  async plan(ctx: OrganizationContext, saleId: string, input: SaleReturn) {
    const originals = (
      await ctx.tx.query<OriginalLine>(
        `SELECT l.id,l.variant_id AS "variantId",l.location_id AS "locationId",l.quantity::text,l.base_quantity::text AS "baseQuantity",l.net_minor::text AS net,l.tax_minor::text AS tax,l.track_inventory AS track,COALESCE((SELECT sum(r.quantity) FROM sale_return_lines r WHERE r.business_id=l.business_id AND r.sale_line_id=l.id),0)::text AS returned,COALESCE((SELECT sum(r.net_minor) FROM sale_return_lines r WHERE r.business_id=l.business_id AND r.sale_line_id=l.id),0)::text AS "returnedNet",COALESCE((SELECT sum(r.tax_minor) FROM sale_return_lines r WHERE r.business_id=l.business_id AND r.sale_line_id=l.id),0)::text AS "returnedTax" FROM sale_lines l WHERE l.business_id=$1 AND l.sale_id=$2`,
        [ctx.business.id, saleId],
      )
    ).rows;
    if (new Set(input.lines.map((l) => l.saleLineId)).size !== input.lines.length)
      throw new ConflictException();
    const lines = input.lines.map((item) => {
      const original = originals.find((l) => l.id === item.saleLineId);
      if (!original) throw new ConflictException();
      const qty = decimal(item.quantity),
        sold = decimal(original.quantity),
        cumulative = decimal(original.returned) + qty;
      if (cumulative > sold)
        throw new ConflictException('Return quantity exceeds remaining quantity.');
      const base = decimal(original.baseQuantity) * qty;
      if (base % sold !== 0n) throw new ConflictException('Return unit precision is unsupported.');
      return {
        ...item,
        id: randomUUID(),
        original,
        baseQuantity: decimalString(base / sold),
        net: roundRatio(BigInt(original.net) * cumulative, sold) - BigInt(original.returnedNet),
        tax: roundRatio(BigInt(original.tax) * cumulative, sold) - BigInt(original.returnedTax),
      };
    });
    const allReturned = originals.every(
      (l) =>
        decimal(l.returned) +
          (lines.find((i) => i.saleLineId === l.id)
            ? decimal(lines.find((i) => i.saleLineId === l.id)!.quantity)
            : 0n) ===
        decimal(l.quantity),
    );
    if (input.kind === 'void' && (!allReturned || originals.some((l) => decimal(l.returned) > 0n)))
      throw new ConflictException('Void requires the full original sale without prior returns.');
    return {
      lines,
      allReturned,
      net: lines.reduce((n, l) => n + l.net, 0n),
      tax: lines.reduce((n, l) => n + l.tax, 0n),
    };
  }
  async apply(
    ctx: OrganizationContext,
    returnId: string,
    warehouseId: string,
    plan: Awaited<ReturnType<ReturnLines['plan']>>,
    input: SaleReturn,
  ) {
    for (const line of plan.lines) {
      let movementId: string | null = null;
      if (line.original.track && line.disposition !== 'non_restockable')
        movementId = (
          await this.ledger.apply(ctx, {
            variantId: line.original.variantId,
            warehouseId,
            locationId: line.original.locationId,
            quantityDelta: line.baseQuantity,
            damagedDelta: line.disposition === 'damaged' ? line.baseQuantity : '0',
            type: 'return',
            sourceKind: 'sale_return',
            sourceId: line.id,
            commandId: input.idempotencyKey,
            reason: `${input.reasonCode}: return ${returnId}`,
          })
        ).id;
      await ctx.tx.query(
        'INSERT INTO sale_return_lines(id,business_id,return_id,sale_line_id,quantity,base_quantity,net_minor,tax_minor,disposition,movement_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
        [
          line.id,
          ctx.business.id,
          returnId,
          line.saleLineId,
          line.quantity,
          line.baseQuantity,
          line.net.toString(),
          line.tax.toString(),
          line.disposition,
          movementId,
        ],
      );
    }
  }
}

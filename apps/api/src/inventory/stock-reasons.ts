import { BadRequestException } from '@nestjs/common';
import { builtInStockReasons, stockReasonSchema } from '@inventory/contracts';
import type { OrganizationContext } from '../organization/organization.scope.js';
export async function stockReasons(ctx: OrganizationContext) {
  const custom = (
    await ctx.tx.query(
      'SELECT code,label,directions,active,version,false AS builtin FROM stock_reason_codes WHERE business_id=$1 ORDER BY code',
      [ctx.business.id],
    )
  ).rows;
  return [
    ...builtInStockReasons.map((r) => ({ ...r, active: true, builtin: true, version: 0 })),
    ...custom,
  ].map((r) => stockReasonSchema.parse(r));
}
export async function resolveStockReason(ctx: OrganizationContext, code: string, type: string) {
  const reason = (await stockReasons(ctx)).find((r) => r.code === code && r.active);
  const direction =
    type === 'damage'
      ? 'damage'
      : type === 'restore'
        ? 'restore'
        : ['sale', 'adjustment_out'].includes(type)
          ? 'out'
          : 'in';
  if (!reason || !reason.directions.includes(direction))
    throw new BadRequestException('Choose an active reason applicable to this movement direction.');
  return { reasonCode: reason.code, reasonLabel: reason.label };
}

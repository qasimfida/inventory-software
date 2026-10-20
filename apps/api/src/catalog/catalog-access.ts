import { BadRequestException, Injectable } from '@nestjs/common';
import { baseQuantity } from '@inventory/domain';
import type { OrganizationContext } from '../organization/organization.scope.js';
import { activeVariant, getVariant, conversion } from './variant.repository.js';
// Public read/rule interface for inventory and purchasing; only catalog repositories access catalog internals.
@Injectable()
export class CatalogAccess {
  variant(ctx: OrganizationContext, id: string) {
    return getVariant(ctx, id);
  }
  active(ctx: OrganizationContext, id: string) {
    return activeVariant(ctx, id);
  }
  async quantity(
    ctx: OrganizationContext,
    id: string,
    unitId: string,
    quantity: string,
    allowZero = false,
  ) {
    const factor = await conversion(ctx, id, unitId);
    try {
      return {
        quantity:
          allowZero && /^0(?:\.0+)?$/.test(quantity)
            ? '0'
            : baseQuantity(quantity, factor.numerator, factor.denominator),
        ...factor,
      };
    } catch {
      throw new BadRequestException();
    }
  }
}

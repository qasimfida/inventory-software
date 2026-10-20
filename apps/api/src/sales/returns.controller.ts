import { Body, Controller, Inject, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { saleReturnSchema } from '@inventory/contracts';
import type { SaleReturn } from '@inventory/contracts';
import type { AuthRequest } from '../auth/auth.http.js';
import { requestActor } from '../http/actor.js';
import { SchemaPipe } from '../http/schema.pipe.js';
import { SaleReturns } from './sale-returns.js';
@Controller('businesses/:businessId/sales')
export class ReturnsController {
  constructor(@Inject(SaleReturns) private readonly returns: SaleReturns) {}
  @Post(':id/returns') record(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(saleReturnSchema)) input: SaleReturn,
  ) {
    return this.returns.record(requestActor(r), b, id, input);
  }
}

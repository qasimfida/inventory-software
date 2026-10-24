import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  payableQuerySchema,
  payableHistoryQuerySchema,
  supplierCreditSchema,
  supplierSettlementSchema,
} from '@inventory/contracts';
import type { PayableQuery, SupplierCredit, SupplierSettlement } from '@inventory/contracts';
import type { AuthRequest } from '../auth/auth.http.js';
import { requestActor } from '../http/actor.js';
import { SchemaPipe } from '../http/schema.pipe.js';
import { PayableService } from './payable.service.js';

@Controller('businesses/:businessId/payables')
export class PayableController {
  constructor(@Inject(PayableService) private readonly service: PayableService) {}
  @Get()
  list(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Query(new SchemaPipe(payableQuerySchema)) q: PayableQuery,
  ) {
    return this.service.list(requestActor(r), b, q);
  }
  @Get(':id')
  detail(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query(new SchemaPipe(payableHistoryQuerySchema)) q: { offset: number },
  ) {
    return this.service.detail(requestActor(r), b, id, q.offset);
  }
  @Post(':id/settlements')
  settle(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(supplierSettlementSchema)) input: SupplierSettlement,
  ) {
    return this.service.settle(requestActor(r), b, id, input);
  }
  @Post(':id/credits')
  credit(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(supplierCreditSchema)) input: SupplierCredit,
  ) {
    return this.service.credit(requestActor(r), b, id, input);
  }
}

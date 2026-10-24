import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  staffInputSchema,
  staffUpdateSchema,
  costInputSchema,
  costPaymentSchema,
  operationQuerySchema,
} from '@inventory/contracts';
import type { StaffInput, CostInput, CostPayment } from '@inventory/contracts';
import type { AuthRequest } from '../auth/auth.http.js';
import { requestActor } from '../http/actor.js';
import { SchemaPipe } from '../http/schema.pipe.js';
import { OperationsService } from './operations.service.js';
@Controller('businesses/:businessId/operations')
export class OperationsController {
  constructor(@Inject(OperationsService) private readonly service: OperationsService) {}
  @Get() list(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Query(new SchemaPipe(operationQuerySchema)) q: { search: string; offset: number },
  ) {
    return this.service.list(requestActor(r), b, q);
  }
  @Post('staff') create(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(staffInputSchema)) input: StaffInput,
  ) {
    return this.service.save(requestActor(r), b, input);
  }
  @Patch('staff/:id') update(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(staffUpdateSchema)) input: StaffInput & { version: number },
  ) {
    return this.service.save(requestActor(r), b, input, id, input.version);
  }
  @Post('costs') cost(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(costInputSchema)) input: CostInput,
  ) {
    return this.service.cost(requestActor(r), b, input);
  }
  @Get('costs/:id') detail(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query(new SchemaPipe(operationQuerySchema)) q: { search: string; offset: number },
  ) {
    return this.service.detail(requestActor(r), b, id, q.offset);
  }
  @Post('costs/:id/payments') pay(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(costPaymentSchema)) input: CostPayment,
  ) {
    return this.service.pay(requestActor(r), b, id, input);
  }
}

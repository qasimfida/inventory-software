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
  shiftOpenSchema,
  shiftCloseSchema,
  shiftQuerySchema,
  cashAdjustmentSchema,
} from '@inventory/contracts';
import type { ShiftOpen, ShiftClose, ShiftQuery, CashAdjustment } from '@inventory/contracts';
import type { AuthRequest } from '../auth/auth.http.js';
import { requestActor } from '../http/actor.js';
import { SchemaPipe } from '../http/schema.pipe.js';
import { ShiftService } from './shift-service.js';
@Controller('businesses/:businessId/cash-shifts')
export class ShiftController {
  constructor(@Inject(ShiftService) private readonly service: ShiftService) {}
  @Get() list(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Query(new SchemaPipe(shiftQuerySchema)) q: ShiftQuery,
  ) {
    return this.service.list(requestActor(r), b, q);
  }
  @Post() open(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(shiftOpenSchema)) input: ShiftOpen,
  ) {
    return this.service.open(requestActor(r), b, input);
  }
  @Post(':id/close') close(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(shiftCloseSchema)) input: ShiftClose,
  ) {
    return this.service.close(requestActor(r), b, id, input);
  }
  @Post(':id/entries') adjust(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(cashAdjustmentSchema)) input: CashAdjustment,
  ) {
    return this.service.adjust(requestActor(r), b, id, input);
  }
}

import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import {
  stockQuerySchema,
  stockReasonInputSchema,
  reorderInputSchema,
  orderHoldInputSchema,
  stockCommandSchema,
} from '@inventory/contracts';
import type {
  StockQuery,
  StockReasonInput,
  ReorderInput,
  OrderHoldInput,
  StockCommand,
} from '@inventory/contracts';
import type { AuthRequest } from '../auth/auth.http.js';
import { requestActor } from '../http/actor.js';
import { SchemaPipe } from '../http/schema.pipe.js';
import { StockPlanningService } from './stock-planning.service.js';
import { StockHoldsService } from './stock-holds.service.js';
@Controller('businesses/:businessId/stock')
export class StockPlanningController {
  constructor(
    @Inject(StockPlanningService) private readonly planning: StockPlanningService,
    @Inject(StockHoldsService) private readonly holds: StockHoldsService,
  ) {}
  @Get('planning') read(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Query(new SchemaPipe(stockQuerySchema)) q: StockQuery,
  ) {
    return this.planning.read(requestActor(r), b, q);
  }
  @Put('reasons') reason(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(stockReasonInputSchema)) input: StockReasonInput,
  ) {
    return this.planning.reason(requestActor(r), b, input);
  }
  @Put('reorder') reorder(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(reorderInputSchema)) input: ReorderInput,
  ) {
    return this.planning.reorder(requestActor(r), b, input);
  }
  @Post('holds') hold(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(orderHoldInputSchema)) input: OrderHoldInput,
  ) {
    return this.holds.create(requestActor(r), b, input);
  }
  @Post('holds/:id/cancel') cancel(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(stockCommandSchema)) input: StockCommand,
  ) {
    return this.holds.cancel(requestActor(r), b, id, input);
  }
}

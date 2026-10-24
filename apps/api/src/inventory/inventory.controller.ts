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
  movementInputSchema,
  reservationInputSchema,
  stockCommandSchema,
  inventoryPolicySchema,
  stockQuerySchema,
} from '@inventory/contracts';
import type {
  MovementInput,
  ReservationInput,
  StockCommand,
  StockQuery,
} from '@inventory/contracts';
import { stockOverviewQuerySchema } from '@inventory/contracts';
import type { StockOverviewQuery } from '@inventory/contracts';
import type { AuthRequest } from '../auth/auth.http.js';
import { requestActor } from '../http/actor.js';
import { SchemaPipe } from '../http/schema.pipe.js';
import { InventoryService } from './inventory.service.js';
import { InventoryQueries } from './inventory-queries.js';
@Controller('businesses/:businessId')
export class InventoryController {
  constructor(
    @Inject(InventoryService) private readonly inventory: InventoryService,
    @Inject(InventoryQueries) private readonly queries: InventoryQueries,
  ) {}
  @Get('stock/overview') overview(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Query(new SchemaPipe(stockOverviewQuerySchema)) q: StockOverviewQuery,
  ) {
    return this.queries.overview(requestActor(r), b, q);
  }
  @Get('stock') read(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Query(new SchemaPipe(stockQuerySchema)) q: StockQuery,
  ) {
    return this.queries.workspace(requestActor(r), b, q);
  }
  @Get('warehouses/:id/reconciliation') reconcile(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.queries.reconcile(requestActor(r), b, id);
  }
  @Post('stock/movements') post(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(movementInputSchema)) input: MovementInput,
  ) {
    return this.inventory.post(requestActor(r), b, input);
  }
  @Post('stock/movements/:id/reverse') reverse(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(stockCommandSchema)) input: StockCommand,
  ) {
    return this.inventory.reverse(requestActor(r), b, id, input);
  }
  @Post('stock/reservations') reserve(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(reservationInputSchema)) input: ReservationInput,
  ) {
    return this.inventory.reserve(requestActor(r), b, input);
  }
  @Post('stock/reservations/:id/release') release(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(stockCommandSchema)) input: StockCommand,
  ) {
    return this.inventory.release(requestActor(r), b, id, input);
  }
  @Patch('stock/policy') policy(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(inventoryPolicySchema)) input: { allowNegative: boolean; version: number },
  ) {
    return this.inventory.policy(requestActor(r), b, input);
  }
}

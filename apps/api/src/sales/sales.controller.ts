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
import { cartSchema, checkoutSchema, saleQuerySchema } from '@inventory/contracts';
import type { Cart, Checkout, SaleQuery } from '@inventory/contracts';
import type { AuthRequest } from '../auth/auth.http.js';
import { requestActor } from '../http/actor.js';
import { SchemaPipe } from '../http/schema.pipe.js';
import { CheckoutService } from './checkout.service.js';
import { SaleQueries } from './sale-queries.js';
@Controller('businesses/:businessId')
export class SalesController {
  constructor(
    @Inject(CheckoutService) private readonly checkout: CheckoutService,
    @Inject(SaleQueries) private readonly queries: SaleQueries,
  ) {}
  @Get('pos/items') items(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Query(new SchemaPipe(saleQuerySchema)) q: SaleQuery,
  ) {
    return this.queries.items(requestActor(r), b, q);
  }
  @Get('sales') list(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Query(new SchemaPipe(saleQuerySchema)) q: SaleQuery,
  ) {
    return this.queries.page(requestActor(r), b, q);
  }
  @Get('sales/:id/receipt') receipt(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.queries.receipt(requestActor(r), b, id);
  }
  @Post('pos/quotes') quote(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(cartSchema)) input: Cart,
  ) {
    return this.checkout.preview(requestActor(r), b, input);
  }
  @Post('sales') complete(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(checkoutSchema)) input: Checkout,
  ) {
    return this.checkout.checkout(requestActor(r), b, input);
  }
}

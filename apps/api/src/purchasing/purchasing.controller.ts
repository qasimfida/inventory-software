import { purchaseAddLineSchema } from '@inventory/contracts';
import type { PurchaseAddLine } from '@inventory/contracts';
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
  purchaseQuerySchema,
  supplierInputSchema,
  supplierUpdateSchema,
  purchaseInputSchema,
  purchaseTransitionSchema,
  purchaseReceiveSchema,
  purchaseReturnSchema,
  supplierInvoiceSchema,
} from '@inventory/contracts';
import type {
  PurchaseQuery,
  SupplierInput,
  PurchaseInput,
  PurchaseTransition,
  PurchaseReceive,
  PurchaseReturn,
  SupplierInvoice,
} from '@inventory/contracts';
import type { AuthRequest } from '../auth/auth.http.js';
import { requestActor } from '../http/actor.js';
import { SchemaPipe } from '../http/schema.pipe.js';
import { PurchasingService } from './purchasing.service.js';
import { PurchaseReceiving } from './purchase-receiving.js';
import { PurchaseQueries } from './purchase-queries.js';
@Controller('businesses/:businessId')
export class PurchasingController {
  constructor(
    @Inject(PurchasingService) private readonly service: PurchasingService,
    @Inject(PurchaseReceiving) private readonly receiving: PurchaseReceiving,
    @Inject(PurchaseQueries) private readonly queries: PurchaseQueries,
  ) {}
  @Post('purchases/:id/lines') addLine(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(purchaseAddLineSchema)) input: PurchaseAddLine,
  ) {
    return this.service.addLine(requestActor(r), b, id, input);
  }
  @Get('purchasing') route0(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Query(new SchemaPipe(purchaseQuerySchema)) input: PurchaseQuery,
  ) {
    return this.queries.workspace(requestActor(r), b, input);
  }
  @Get('purchases/:id') route1(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.queries.detail(requestActor(r), b, id);
  }
  @Post('suppliers') route2(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(supplierInputSchema)) input: SupplierInput,
  ) {
    return this.service.supplier(requestActor(r), b, input);
  }
  @Patch('suppliers/:id') route3(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(supplierUpdateSchema)) input: SupplierInput & { version: number },
  ) {
    return this.service.supplier(requestActor(r), b, input, id, input.version);
  }
  @Post('purchases') route4(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(purchaseInputSchema)) input: PurchaseInput,
  ) {
    return this.service.create(requestActor(r), b, input);
  }
  @Post('purchases/:id/transitions') route5(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(purchaseTransitionSchema)) input: PurchaseTransition,
  ) {
    return this.service.transition(requestActor(r), b, id, input);
  }
  @Post('purchases/:id/receipts') route6(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(purchaseReceiveSchema)) input: PurchaseReceive,
  ) {
    return this.receiving.receive(requestActor(r), b, id, input);
  }
  @Post('purchases/:id/returns') route7(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(purchaseReturnSchema)) input: PurchaseReturn,
  ) {
    return this.receiving.returnGoods(requestActor(r), b, id, input);
  }
  @Post('purchases/:id/invoices') route8(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(supplierInvoiceSchema)) input: SupplierInvoice,
  ) {
    return this.receiving.invoice(requestActor(r), b, id, input);
  }
}

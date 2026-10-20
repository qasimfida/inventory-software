import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  unitInputSchema,
  variantInputSchema,
  variantEditSchema,
  conversionSchema,
  priceInputSchema,
  promotionInputSchema,
  quoteInputSchema,
} from '@inventory/contracts';
import type {
  UnitInput,
  VariantInput,
  VariantEdit,
  Conversion,
  PriceInput,
  PromotionInput,
  QuoteInput,
} from '@inventory/contracts';
import type { AuthRequest } from '../auth/auth.http.js';
import { requestActor } from '../http/actor.js';
import { SchemaPipe } from '../http/schema.pipe.js';
import { VariantService } from './variant.service.js';
import { PricingService } from './pricing.service.js';
@Controller('businesses/:businessId')
export class PricingController {
  constructor(
    @Inject(VariantService) private readonly variants: VariantService,
    @Inject(PricingService) private readonly pricing: PricingService,
  ) {}
  @Get('products/:id/pricing') workspace(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.pricing.workspace(requestActor(r), b, id);
  }
  @Post('units') unit(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(unitInputSchema)) input: UnitInput,
  ) {
    return this.variants.unit(requestActor(r), b, input);
  }
  @Post('products/:id/variants') create(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(variantInputSchema)) input: VariantInput,
  ) {
    return this.variants.create(requestActor(r), b, id, input);
  }
  @Patch('variants/:id') edit(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(variantEditSchema)) input: VariantEdit,
  ) {
    return this.variants.edit(requestActor(r), b, id, input);
  }
  @Post('variants/:id/conversions') convert(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(conversionSchema)) input: Conversion,
  ) {
    return this.variants.addConversion(requestActor(r), b, id, input);
  }
  @Post('prices') price(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(priceInputSchema)) input: PriceInput,
  ) {
    return this.pricing.price(requestActor(r), b, input);
  }
  @Post('promotions') promotion(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(promotionInputSchema)) input: PromotionInput,
  ) {
    return this.pricing.promotion(requestActor(r), b, input);
  }
  @Post('promotions/:id/withdraw')
  withdraw(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.pricing.withdraw(requestActor(r), b, id);
  }
  @Post('price-quotes') quote(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(quoteInputSchema)) input: QuoteInput,
  ) {
    return this.pricing.quote(requestActor(r), b, input);
  }
}

import {
  Body,
  Controller,
  Get,
  Put,
  Post,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  Inject,
  Header,
} from '@nestjs/common';
import {
  storefrontSettingsSchema,
  listingInputSchema,
  listingCommandSchema,
  storefrontPageSchema,
} from '@inventory/contracts';
import type { z } from 'zod';
import type { AuthRequest } from '../auth/auth.http.js';
import { PublicRoute } from '../auth/auth.http.js';
import { requestActor } from '../http/actor.js';
import { SchemaPipe } from '../http/schema.pipe.js';
import { StorefrontService } from './storefront.service.js';
import { StorefrontPublic } from './storefront-public.js';
@Controller()
export class StorefrontController {
  constructor(
    @Inject(StorefrontService) private service: StorefrontService,
    @Inject(StorefrontPublic) private publication: StorefrontPublic,
  ) {}
  @Get('businesses/:businessId/storefront') read(
    @Req() req: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
  ) {
    return this.service.read(requestActor(req), b);
  }
  @Put('businesses/:businessId/storefront') save(
    @Req() req: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(storefrontSettingsSchema)) input: z.infer<typeof storefrontSettingsSchema>,
  ) {
    return this.service.save(requestActor(req), b, input);
  }
  @Put('businesses/:businessId/storefront/listings') select(
    @Req() req: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(listingInputSchema)) input: z.infer<typeof listingInputSchema>,
  ) {
    return this.service.select(requestActor(req), b, input);
  }
  @Post('businesses/:businessId/storefront/listings/:id') command(
    @Req() req: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(listingCommandSchema)) input: z.infer<typeof listingCommandSchema>,
  ) {
    return this.service.command(requestActor(req), b, id, input);
  }
  @PublicRoute('storefront')
  @Header('Cache-Control', 'no-store, max-age=0')
  @Header('X-Robots-Tag', 'noindex')
  @Get('public/storefronts/:slug')
  publicRead(
    @Param('slug') slug: string,
    @Query(new SchemaPipe(storefrontPageSchema)) page: z.infer<typeof storefrontPageSchema>,
  ) {
    return this.publication.read(slug, page);
  }
}

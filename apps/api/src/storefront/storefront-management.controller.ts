import { onlinePickerQuerySchema } from '@inventory/contracts';
import type { OnlinePickerQuery } from '@inventory/contracts';
import {
  Controller,
  Header,
  Inject,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
} from '@nestjs/common';
import { z } from 'zod';
import {
  onlineCommandSchema,
  listingQuerySchema,
  storefrontSlugSchema,
  storefrontHostSchema,
  onlineImageRequestSchema,
} from '@inventory/contracts';
import type { OnlineCommand, ListingQuery } from '@inventory/contracts';
import type { AuthRequest } from '../auth/auth.http.js';
import { requestActor } from '../http/actor.js';
import { SchemaPipe } from '../http/schema.pipe.js';
import { StorefrontManagementService } from './storefront-management.service.js';
const paramsSchema = z.object({ businessId: z.uuid(), storeId: z.uuid() });
type Scope = z.infer<typeof paramsSchema>;
@Controller('businesses/:businessId/stores/:storeId/online-store')
export class StorefrontManagementController {
  constructor(@Inject(StorefrontManagementService) private service: StorefrontManagementService) {}
  @Get('product-list') productList(
    @Req() req: AuthRequest,
    @Param(new SchemaPipe(paramsSchema)) p: Scope,
    @Query(new SchemaPipe(listingQuerySchema)) q: ListingQuery,
  ) {
    return this.service.productPage(requestActor(req), p.businessId, p.storeId, q);
  }
  @Get('products') products(
    @Req() req: AuthRequest,
    @Param(new SchemaPipe(paramsSchema)) p: Scope,
    @Query(new SchemaPipe(onlinePickerQuerySchema)) q: OnlinePickerQuery,
  ) {
    return this.service.picker(requestActor(req), p.businessId, p.storeId, q);
  }
  @Get('listings/:id') detail(
    @Req() req: AuthRequest,
    @Param(new SchemaPipe(paramsSchema)) p: Scope,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.detail(requestActor(req), p.businessId, p.storeId, id);
  }
  @Get('settings') settings(
    @Req() req: AuthRequest,
    @Param(new SchemaPipe(paramsSchema)) p: Scope,
  ) {
    return this.service.read(requestActor(req), p.businessId, p.storeId, 'settings');
  }
  @Get('overview') overview(
    @Req() req: AuthRequest,
    @Param(new SchemaPipe(paramsSchema)) p: Scope,
  ) {
    return this.service.read(requestActor(req), p.businessId, p.storeId, 'overview');
  }
  @Get('listings') listings(
    @Req() req: AuthRequest,
    @Param(new SchemaPipe(paramsSchema)) p: Scope,
    @Query(new SchemaPipe(listingQuerySchema)) q: ListingQuery,
  ) {
    return this.service.read(requestActor(req), p.businessId, p.storeId, 'listings', q);
  }
  @Get('check-slug') slug(
    @Req() req: AuthRequest,
    @Param(new SchemaPipe(paramsSchema)) p: Scope,
    @Query('slug', new SchemaPipe(storefrontSlugSchema)) slug: string,
  ) {
    return this.service.read(requestActor(req), p.businessId, p.storeId, 'slug', undefined, slug);
  }
  @Get('image-host-impact') host(
    @Req() req: AuthRequest,
    @Param(new SchemaPipe(paramsSchema)) p: Scope,
    @Query('host', new SchemaPipe(storefrontHostSchema)) host: string,
  ) {
    return this.service.read(requestActor(req), p.businessId, p.storeId, 'host', undefined, host);
  }
  @Get('listings/:id/history') history(
    @Req() req: AuthRequest,
    @Param(new SchemaPipe(paramsSchema)) p: Scope,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.read(requestActor(req), p.businessId, p.storeId, 'history', undefined, id);
  }
  @Header('Cache-Control', 'no-store, max-age=0')
  @Post('image-preview')
  image(
    @Req() req: AuthRequest,
    @Param(new SchemaPipe(paramsSchema)) p: Scope,
    @Body(new SchemaPipe(onlineImageRequestSchema)) body: z.infer<typeof onlineImageRequestSchema>,
  ) {
    return this.service.image(requestActor(req), p.businessId, p.storeId, body.url);
  }
  @Post('commands') command(
    @Req() req: AuthRequest,
    @Param(new SchemaPipe(paramsSchema)) p: Scope,
    @Body(new SchemaPipe(onlineCommandSchema)) input: OnlineCommand,
  ) {
    return this.service.command(requestActor(req), p.businessId, p.storeId, input);
  }
}

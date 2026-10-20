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
  catalogQuerySchema,
  createProductSchema,
  editProductSchema,
  categoryInputSchema,
  categoryEditSchema,
} from '@inventory/contracts';
import type {
  CatalogQuery,
  ProductInput,
  ProductEdit,
  CategoryInput,
  CategoryEdit,
} from '@inventory/contracts';
import type { AuthRequest } from '../auth/auth.http.js';
import { requestActor } from '../http/actor.js';
import { SchemaPipe } from '../http/schema.pipe.js';
import { ProductService } from './product.service.js';
import { CategoryService } from './category.service.js';
@Controller('businesses/:businessId')
export class CatalogController {
  constructor(
    @Inject(ProductService) private readonly products: ProductService,
    @Inject(CategoryService) private readonly categories: CategoryService,
  ) {}
  @Get('products') list(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Query(new SchemaPipe(catalogQuerySchema)) q: CatalogQuery,
  ) {
    return this.products.list(requestActor(r), b, q);
  }
  @Get('products/:id') get(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.products.get(requestActor(r), b, id);
  }
  @Post('products') create(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(createProductSchema)) input: ProductInput,
  ) {
    return this.products.create(requestActor(r), b, input);
  }
  @Patch('products/:id') edit(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(editProductSchema)) input: ProductEdit,
  ) {
    return this.products.edit(requestActor(r), b, id, input);
  }
  @Get('categories') listCategories(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
  ) {
    return this.categories.list(requestActor(r), b);
  }
  @Post('categories') createCategory(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(categoryInputSchema)) input: CategoryInput,
  ) {
    return this.categories.create(requestActor(r), b, input);
  }
  @Patch('categories/:id') editCategory(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(categoryEditSchema)) input: CategoryEdit,
  ) {
    return this.categories.edit(requestActor(r), b, id, input);
  }
}

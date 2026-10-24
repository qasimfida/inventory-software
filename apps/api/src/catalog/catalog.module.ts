import { CatalogSearch } from './catalog-search.js';
import { CustomerPrices } from './customer-prices.js';
import { CustomerModule } from '../customers/customer.module.js';
import { CatalogAccess } from './catalog-access.js';
import { PricingController } from './pricing.controller.js';
import { VariantService } from './variant.service.js';
import { PricingService } from './pricing.service.js';
import { Module } from '@nestjs/common';
import { OrganizationModule } from '../organization/organization.module.js';
import { CatalogController } from './catalog.controller.js';
import { ProductService } from './product.service.js';
import { CategoryService } from './category.service.js';
@Module({
  imports: [OrganizationModule, CustomerModule],
  controllers: [CatalogController, PricingController, CustomerPrices],
  providers: [
    CatalogSearch,
    ProductService,
    CategoryService,
    VariantService,
    PricingService,
    CatalogAccess,
  ],
  exports: [ProductService, PricingService, CatalogAccess, CatalogSearch],
})
export class CatalogModule {}

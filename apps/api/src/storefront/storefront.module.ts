import { StorefrontManagementController } from './storefront-management.controller.js';
import { StorefrontManagementService } from './storefront-management.service.js';
import { RateLimitService } from '../auth/rate-limit.service.js';
import { ConfigurationModule } from '../config/configuration.module.js';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { OrganizationModule } from '../organization/organization.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { StorefrontController } from './storefront.controller.js';
import { StorefrontService } from './storefront.service.js';
import { StorefrontProjection } from './storefront-projection.js';
import { StorefrontPublic } from './storefront-public.js';
import { StorefrontWorker } from './storefront-worker.js';
@Module({
  imports: [ConfigurationModule, DatabaseModule, OrganizationModule, CatalogModule],
  controllers: [StorefrontController, StorefrontManagementController],
  providers: [
    StorefrontManagementService,
    RateLimitService,
    StorefrontService,
    StorefrontProjection,
    StorefrontPublic,
    StorefrontWorker,
  ],
})
export class StorefrontModule {}

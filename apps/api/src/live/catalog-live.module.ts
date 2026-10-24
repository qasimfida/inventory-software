import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { ConfigurationModule } from '../config/configuration.module.js';
import { OrganizationModule } from '../organization/organization.module.js';
import { CatalogLiveAccess } from './catalog-live-access.js';
import { CatalogLiveService } from './catalog-live.service.js';
import { CatalogLiveController } from './catalog-live.controller.js';
@Module({
  imports: [DatabaseModule, ConfigurationModule, OrganizationModule],
  providers: [CatalogLiveAccess, CatalogLiveService],
  controllers: [CatalogLiveController],
  exports: [CatalogLiveService],
})
export class CatalogLiveModule {}

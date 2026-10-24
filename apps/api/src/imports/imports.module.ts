import { Module } from '@nestjs/common';
import { OrganizationModule } from '../organization/organization.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { ImportsController } from './imports.controller.js';
@Module({
  imports: [OrganizationModule, CatalogModule, InventoryModule],
  controllers: [ImportsController],
})
export class ImportsModule {}

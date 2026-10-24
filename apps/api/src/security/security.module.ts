import { PlatformBusinessesController } from './platform-businesses.controller.js';
import { PlatformOverviewController } from './platform-overview.controller.js';
import { ProductionGuard } from './production-guard.js';
import { ConfigurationModule } from '../config/configuration.module.js';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { OrganizationModule } from '../organization/organization.module.js';
import { SecurityService } from './security.service.js';
import { SecurityController } from './security.controller.js';
import { NotificationWorker } from './notification-worker.js';
@Module({
  imports: [DatabaseModule, OrganizationModule, ConfigurationModule],
  providers: [SecurityService, NotificationWorker, ProductionGuard],
  controllers: [SecurityController, PlatformOverviewController, PlatformBusinessesController],
})
export class SecurityModule {}

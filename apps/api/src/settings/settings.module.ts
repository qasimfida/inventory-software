import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { OrganizationModule } from '../organization/organization.module.js';
import { SettingsService } from './settings.service.js';
import { SettingsController } from './settings.controller.js';
@Module({
  imports: [DatabaseModule, OrganizationModule],
  providers: [SettingsService],
  controllers: [SettingsController],
})
export class SettingsModule {}

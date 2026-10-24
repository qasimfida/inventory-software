import { Module } from '@nestjs/common';
import { OrganizationModule } from '../organization/organization.module.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationsController } from './notifications.controller.js';
@Module({
  imports: [OrganizationModule],
  providers: [NotificationsService],
  controllers: [NotificationsController],
})
export class NotificationsModule {}

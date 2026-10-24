import { Module } from '@nestjs/common';
import { OrganizationModule } from '../organization/organization.module.js';
import { ReportsService } from './reports.service.js';
import { ReportsController } from './reports.controller.js';
import { DashboardService } from './dashboard.service.js';
@Module({
  imports: [OrganizationModule],
  providers: [ReportsService, DashboardService],
  controllers: [ReportsController],
})
export class ReportsModule {}

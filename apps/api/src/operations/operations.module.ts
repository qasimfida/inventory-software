import { Module } from '@nestjs/common';
import { OrganizationModule } from '../organization/organization.module.js';
import { OperationsController } from './operations.controller.js';
import { OperationsService } from './operations.service.js';
@Module({
  imports: [OrganizationModule],
  controllers: [OperationsController],
  providers: [OperationsService],
})
export class OperationsModule {}

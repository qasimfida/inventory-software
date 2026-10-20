import { LocationAccess } from './location-access.js';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { OrganizationController } from './organization.controller.js';
import { OrganizationScope } from './organization.scope.js';
import { BusinessService } from './business.service.js';
import { LocationService } from './location.service.js';
import { MembershipService } from './membership.service.js';
@Module({
  imports: [DatabaseModule],
  exports: [OrganizationScope, LocationAccess],
  controllers: [OrganizationController],
  providers: [
    LocationAccess,
    OrganizationScope,
    BusinessService,
    LocationService,
    MembershipService,
  ],
})
export class OrganizationModule {}

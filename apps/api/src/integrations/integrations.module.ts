import { Module } from '@nestjs/common';
import { OrganizationModule } from '../organization/organization.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { AiModule } from '../ai/ai.module.js';
import { RateLimitService } from '../auth/rate-limit.service.js';
import { IntegrationsController } from './integrations.controller.js';
@Module({
  imports: [OrganizationModule, DatabaseModule, AiModule],
  controllers: [IntegrationsController],
  providers: [RateLimitService],
})
export class IntegrationsModule {}

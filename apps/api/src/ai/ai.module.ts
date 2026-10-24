import { Inject, Module } from '@nestjs/common';
import { ConfigurationModule } from '../config/configuration.module.js';
import { ENVIRONMENT } from '../config/environment.js';
import type { Environment } from '../config/environment.js';
import { OrganizationModule } from '../organization/organization.module.js';
import { AI_PROVIDER, AiService } from './ai.service.js';

@Module({
  imports: [ConfigurationModule, OrganizationModule],
  providers: [{ provide: AI_PROVIDER, useValue: null }, AiService],
  exports: [AiService],
})
export class AiModule {
  constructor(@Inject(ENVIRONMENT) environment: Environment) {
    if (environment.ai.AI_PROVIDER !== 'disabled')
      throw new Error('No AI provider adapter is installed. Keep AI_PROVIDER disabled.');
  }
}

import {
  Body,
  Controller,
  Get,
  HttpException,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { assistantInputSchema } from '@inventory/contracts';
import type { AuthRequest } from '../auth/auth.http.js';
import { requestActor } from '../http/actor.js';
import { SchemaPipe } from '../http/schema.pipe.js';
import { OrganizationScope } from '../organization/organization.scope.js';
import { AiService } from '../ai/ai.service.js';
import { AiFailure } from '../ai/provider.js';
import { allowedSections } from '../ai/context.js';
import { RateLimitService } from '../auth/rate-limit.service.js';
@Controller('businesses/:businessId/integrations')
export class IntegrationsController {
  constructor(
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
    @Inject(AiService) private readonly ai: AiService,
    @Inject(RateLimitService) private readonly limits: RateLimitService,
  ) {}
  @Get() status(@Req() req: AuthRequest, @Param('businessId', new ParseUUIDPipe()) b: string) {
    return this.scope.run(requestActor(req), b, 'business.read', async (ctx) => ({
      services: [
        {
          id: 'payments',
          state: 'local',
          detail: 'Cash only. No external payment provider is enabled.',
        },
        {
          id: 'notifications',
          state: 'local',
          detail: 'Durable in-app delivery. Email, SMS and push providers are not configured.',
        },
        {
          id: 'ai',
          state: this.ai.enabled ? 'enabled' : 'unconfigured',
          detail: this.ai.enabled
            ? 'Navigation help only; no record retrieval or actions.'
            : 'No AI provider adapter is installed. Navigation guidance below works without AI.',
        },
      ],
      navigation: allowedSections(ctx.business),
    }));
  }
  @Post('assistant') async help(
    @Req() req: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Body(new SchemaPipe(assistantInputSchema)) input: { question: string },
  ) {
    const actor = requestActor(req);
    await this.scope.run(actor, b, 'business.read', async () => undefined);
    // Shared database limits survive restarts and apply across API instances.
    await this.limits.consume(`ai-account:${actor.accountId}`, 20);
    await this.limits.consume(`ai-business:${b}`, 100);
    try {
      return await this.ai.explainNavigation(actor, b, input);
    } catch (error) {
      if (!(error instanceof AiFailure)) throw error;
      throw new HttpException(
        'Assistant unavailable.',
        error.code === 'AI_INVALID_INPUT'
          ? 400
          : error.code === 'AI_RATE_LIMITED' || error.code === 'AI_BUSY'
            ? 429
            : 503,
      );
    }
  }
}

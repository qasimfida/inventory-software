import { Inject, Injectable } from '@nestjs/common';
import { ENVIRONMENT } from '../config/environment.js';
import type { Environment } from '../config/environment.js';
import { OrganizationScope } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
import { SafeLogger } from '../logging/safe-logger.js';
import { allowedSections } from './context.js';
import { helpInput, navigationHelp } from './templates.js';
import { AiFailure } from './provider.js';
import type { AiProvider } from './provider.js';
import { executeProvider } from './execution.js';
export const AI_PROVIDER = Symbol('AI_PROVIDER');

@Injectable()
export class AiService {
  private inFlight = 0;
  private readonly logger = new SafeLogger();
  constructor(
    @Inject(ENVIRONMENT) private readonly environment: Environment,
    @Inject(OrganizationScope) private readonly scope: Pick<OrganizationScope, 'run'>,
    @Inject(AI_PROVIDER) private readonly provider: AiProvider | null,
  ) {}
  get enabled() {
    return this.environment.ai.AI_PROVIDER !== 'disabled' && this.provider !== null;
  }

  // Navigation-only boundary: no record retrieval, tool execution or mutations.
  // The caller must supply a backend-authenticated Actor, never a request-body identity.
  async explainNavigation(actor: Actor, businessId: string, input: unknown) {
    const parsed = helpInput.safeParse(input);
    if (!parsed.success) throw new AiFailure('AI_INVALID_INPUT');
    const sections = await this.scope.run(actor, businessId, 'business.read', async (ctx) =>
      allowedSections(ctx.business),
    );
    if (!this.enabled || !this.provider) throw new AiFailure('AI_DISABLED');
    if (this.inFlight >= 2) throw new AiFailure('AI_BUSY', true);
    this.inFlight++;
    const started = Date.now();
    const metadata = {
      event: 'ai.request',
      requestId: actor.requestId,
      provider: this.provider.id,
      model: this.environment.ai.AI_MODEL,
      operation: navigationHelp.id,
    };
    try {
      const result = await executeProvider(
        this.provider,
        {
          model: this.environment.ai.AI_MODEL!,
          system: navigationHelp.system,
          untrustedInput: { question: parsed.data.question, allowedSections: sections },
          maxOutputTokens: this.environment.ai.AI_MAX_OUTPUT_TOKENS,
        },
        this.environment.ai,
      );
      // A provider call does not hold DB locks. Reauthorize after the network boundary.
      await this.scope.run(actor, businessId, 'business.read', async (ctx) => {
        if (JSON.stringify(allowedSections(ctx.business)) !== JSON.stringify(sections))
          throw new AiFailure('AI_INVALID_OUTPUT');
      });
      this.logger.log({
        ...metadata,
        outcome: 'ok',
        latencyMs: Date.now() - started,
        usage: result.usage
          ? { inputUnits: result.usage.inputTokens, outputUnits: result.usage.outputTokens }
          : undefined,
      });
      return result.output;
    } catch (error) {
      this.logger.warn({
        ...metadata,
        outcome: error instanceof AiFailure ? error.code : 'access_denied',
        latencyMs: Date.now() - started,
      });
      throw error;
    } finally {
      this.inFlight--;
    }
  }
}

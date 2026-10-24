import type { AiConfiguration } from './configuration.js';
import { AiFailure, ProviderFailure } from './provider.js';
import type { AiProvider, AiProviderRequest } from './provider.js';
import { providerResult } from './templates.js';

export async function executeProvider(
  provider: AiProvider,
  request: Omit<AiProviderRequest, 'signal'>,
  config: AiConfiguration,
) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const raw = await Promise.race([
      provider.generate({ ...request, signal: controller.signal }),
      new Promise<never>((resolve, reject) => {
        void resolve;
        timer = setTimeout(() => {
          reject(new AiFailure('AI_TIMEOUT', true));
          controller.abort();
        }, config.AI_TIMEOUT_MS);
      }),
    ]);
    const parsed = providerResult.safeParse(raw);
    if (!parsed.success) throw new AiFailure('AI_INVALID_OUTPUT');
    return parsed.data;
  } catch (error) {
    if (error instanceof AiFailure) throw error;
    throw new AiFailure(
      error instanceof ProviderFailure && error.category === 'rate_limit'
        ? 'AI_RATE_LIMITED'
        : 'AI_PROVIDER_FAILED',
      true,
    );
  } finally {
    if (timer) clearTimeout(timer);
  }
}

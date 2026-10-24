export interface AiProviderRequest {
  readonly model: string;
  readonly system: string;
  readonly untrustedInput: { question: string; allowedSections: readonly string[] };
  readonly maxOutputTokens: number;
  readonly signal: AbortSignal;
}
// Adapters must return unknown; validation belongs to the trusted service boundary.
// No SQL, credentials, tenant records, tools, or write callbacks enter this interface.
export interface AiProvider {
  readonly id: string;
  generate(request: AiProviderRequest): Promise<unknown>;
}
export type AiFailureCode =
  | 'AI_DISABLED'
  | 'AI_INVALID_INPUT'
  | 'AI_TIMEOUT'
  | 'AI_BUSY'
  | 'AI_RATE_LIMITED'
  | 'AI_PROVIDER_FAILED'
  | 'AI_INVALID_OUTPUT';
export class AiFailure extends Error {
  constructor(
    readonly code: AiFailureCode,
    readonly retryable = false,
  ) {
    super(code);
    this.name = 'AiFailure';
  }
}
export class ProviderFailure extends Error {
  constructor(readonly category: 'rate_limit' | 'unavailable') {
    super('AI provider request failed.');
  }
}

import {
  API_PREFIX,
  apiErrorSchema,
  apiOriginSchema,
  healthResponseSchema,
} from '@inventory/contracts';
import type { ApiErrorResponse, HealthResponse } from '@inventory/contracts';

// The host supplies its transport; no browser or native globals enter this package.
export interface HttpResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}
export type HttpTransport = (url: string) => Promise<HttpResponse>;

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly details?: ApiErrorResponse,
  ) {
    super(details?.message ?? 'The service returned an unexpected response.');
    this.name = 'ApiClientError';
  }
}

export function parseApiOrigin(baseUrl: unknown): string {
  const result = apiOriginSchema.safeParse(baseUrl);
  if (!result.success) {
    throw new Error('API base URL must be an HTTP(S) origin without a path.');
  }
  return result.data;
}

export function createApiClient(baseUrl: string, transport: HttpTransport) {
  const origin = parseApiOrigin(baseUrl);
  return {
    async getHealth(): Promise<HealthResponse> {
      const response = await transport(`${origin}${API_PREFIX}/health/live`);
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new ApiClientError(response.status);
      }
      if (!response.ok) {
        const parsed = apiErrorSchema.safeParse(payload);
        throw new ApiClientError(response.status, parsed.success ? parsed.data : undefined);
      }
      const parsed = healthResponseSchema.safeParse(payload);
      if (!parsed.success) throw new ApiClientError(response.status);
      return parsed.data;
    },
  };
}

import type { AuthRequest } from '../auth/auth.http.js';
export function requestActor(request: AuthRequest) {
  return {
    accountId: request.identity.account_id,
    requestId: String(request.res?.getHeader('x-request-id')),
  };
}

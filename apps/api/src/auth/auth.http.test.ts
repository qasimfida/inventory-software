import { expect, it, vi } from 'vitest';
import type { Response } from 'express';
import { sessionResponse } from './auth.http.js';
import { parseEnvironment } from '../config/environment.js';
import type { Identity } from './session.repository.js';
it('uses a host-only secure production cookie without exposing its token in the response', () => {
  const cookie = vi.fn();
  const environment = parseEnvironment({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://test@localhost/test',
    DATABASE_SSL: 'verify-full',
    CORS_ORIGINS: 'https://app.example.test',
  });
  const session: Identity = {
    id: 'session',
    account_id: 'account',
    email: 'user@example.test',
    transport: 'cookie',
    expires_at: new Date(),
    absolute_expires_at: new Date(),
  };
  const body = sessionResponse({ cookie } as unknown as Response, environment, {
    token: 'sensitive',
    session,
  });
  expect(cookie).toHaveBeenCalledWith('__Host-inventory_session', 'sensitive', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    expires: session.expires_at,
  });
  expect(body).not.toHaveProperty('token');
});

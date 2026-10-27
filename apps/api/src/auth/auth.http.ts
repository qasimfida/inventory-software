import { ForbiddenException, SetMetadata } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Environment } from '../config/environment.js';
import type { Identity, SessionTransport } from './session.repository.js';

export const PUBLIC_ROUTE = Symbol('PUBLIC_ROUTE');
export const PublicRoute = (kind: 'credentials' | 'health' | 'storefront' = 'credentials') =>
  SetMetadata(PUBLIC_ROUTE, kind);
export interface AuthRequest extends Request {
  identity: Identity;
  sessionToken: string;
}
export const cookieName = (env: Environment) =>
  env.NODE_ENV === 'production' ? '__Host-inventory_session' : 'inventory_session';
export function transportFor(request: Request): SessionTransport {
  return request.header('x-inventory-client') === 'native' ? 'bearer' : 'cookie';
}
export function validateOrigin(request: Request, env: Environment) {
  const origin = request.header('origin');
  if (origin && !env.corsOrigins.includes(origin)) throw new ForbiddenException();
  if (transportFor(request) === 'cookie' && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    if (!origin || request.header('x-inventory-client') !== 'web') throw new ForbiddenException();
  }
}
export function readToken(request: Request, env: Environment) {
  if (transportFor(request) === 'bearer')
    return request.header('authorization')?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1] ?? '';
  const values = (request.header('cookie') ?? '')
    .split(';')
    .map((value) => value.trim())
    .filter((value) => value.startsWith(`${cookieName(env)}=`));
  return values.length === 1 ? values[0]!.slice(cookieName(env).length + 1) : '';
}
export function sessionResponse(
  response: Response,
  env: Environment,
  result: { token: string; session: Identity },
) {
  const { session, token } = result;
  if (session.transport === 'cookie')
    response.cookie(cookieName(env), token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      expires: session.expires_at,
    });
  return {
    user: { id: session.account_id, email: session.email, status: 'active' as const },
    sessionId: session.id,
    expiresAt: session.expires_at.toISOString(),
    absoluteExpiresAt: session.absolute_expires_at.toISOString(),
    ...(session.transport === 'bearer' ? { token } : {}),
  };
}
export function clearSessionCookie(response: Response, env: Environment) {
  response.clearCookie(cookieName(env), {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
}

import { Inject, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ENVIRONMENT } from '../config/environment.js';
import type { Environment } from '../config/environment.js';
import { SessionRepository } from './session.repository.js';
import { RateLimitService } from './rate-limit.service.js';
import { PUBLIC_ROUTE, readToken, transportFor, validateOrigin } from './auth.http.js';
import type { AuthRequest } from './auth.http.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(SessionRepository) private readonly sessions: SessionRepository,
    @Inject(RateLimitService) private readonly limits: RateLimitService,
    @Inject(ENVIRONMENT) private readonly environment: Environment,
  ) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const isPublic = this.reflector.getAllAndOverride<'credentials' | 'health' | 'storefront'>(
      PUBLIC_ROUTE,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic === 'health') return true;
    if (isPublic === 'storefront') {
      if (!['GET', 'HEAD'].includes(request.method)) return false;
      await this.limits.consume(`storefront-ip:${request.socket.remoteAddress ?? 'unknown'}`, 60);
      return true;
    }
    validateOrigin(request, this.environment);
    if (isPublic) {
      await this.limits.consume(`credentials-ip:${request.socket.remoteAddress ?? 'unknown'}`, 60);
      const body: unknown = request.body;
      if (
        typeof body === 'object' &&
        body !== null &&
        'email' in body &&
        typeof body.email === 'string'
      )
        await this.limits.consume(
          `credentials-email:${body.email.trim().toLowerCase().slice(0, 254)}`,
          10,
        );
      return true;
    }
    request.sessionToken = readToken(request, this.environment);
    request.identity = await this.sessions.authenticate(
      request.sessionToken,
      transportFor(request),
    );
    if (!['GET', 'HEAD'].includes(request.method))
      await this.limits.consume(`session:${request.identity.id}`, 120);
    return true;
  }
}

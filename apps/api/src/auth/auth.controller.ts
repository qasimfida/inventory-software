import { z } from 'zod';
import { SchemaPipe } from '../http/schema.pipe.js';
import { loginContext } from '../security/device-login.js';
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ENVIRONMENT } from '../config/environment.js';
import type { Environment } from '../config/environment.js';
import { AuthService } from './auth.service.js';
import { SessionRepository } from './session.repository.js';
import { AcceptInvitationDto, LoginDto, ResetPasswordDto, RecoveryStatusDto } from './auth.dto.js';
import { PublicRoute, clearSessionCookie, sessionResponse, transportFor } from './auth.http.js';
import type { AuthRequest } from './auth.http.js';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(SessionRepository) private readonly sessions: SessionRepository,
    @Inject(ENVIRONMENT) private readonly environment: Environment,
  ) {}
  @PublicRoute()
  @Post('password/status')
  recoveryStatus(@Body() input: RecoveryStatusDto) {
    return this.auth.recoveryStatus(input);
  }
  @PublicRoute()
  @Post('password/reset')
  async reset(@Body() input: ResetPasswordDto, @Res({ passthrough: true }) response: Response) {
    await this.auth.reset(input, String(response.getHeader('x-request-id')));
    clearSessionCookie(response, this.environment);
    return { ok: true };
  }
  @PublicRoute()
  @Post('login')
  async login(
    @Body() input: LoginDto,
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return sessionResponse(
      response,
      this.environment,
      await this.auth.login(
        input,
        transportFor(request),
        loginContext(request, response, this.environment),
      ),
    );
  }
  @PublicRoute()
  @Post('invitations/accept')
  async accept(
    @Body() input: AcceptInvitationDto,
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return sessionResponse(
      response,
      this.environment,
      await this.auth.accept(
        input,
        transportFor(request),
        loginContext(request, response, this.environment),
      ),
    );
  }
  @Get('session')
  current(@Req() request: AuthRequest) {
    const identity = request.identity;
    return {
      user: { id: identity.account_id, email: identity.email, status: 'active' },
      sessionId: identity.id,
      expiresAt: identity.expires_at.toISOString(),
      absoluteExpiresAt: identity.absolute_expires_at.toISOString(),
    };
  }
  @Post('renew')
  async renew(@Req() request: AuthRequest, @Res({ passthrough: true }) response: Response) {
    return sessionResponse(
      response,
      this.environment,
      await this.sessions.renew(
        request.identity,
        request.sessionToken,
        String(response.getHeader('x-request-id')),
      ),
    );
  }
  @Post('logout')
  async logout(@Req() request: AuthRequest, @Res({ passthrough: true }) response: Response) {
    await this.sessions.revoke(
      request.identity.account_id,
      request.identity.id,
      String(response.getHeader('x-request-id')),
    );
    clearSessionCookie(response, this.environment);
    return { ok: true };
  }
  @Get('sessions')
  async list(
    @Req() request: AuthRequest,
    @Query('includeDevice', new SchemaPipe(z.enum(['true', 'false']).optional()))
    includeDevice?: string,
  ) {
    return {
      sessions: (await this.sessions.list(request.identity.account_id)).map((session) => ({
        id: session.id,
        createdAt: session.created_at.toISOString(),
        expiresAt: session.expires_at.toISOString(),
        transport: session.transport,
        ...(includeDevice === 'true' ? { deviceId: session.device_id } : {}),
      })),
    };
  }
  @Delete('sessions')
  async revokeAll(@Req() request: AuthRequest, @Res({ passthrough: true }) response: Response) {
    await this.sessions.revoke(
      request.identity.account_id,
      undefined,
      String(response.getHeader('x-request-id')),
    );
    clearSessionCookie(response, this.environment);
    return { ok: true };
  }
  @Delete('sessions/:id')
  async revoke(@Param('id', new ParseUUIDPipe()) id: string, @Req() request: AuthRequest) {
    await this.sessions.revoke(
      request.identity.account_id,
      id,
      String(request.res?.getHeader('x-request-id')),
    );
    return { ok: true };
  }
}

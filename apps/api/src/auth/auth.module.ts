import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigurationModule } from '../config/configuration.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { SessionRepository } from './session.repository.js';
import { RateLimitService } from './rate-limit.service.js';
import { AuthGuard } from './auth.guard.js';

@Module({
  imports: [ConfigurationModule, DatabaseModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionRepository,
    RateLimitService,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}

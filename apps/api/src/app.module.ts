import { Module } from '@nestjs/common';
import { ENVIRONMENT, parseEnvironment } from './config/environment.js';
import { DatabaseService } from './database/database.service.js';
import { HealthController } from './health/health.controller.js';

@Module({
  controllers: [HealthController],
  providers: [
    { provide: ENVIRONMENT, useFactory: () => parseEnvironment(process.env) },
    DatabaseService,
  ],
})
export class AppModule {}

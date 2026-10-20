import { Module } from '@nestjs/common';
import { ENVIRONMENT, parseEnvironment } from './environment.js';

@Module({
  providers: [{ provide: ENVIRONMENT, useFactory: () => parseEnvironment(process.env) }],
  exports: [ENVIRONMENT],
})
export class ConfigurationModule {}

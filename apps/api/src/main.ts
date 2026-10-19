import 'reflect-metadata';
import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ENVIRONMENT } from './config/environment.js';
import type { Environment } from './config/environment.js';
import { configureHttp } from './http/configure-http.js';

const logger = new ConsoleLogger({ json: true });
const app = await NestFactory.create(AppModule, { logger });
const environment = app.get<Environment>(ENVIRONMENT);
configureHttp(app, environment);
app.enableShutdownHooks();
await app.listen(environment.PORT, environment.HOST);

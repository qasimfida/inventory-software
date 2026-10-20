import 'reflect-metadata';
import { SafeLogger } from './logging/safe-logger.js';
import type { Server } from 'node:http';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ENVIRONMENT, parseEnvironment } from './config/environment.js';
import type { Environment } from './config/environment.js';
import { configureHttp } from './http/configure-http.js';

export async function createApplication(logging = true) {
  parseEnvironment(process.env);
  const app = await NestFactory.create(AppModule, {
    logger: logging ? new SafeLogger() : false,
    abortOnError: false,
    bodyParser: false,
  });
  const environment = app.get<Environment>(ENVIRONMENT);
  configureHttp(app, environment);
  const server = app.getHttpServer() as Server;
  server.requestTimeout = environment.HTTP_REQUEST_TIMEOUT_MS;
  server.headersTimeout = Math.min(30000, environment.HTTP_REQUEST_TIMEOUT_MS);
  server.keepAliveTimeout = 5000;
  app.enableShutdownHooks();
  return app;
}

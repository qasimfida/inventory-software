import 'reflect-metadata';
import { Body, Controller, Module, Post } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { IsString } from 'class-validator';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { apiErrorSchema } from '@inventory/contracts';
import { DatabaseService } from '../database/database.service.js';
import { HealthController } from '../health/health.controller.js';
import { parseEnvironment } from '../config/environment.js';
import { configureHttp } from './configure-http.js';

class ValidationProbe {
  @IsString()
  name!: string;
}

@Controller('__audit')
class ValidationProbeController {
  @Post()
  validate(@Body() body: ValidationProbe) {
    return { name: body.name };
  }
}

@Module({
  controllers: [HealthController, ValidationProbeController],
  providers: [{ provide: DatabaseService, useValue: { isReady: async () => false } }],
})
class HttpTestModule {}

describe('HTTP foundation', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await NestFactory.create(HttpTestModule, { logger: false });
    configureHttp(app, parseEnvironment({ DATABASE_URL: 'postgresql://test@localhost/test' }));
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });

  it('exposes versioned liveness with security and correlation headers', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health/live').expect(200);
    expect(response.body).toEqual({ status: 'ok' });
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-request-id']).toMatch(/^[\da-f-]{36}$/);
    expect(response.headers['cache-control']).toBe('no-store');
  });
  it('fails readiness without database connectivity using a safe error envelope', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(503);
    expect(apiErrorSchema.parse(response.body)).toMatchObject({
      code: 'UNAVAILABLE',
      retryable: true,
    });
    expect(response.body.requestId).toBe(response.headers['x-request-id']);
  });
  it('does not authorize unknown browser origins through CORS', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health/live')
      .set('Origin', 'https://untrusted.test');
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
  it('uses the same envelope for missing routes', async () => {
    for (const path of ['/missing', '/api/v1', '/api/v1/', '/api/v1/missing']) {
      const response = await request(app.getHttpServer())
        .get(path)
        .set('Origin', 'http://localhost:5173')
        .expect(404);
      expect(apiErrorSchema.parse(response.body).code).toBe('NOT_FOUND');
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    }
  });
  it('preserves parser status codes without exposing request content', async () => {
    const oversized = await request(app.getHttpServer())
      .post('/api/v1/health/live')
      .send({ value: 'x'.repeat(110000) })
      .expect(413);
    expect(apiErrorSchema.parse(oversized.body).code).toBe('REQUEST_FAILED');
    const malformed = await request(app.getHttpServer())
      .post('/api/v1/health/live')
      .set('Content-Type', 'application/json')
      .send('{"secret":')
      .expect(400);
    expect(apiErrorSchema.parse(malformed.body).message).not.toContain('secret');
  });
  it('enforces request validation through the real global HTTP pipeline', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/__audit')
      .send({ name: 'probe' })
      .expect(201, { name: 'probe' });
    for (const body of [{ name: 'probe', unexpected: true }, { name: 42 }]) {
      const response = await request(app.getHttpServer())
        .post('/api/v1/__audit')
        .send(body)
        .expect(400);
      expect(apiErrorSchema.parse(response.body).code).toBe('BAD_REQUEST');
    }
  });
});

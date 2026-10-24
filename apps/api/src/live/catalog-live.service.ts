import { Inject, Injectable } from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'node:http';
import pg from 'pg';
import { ENVIRONMENT } from '../config/environment.js';
import type { Environment } from '../config/environment.js';
import { poolOptions } from '../database/pool-options.js';
import { CatalogLiveAccess } from './catalog-live-access.js';
import type { LiveIdentity } from './catalog-live-access.js';
type Subscription = { identity: LiveIdentity; last: string; pending: boolean; dirty: boolean };
@Injectable()
export class CatalogLiveService implements OnApplicationShutdown {
  private server?: WebSocketServer;
  private listener?: pg.Client;
  private retry?: ReturnType<typeof setTimeout>;
  private heartbeat?: ReturnType<typeof setInterval>;
  private stopped = false;
  private readonly subscriptions = new Map<WebSocket, Subscription>();
  constructor(
    @Inject(ENVIRONMENT) private readonly env: Environment,
    @Inject(CatalogLiveAccess) private readonly access: CatalogLiveAccess,
  ) {}
  attach(http: Server) {
    const server = (this.server = new WebSocketServer({
      noServer: true,
      maxPayload: 256,
      perMessageDeflate: false,
    }));
    http.on('upgrade', (request, socket, head) => {
      if (
        request.url !== '/api/v1/catalog-live' ||
        server.clients.size >= 1000 ||
        // Browser WebSocket cannot set custom headers. Native runtimes synthesize an API Origin;
        // they still need the same authenticated, single-use ticket in their first frame.
        (request.headers['x-inventory-client'] !== 'native' &&
          request.headers.origin &&
          !this.env.corsOrigins.includes(request.headers.origin))
      ) {
        socket.destroy();
        return;
      }
      server.handleUpgrade(request, socket, head, (ws) => this.connect(ws));
    });
    this.heartbeat = setInterval(() => {
      for (const [ws, sub] of this.subscriptions) void this.send(ws, sub);
    }, 30000);
    this.heartbeat.unref();
    void this.listen();
  }
  private connect(ws: WebSocket) {
    const deadline = setTimeout(() => ws.terminate(), 5000);
    ws.on('error', () => ws.terminate());
    ws.on('close', () => {
      clearTimeout(deadline);
      this.subscriptions.delete(ws);
    });
    let received = false;
    ws.on('message', (data, binary) => {
      if (received || binary) {
        ws.close(1008);
        return;
      }
      received = true;
      void (async () => {
        try {
          const identity = await this.access.consume(data.toString());
          if (ws.readyState !== WebSocket.OPEN) return;
          const sub = { identity, last: '', pending: false, dirty: false };
          this.subscriptions.set(ws, sub);
          clearTimeout(deadline);
          await this.send(ws, sub);
        } catch {
          ws.close(1008, 'Authorization required');
        }
      })();
    });
  }
  private async send(ws: WebSocket, sub: Subscription) {
    if (sub.pending) {
      sub.dirty = true;
      return;
    }
    sub.pending = true;
    try {
      do {
        sub.dirty = false;
        const message = JSON.stringify(await this.access.head(sub.identity));
        if (ws.readyState !== WebSocket.OPEN) return;
        if (ws.bufferedAmount > 4096) {
          ws.terminate();
          return;
        }
        if (message !== sub.last) {
          ws.send(message);
          sub.last = message;
        }
      } while (sub.dirty);
    } catch {
      ws.close(1008, 'Authorization required');
    } finally {
      sub.pending = false;
    }
  }
  private async listen() {
    if (this.stopped) return;
    const client = (this.listener = new pg.Client(poolOptions(this.env)));
    let failed = false;
    const reconnect = () => {
      if (failed) return;
      failed = true;
      void client.end().catch(() => undefined);
      if (!this.stopped) this.retry = setTimeout(() => void this.listen(), 5000);
    };
    client.on('error', reconnect);
    client.on('end', reconnect);
    client.on('notification', (event) => {
      for (const [ws, sub] of this.subscriptions)
        if (sub.identity.businessId === event.payload) void this.send(ws, sub);
    });
    try {
      await client.connect();
      await client.query('LISTEN inventory_catalog');
      for (const [ws, sub] of this.subscriptions) void this.send(ws, sub);
    } catch {
      reconnect();
    }
  }
  async onApplicationShutdown() {
    this.stopped = true;
    clearTimeout(this.retry);
    clearInterval(this.heartbeat);
    for (const ws of this.server?.clients ?? []) ws.terminate();
    this.server?.close();
    await this.listener?.end().catch(() => undefined);
  }
}

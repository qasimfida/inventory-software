import type { z } from 'zod';
import type {
  securityPageSchema,
  notificationPageSchema,
  deliveryPageSchema,
  diagnosticPageSchema,
} from '@inventory/contracts';
import type { createSecurityClient } from './client.js';
export type SecurityView = 'inbox' | 'events' | 'platform' | 'deliveries' | 'diagnostics';
export interface SecurityState {
  view: SecurityView;
  busy: boolean;
  loaded: boolean;
  message: string;
  nextCursor: string | null;
  notifications: z.infer<typeof notificationPageSchema>['notifications'];
  events: z.infer<typeof securityPageSchema>['events'];
  deliveries: z.infer<typeof deliveryPageSchema>['deliveries'];
  diagnostics: z.infer<typeof diagnosticPageSchema>['diagnostics'];
}
export class SecurityModel {
  private state: SecurityState = {
    view: 'inbox',
    busy: false,
    loaded: false,
    message: '',
    nextCursor: null,
    notifications: [],
    events: [],
    deliveries: [],
    diagnostics: [],
  };
  private listeners = new Set<() => void>();
  private generation = 0;
  constructor(readonly client: ReturnType<typeof createSecurityClient>) {}
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(value: Partial<SecurityState>) {
    this.state = { ...this.state, ...value };
    for (const fn of this.listeners) fn();
  }
  reset() {
    this.generation++;
    this.update({
      notifications: [],
      events: [],
      deliveries: [],
      diagnostics: [],
      nextCursor: null,
      busy: false,
      loaded: false,
      message: '',
    });
  }
  async load(view: SecurityView, more = false) {
    const generation = ++this.generation,
      cursor = more ? (this.state.nextCursor ?? undefined) : undefined;
    this.update({
      view,
      busy: true,
      loaded: false,
      message: '',
      notifications: more ? this.state.notifications : [],
      events: more ? this.state.events : [],
      deliveries: [],
      diagnostics: [],
    });
    try {
      if (view === 'inbox') {
        const result = await this.client.inbox(cursor);
        if (generation === this.generation)
          this.update({
            notifications: more
              ? [...this.state.notifications, ...result.notifications]
              : result.notifications,
            nextCursor: result.nextCursor,
          });
      } else if (view === 'events' || view === 'platform') {
        const result = await this.client.events(view === 'platform', cursor);
        if (generation === this.generation)
          this.update({
            events: more ? [...this.state.events, ...result.events] : result.events,
            nextCursor: result.nextCursor,
          });
      } else if (view === 'deliveries') {
        const result = await this.client.deliveries();
        if (generation === this.generation) this.update({ ...result, nextCursor: null });
      } else {
        const result = await this.client.diagnostics();
        if (generation === this.generation) this.update({ ...result, nextCursor: null });
      }
    } catch {
      if (generation === this.generation)
        this.update({ message: 'Security information unavailable. Check access and connection.' });
    } finally {
      if (generation === this.generation) this.update({ busy: false, loaded: true });
    }
  }
  async action(id: string, retry = false) {
    if (this.state.busy) return;
    const generation = this.generation;
    this.update({ busy: true, message: '' });
    try {
      if (retry) await this.client.retry(id);
      else await this.client.read(id);
      if (generation === this.generation) await this.load(this.state.view);
    } catch {
      if (generation === this.generation)
        this.update({ busy: false, message: 'Update not confirmed. Refresh before retrying.' });
    }
  }
}

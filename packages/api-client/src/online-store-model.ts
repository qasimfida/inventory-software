import { onlineError, onlineMessages } from './online-messages.js';
import type { CancellationSignal } from './cancellation.js';
import { canonicalJson } from '@inventory/domain';
import { onlineStoreSettingsSchema, storefrontSlugSchema } from '@inventory/contracts';
import type { OnlineCommand, OnlineStoreSettings } from '@inventory/contracts';
import type { createOnlineStoreClient } from './storefront-management.js';
import { initialOnlineSettings, onlineStoreChanges } from './online-store-setup.js';
type Client = ReturnType<typeof createOnlineStoreClient>;
type State = {
  draft: OnlineStoreSettings | null;
  saved: OnlineStoreSettings | null;
  busy: boolean;
  error: string;
  message: string;
  prerequisites: string[];
  asOf: string;
  dirty: boolean;
  unavailable: boolean;
};
/** Session-only editor. Live refresh preserves edits; command versions remain server-authoritative. */
export class OnlineStoreModel {
  private state: State = {
    draft: null,
    saved: null,
    busy: false,
    error: '',
    message: '',
    prerequisites: [],
    asOf: '',
    dirty: false,
    unavailable: false,
  };
  private listeners = new Set<() => void>();
  private keys = new Map<string, string>();
  private generation = 0;
  constructor(
    readonly client: Client,
    private businessId: string,
    private storeId: string,
    private key: () => string,
  ) {}
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(patch: Partial<State>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn());
  }
  edit = (draft: OnlineStoreSettings) =>
    this.publish({
      draft,
      dirty: canonicalJson(draft) !== canonicalJson(this.state.saved),
      message: '',
    });
  cancel = () => {
    if (this.state.saved) this.publish({ draft: this.state.saved, dirty: false, message: '' });
    else void this.refresh(true);
  };
  reset = () => {
    this.generation++;
    this.keys.clear();
    this.publish({
      draft: null,
      saved: null,
      dirty: false,
      error: '',
      message: '',
      busy: false,
      asOf: '',
    });
  };
  refresh = async (discard = false) => {
    if (this.state.busy) return;
    const generation = this.generation;
    this.publish({ busy: true });
    try {
      const result = await this.client.settings();
      if (generation !== this.generation) return;
      const saved = result.settings;
      this.publish({
        saved,
        draft:
          this.state.dirty && !discard
            ? this.state.draft
            : (saved ?? initialOnlineSettings(this.businessId, this.storeId, result.defaults)),
        dirty: discard ? false : this.state.dirty,
        prerequisites: result.prerequisites,
        asOf: new Date().toISOString(),
        error: '',
        unavailable: false,
      });
    } catch (error) {
      if (generation === this.generation) this.fail(error);
    } finally {
      if (generation === this.generation) this.publish({ busy: false });
    }
  };
  private fail(error: unknown) {
    const status = error && typeof error === 'object' && 'status' in error ? error.status : 0;
    const denied = [401, 403, 404].includes(Number(status));
    this.publish({
      unavailable:
        Number(status) === 0 || Number(status) >= 500 || Number(status) === 429 || denied,
      error: onlineError(error),
      ...(denied ? { draft: null, saved: null, dirty: false, asOf: '' } : {}),
    });
  }
  execute = async (
    input:
      | Omit<Extract<OnlineCommand, { action: 'settings' }>, 'idempotencyKey'>
      | {
          action: 'enable' | 'disable' | 'add-host' | 'remove-host';
          version: number;
          host?: string;
        },
  ) => {
    if (this.state.busy) return false;
    const generation = this.generation;
    this.publish({ busy: true, error: '', message: '' });
    try {
      const identity = canonicalJson(input);
      const idempotencyKey = this.keys.get(identity) ?? this.key();
      this.keys.set(identity, idempotencyKey);
      await this.client.command({ ...input, idempotencyKey } as OnlineCommand);
      if (generation !== this.generation) return false;
      this.keys.delete(identity);
      onlineStoreChanges.notify();
      this.publish({
        busy: false,
        dirty: false,
        message: onlineMessages.saved,
      });
      await this.refresh(true);
      return !this.state.error;
    } catch (error) {
      if (generation === this.generation) this.fail(error);
      return false;
    } finally {
      if (generation === this.generation) this.publish({ busy: false });
    }
  };
  save = async () => {
    if (!this.state.draft) return false;
    const result = onlineStoreSettingsSchema.safeParse(this.state.draft);
    if (!result.success) {
      this.publish({
        error: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' · '),
      });
      return false;
    }
    return this.execute({ action: 'settings', settings: result.data });
  };
  checkSlug = async (slug: string, signal?: CancellationSignal) => {
    const result = storefrontSlugSchema.safeParse(slug);
    if (!result.success)
      return {
        message: result.error.issues[0]!.message,
        available: false,
        suggestions: [] as string[],
      };
    const availability = await this.client.checkSlug(slug, signal);
    return {
      ...availability,
      message: availability.available ? onlineMessages.slugAvailable : onlineMessages.slugTaken,
    };
  };
}

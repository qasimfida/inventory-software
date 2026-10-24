import { resolveSettings } from '@inventory/contracts';
import type { SettingsSnapshot, PolicyRecord, PreferencePatch } from '@inventory/contracts';
import type { createSettingsClient } from './client.js';
export interface SettingsState {
  accountId: string | null;
  businessId: string | null;
  snapshot: SettingsSnapshot | null;
  business: PolicyRecord | null;
  busy: boolean;
  message: string;
}
export class SettingsModel {
  private state: SettingsState = {
    accountId: null,
    businessId: null,
    snapshot: null,
    business: null,
    busy: false,
    message: '',
  };
  private listeners = new Set<() => void>();
  private generation = 0;
  constructor(readonly client: ReturnType<typeof createSettingsClient>) {}
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(values: Partial<SettingsState>) {
    this.state = { ...this.state, ...values };
    for (const listener of this.listeners) listener();
  }
  effective() {
    return resolveSettings(
      this.state.snapshot?.preferences.values,
      this.state.snapshot?.platform.values,
      this.state.business?.values,
    );
  }
  async connect(accountId: string | null, businessId: string | null = null) {
    const generation = ++this.generation;
    this.update({
      accountId,
      businessId,
      snapshot: accountId === this.state.accountId ? this.state.snapshot : null,
      business: null,
      busy: !!accountId,
      message: '',
    });
    if (!accountId) return;
    try {
      const snapshot = await this.client.load();
      const business = businessId ? await this.client.business(businessId) : null;
      if (generation === this.generation) this.update({ snapshot, business });
    } catch {
      if (generation === this.generation)
        this.update({
          snapshot: null,
          message: 'Settings unavailable. Safe defaults apply; reconnect and refresh.',
        });
    } finally {
      if (generation === this.generation) this.update({ busy: false });
    }
  }
  async save(values: Partial<PreferencePatch>) {
    const { snapshot, accountId, businessId } = this.state;
    if (!snapshot || !accountId || this.state.busy) return;
    const generation = this.generation;
    this.update({ busy: true, message: '' });
    try {
      await this.client.save({
        version: snapshot.preferences.version,
        values: { ...snapshot.preferences.values, ...values },
      });
      if (generation === this.generation) await this.connect(accountId, businessId);
    } catch {
      if (generation === this.generation)
        this.update({
          message:
            'Settings were not confirmed. Refresh before retrying; another session may have changed them.',
          busy: false,
        });
    }
  }
  async policy(input: PolicyRecord, platform: boolean) {
    const { accountId, businessId } = this.state;
    if (!accountId || this.state.busy) return;
    const generation = this.generation;
    this.update({ busy: true, message: '' });
    try {
      if (platform) await this.client.platform(input);
      else if (businessId) await this.client.saveBusiness(businessId, input);
      if (generation === this.generation) await this.connect(accountId, businessId);
    } catch {
      if (generation === this.generation)
        this.update({
          message: 'Policy was not confirmed. Refresh, verify access and retry.',
          busy: false,
        });
    }
  }
}

import type { Business, Workspace } from '@inventory/contracts';
import type { createOrganizationClient } from './organization.js';
type Client = ReturnType<typeof createOrganizationClient>;
type AuditPage = Awaited<ReturnType<Client['audit']>>;
export interface OrganizationView {
  businesses: Business[];
  selectedId: string | null;
  workspace: Workspace | null;
  busy: boolean;
  error: string;
  events: AuditPage['events'];
  nextCursor: string | null;
}
const empty = (): OrganizationView => ({
  businesses: [],
  selectedId: null,
  workspace: null,
  busy: false,
  error: '',
  events: [],
  nextCursor: null,
});
// Portable UI state coordination; no persisted tenant cache or platform dependencies.
export class OrganizationModel {
  private state = empty();
  private generation = 0;
  private listeners = new Set<() => void>();
  constructor(readonly client: Client) {}
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(next: OrganizationView) {
    this.state = next;
    this.listeners.forEach((listener) => listener());
  }
  reset = () => {
    this.generation++;
    this.publish(empty());
  };
  async revalidate() {
    if (this.state.busy) return;
    const generation = this.generation,
      selectedId = this.state.selectedId;
    try {
      const businesses = await this.client.list();
      const selected = businesses.find((b) => b.id === selectedId);
      const workspace =
        selected?.state === 'active' ? await this.client.workspace(selected.id) : null;
      if (generation !== this.generation) return;
      if (
        JSON.stringify(businesses) !== JSON.stringify(this.state.businesses) ||
        JSON.stringify(workspace) !== JSON.stringify(this.state.workspace)
      )
        this.publish({ ...empty(), businesses, selectedId: selected?.id ?? null, workspace });
    } catch (error) {
      this.fail(generation, error);
    }
  }
  async refresh(work?: () => Promise<string | void>) {
    const generation = ++this.generation;
    const selectedId = this.state.selectedId;
    this.publish({
      ...this.state,
      busy: true,
      error: '',
      workspace: null,
      events: [],
      nextCursor: null,
    });
    try {
      const createdId = await work?.();
      const businesses = await this.client.list();
      const selected = businesses.find((b) => b.id === (createdId ?? selectedId));
      const workspace =
        selected?.state === 'active' ? await this.client.workspace(selected.id) : null;
      if (generation === this.generation)
        this.publish({ ...empty(), businesses, selectedId: selected?.id ?? null, workspace });
    } catch (error) {
      this.fail(generation, error);
    }
  }
  async select(id: string) {
    const generation = ++this.generation;
    this.publish({
      ...this.state,
      selectedId: id,
      workspace: null,
      busy: true,
      error: '',
      events: [],
      nextCursor: null,
    });
    try {
      const selected = this.state.businesses.find((b) => b.id === id);
      const workspace = selected?.state === 'active' ? await this.client.workspace(id) : null;
      if (generation === this.generation) this.publish({ ...this.state, workspace, busy: false });
    } catch (error) {
      this.fail(generation, error);
    }
  }
  async audit(more = false) {
    const id = this.state.selectedId;
    if (!id) return;
    const generation = ++this.generation;
    this.publish({ ...this.state, busy: true, error: '' });
    try {
      const page = await this.client.audit(
        id,
        more ? (this.state.nextCursor ?? undefined) : undefined,
      );
      if (generation === this.generation)
        this.publish({
          ...this.state,
          busy: false,
          events: more ? [...this.state.events, ...page.events] : page.events,
          nextCursor: page.nextCursor,
        });
    } catch (error) {
      this.fail(generation, error);
    }
  }
  private fail(generation: number, error: unknown) {
    if (generation === this.generation)
      this.publish({
        ...empty(),
        error:
          error instanceof Error && 'status' in error
            ? error.message
            : error instanceof Error && error.name === 'ZodError'
              ? 'Check names, codes, parent selections and required fields.'
              : 'Unable to load management data. Reconnect and refresh.',
      });
  }
}

export interface ResourceState<T> {
  data: T | null;
  busy: boolean;
  error: string;
}
export class ResourceModel<T> {
  private state: ResourceState<T> = { data: null, busy: false, error: '' };
  private generation = 0;
  private refreshPending = false;
  private listeners = new Set<() => void>();
  constructor(private readonly loader: () => Promise<T>) {}
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(state: ResourceState<T>) {
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }
  reset = () => {
    this.generation++;
    this.refreshPending = false;
    this.publish({ data: null, busy: false, error: '' });
  };
  /** Live hints preserve rendered fields and coalesce behind an in-flight mutation/load. */
  refresh = async () => {
    if (this.state.busy) {
      this.refreshPending = true;
      return;
    }
    await this.run(undefined, true);
  };
  async run(work?: () => Promise<unknown>, retainData = false) {
    const previous = retainData ? this.state.data : null;
    const generation = ++this.generation;
    this.publish({ data: previous, busy: true, error: '' });
    let commandCompleted = false;
    try {
      await work?.();
      commandCompleted = Boolean(work);
      const data = await this.loader();
      if (generation === this.generation) this.publish({ data, busy: false, error: '' });
    } catch (error) {
      if (generation === this.generation)
        this.publish({
          data: previous,
          busy: false,
          error: commandCompleted
            ? 'The action completed, but updated data could not be loaded. Refresh to see the latest data; do not submit again.'
            : error instanceof Error && 'status' in error
              ? error.message
              : error instanceof Error && error.name === 'ZodError'
                ? 'Check the required fields, formats and selections.'
                : work
                  ? 'The change could not be confirmed. Check the entered values and review the record before trying again.'
                  : 'Unable to load data. Reconnect and retry.',
        });
    } finally {
      if (generation === this.generation && this.refreshPending) {
        this.refreshPending = false;
        void this.refresh();
      }
    }
  }
}

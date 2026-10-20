export interface ResourceState<T> {
  data: T | null;
  busy: boolean;
  error: string;
}
export class ResourceModel<T> {
  private state: ResourceState<T> = { data: null, busy: false, error: '' };
  private generation = 0;
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
    this.publish({ data: null, busy: false, error: '' });
  };
  async run(work?: () => Promise<unknown>) {
    const generation = ++this.generation;
    this.publish({ data: null, busy: true, error: '' });
    try {
      await work?.();
      const data = await this.loader();
      if (generation === this.generation) this.publish({ data, busy: false, error: '' });
    } catch (error) {
      if (generation === this.generation)
        this.publish({
          data: null,
          busy: false,
          error:
            error instanceof Error && 'status' in error
              ? error.message
              : error instanceof Error && error.name === 'ZodError'
                ? 'Check the required fields, formats and selections.'
                : 'Unable to load data. Reconnect and retry.',
        });
    }
  }
}

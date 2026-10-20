import { canonicalJson } from '@inventory/domain';
import type { OrganizationTransport } from './organization.js';
// Memory-only retry identity. After reload/lock, inspect history before issuing a new uncertain command.
export class RetryableCommands {
  private keys = new Map<string, string>();
  constructor(
    private readonly request: OrganizationTransport,
    private readonly newKey: () => string,
  ) {}
  async run<T>(path: string, input: object, parse: (value: unknown) => T): Promise<T> {
    const identity = path + canonicalJson(input);
    let key = this.keys.get(identity);
    if (!key) {
      key = this.newKey();
      this.keys.set(identity, key);
    }
    const result = parse(await this.request(path, 'POST', { ...input, idempotencyKey: key }));
    this.keys.delete(identity);
    return result;
  }
}

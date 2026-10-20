export interface VaultRecord {
  revision: number;
  envelope: string;
}
export interface VaultStore {
  read(key: string): Promise<VaultRecord | null>;
  compareAndSwap(key: string, expected: number | null, envelope: string): Promise<boolean>;
}
export type RandomBytes = (length: number) => Uint8Array;

import { gcm } from '@noble/ciphers/aes.js';
import { bytesToHex, hexToBytes, utf8ToBytes, bytesToUtf8 } from '@noble/ciphers/utils.js';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { z } from 'zod';
import type { RandomBytes } from './offline-store.js';
const envelopeSchema = z
  .object({
    format: z.literal(1),
    salt: z.string().regex(/^[0-9a-f]{32}$/),
    nonce: z.string().regex(/^[0-9a-f]{24}$/),
    cipher: z
      .string()
      .regex(/^[0-9a-f]+$/)
      .max(24000000),
  })
  .strict();
export class VaultCipher {
  private constructor(
    private key: Uint8Array,
    private salt: string,
    private random: RandomBytes,
  ) {}
  static async unlock(password: string, random: RandomBytes, envelope?: string) {
    if (password.length < 15 || password.length > 128)
      throw new Error('Use a separate 15–128 character offline passphrase.');
    const salt = envelope
      ? envelopeSchema.parse(JSON.parse(envelope)).salt
      : bytesToHex(random(16));
    const key = await pbkdf2Async(sha256, utf8ToBytes(password), hexToBytes(salt), {
      c: 600000,
      dkLen: 32,
    });
    return new VaultCipher(key, salt, random);
  }
  seal(value: unknown) {
    if (!this.key.length) throw new Error('Offline vault is locked.');
    const nonce = this.random(12);
    return JSON.stringify(
      envelopeSchema.parse({
        format: 1,
        salt: this.salt,
        nonce: bytesToHex(nonce),
        cipher: bytesToHex(
          gcm(this.key, nonce, utf8ToBytes('inventory-vault-v1')).encrypt(
            utf8ToBytes(JSON.stringify(value)),
          ),
        ),
      }),
    );
  }
  open(envelope: string): unknown {
    const data = envelopeSchema.parse(JSON.parse(envelope));
    if (data.salt !== this.salt || !this.key.length)
      throw new Error('Vault was replaced or locked.');
    try {
      return JSON.parse(
        bytesToUtf8(
          gcm(this.key, hexToBytes(data.nonce), utf8ToBytes('inventory-vault-v1')).decrypt(
            hexToBytes(data.cipher),
          ),
        ),
      ) as unknown;
    } catch {
      throw new Error(
        'Incorrect passphrase or damaged vault. The stored data has not been changed.',
      );
    }
  }
  lock() {
    this.key.fill(0);
    this.key = new Uint8Array();
  }
}

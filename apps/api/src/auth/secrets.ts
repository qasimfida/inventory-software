import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { ServiceUnavailableException } from '@nestjs/common';

export const newToken = () => randomBytes(32).toString('base64url');
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
const options = { N: 131072, r: 8, p: 1, maxmem: 192 * 1024 * 1024 };
let activeHashes = 0;
async function derive(password: string, salt: string): Promise<Buffer> {
  if (activeHashes >= 2) throw new ServiceUnavailableException();
  activeHashes++;
  try {
    return await new Promise<Buffer>((resolve, reject) => {
      scrypt(password, salt, 64, options, (error, key) => (error ? reject(error) : resolve(key)));
    });
  } finally {
    activeHashes--;
  }
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt-v1$${salt}$${(await derive(password, salt)).toString('hex')}`;
}
export async function verifyPassword(password: string, encoded?: string) {
  // Unknown users pay the same hash cost. Version pins parameters; never trust stored costs.
  const [version, salt, digest] = (
    encoded ?? `scrypt-v1$${'0'.repeat(32)}$${'0'.repeat(128)}`
  ).split('$');
  if (version !== 'scrypt-v1' || !salt || !digest || !/^[a-f0-9]{128}$/.test(digest)) return false;
  const actual = await derive(password, salt);
  return timingSafeEqual(actual, Buffer.from(digest, 'hex')) && encoded !== undefined;
}

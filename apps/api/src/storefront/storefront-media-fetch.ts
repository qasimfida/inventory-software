import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { BlockList, isIP } from 'node:net';
const blocked = new BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const)
  blocked.addSubnet(address, prefix, 'ipv4');
export function publicImageAddress(address: string) {
  return isIP(address) === 4 && !blocked.check(address, 'ipv4');
}
export function rasterMime(bytes: Buffer): string | null {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return 'image/png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString())) return 'image/gif';
  if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP')
    return 'image/webp';
  return null;
}
/** Exact host approval happens before this call. Pin a public IPv4 address; no redirects, cookies or credentials. */
export async function fetchOnlineImage(url: URL): Promise<string> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const addresses = await Promise.race([
    lookup(url.hostname, { all: true, family: 4 }),
    new Promise<never>((resolve, reject) => {
      void resolve;
      timer = setTimeout(() => reject(new Error('DNS timeout')), 2000);
    }),
  ]).finally(() => clearTimeout(timer));
  if (!addresses.length || addresses.some((a) => !publicImageAddress(a.address)))
    throw new Error('Blocked image address');
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        method: 'GET',
        agent: false,
        lookup: (host, options, callback) => {
          void host;
          if (options.all) callback(null, [{ address: addresses[0]!.address, family: 4 }]);
          else callback(null, addresses[0]!.address, 4);
        },
        headers: { Accept: 'image/png,image/jpeg,image/webp,image/gif' },
      },
      (response) => {
        if (response.statusCode !== 200) {
          reject(new Error('Image unavailable'));
          response.destroy();
          req.destroy();
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        response.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > 2 * 1024 * 1024) req.destroy(new Error('Image too large'));
          else chunks.push(chunk);
        });
        response.on('error', reject);
        response.on('end', () => {
          const bytes = Buffer.concat(chunks),
            mime = rasterMime(bytes);
          if (!mime) reject(new Error('Unsupported image'));
          else resolve(`data:${mime};base64,${bytes.toString('base64')}`);
        });
      },
    );
    const deadline = setTimeout(() => req.destroy(new Error('Image timeout')), 5000);
    req.on('error', reject);
    req.on('close', () => clearTimeout(deadline));
    req.end();
  });
}

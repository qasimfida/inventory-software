import { expect, it } from 'vitest';
import { publicImageAddress, rasterMime } from './storefront-media-fetch.js';
it('rejects private, loopback, metadata, mapped IPv6, multicast and reserved destinations', () => {
  for (const address of [
    '0.1.2.3',
    '10.0.0.1',
    '127.0.0.1',
    '169.254.169.254',
    '172.16.0.1',
    '192.168.1.1',
    '100.64.0.1',
    '198.18.0.1',
    '224.0.0.1',
    '255.255.255.255',
    '::1',
    '::ffff:127.0.0.1',
  ])
    expect(publicImageAddress(address)).toBe(false);
  expect(publicImageAddress('8.8.8.8')).toBe(true);
});
it('sniffs raster formats and refuses SVG/HTML regardless of claimed content type', () => {
  expect(rasterMime(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
  expect(rasterMime(Buffer.from('<html>'))).toBeNull();
  expect(rasterMime(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe('image/png');
  expect(rasterMime(Buffer.from([255, 216, 255]))).toBe('image/jpeg');
});

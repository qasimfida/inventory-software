import { beforeEach, expect, it, vi } from 'vitest';
const { fetchImage } = vi.hoisted(() => ({ fetchImage: vi.fn() }));
vi.mock('./storefront-media-fetch.js', () => ({ fetchOnlineImage: fetchImage }));
import { previewOnlineImage } from './storefront-media.js';
beforeEach(() => fetchImage.mockReset());
it('does not fetch unapproved, local, non-HTTPS or credential-bearing URLs', async () => {
  for (const url of [
    'http://images.example.com/a',
    'https://127.0.0.1/a',
    'https://localhost/a',
    'https://images.example.com.evil.com/a',
    'https://u:p@images.example.com/a',
    'https://images.example.com:8443/a',
  ]) {
    expect((await previewOnlineImage(url, ['images.example.com'])).status).not.toBe('allowed');
  }
  expect(fetchImage).not.toHaveBeenCalled();
});
it('returns checked data only for allowed hosts and safe failures without remote diagnostics', async () => {
  fetchImage.mockResolvedValueOnce('data:image/png;base64,aGVsbG8=');
  expect(
    (await previewOnlineImage('https://images.example.com/a', ['images.example.com'])).dataUrl,
  ).toContain('data:image/png');
  fetchImage.mockRejectedValueOnce(new Error('private host diagnostic'));
  const failure = await previewOnlineImage('https://images.example.com/a', ['images.example.com']);
  expect(failure.status).toBe('not_reachable');
  expect(JSON.stringify(failure)).not.toContain('diagnostic');
});

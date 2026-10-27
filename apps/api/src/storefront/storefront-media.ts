import { imageUrlHost, validImageHost } from '@inventory/contracts';
import { fetchOnlineImage } from './storefront-media-fetch.js';
export async function previewOnlineImage(raw: string, allowed: string[]) {
  if (!raw.toLowerCase().startsWith('https://'))
    return { status: 'not_https' as const, message: 'Use an HTTPS image URL.' };
  const host = imageUrlHost(raw);
  if (!host || !validImageHost(host))
    return {
      status: 'invalid' as const,
      message: 'Use a public HTTPS image URL without credentials, custom ports or local addresses.',
    };
  if (!allowed.includes(host))
    return {
      status: 'host_not_allowed' as const,
      message: 'Host not allowed. Save this host in Image sources before testing.',
    };
  try {
    return {
      status: 'allowed' as const,
      message: 'Allowed and reachable. Preview loaded.',
      dataUrl: await fetchOnlineImage(new URL(raw)),
    };
  } catch {
    return {
      status: 'not_reachable' as const,
      message:
        'Not reachable as a supported image. Check the URL, public DNS, size (maximum 2 MB) and PNG/JPEG/WebP/GIF format. Redirects are not followed.',
    };
  }
}

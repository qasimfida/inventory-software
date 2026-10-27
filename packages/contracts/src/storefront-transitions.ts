import type { ChannelListing } from './storefront-management.js';
export type ListingStatus = ChannelListing['status'];
/** Paused intent survives invalid content. Repair never publishes automatically. */
export function revalidatedListingStatus(
  status: ListingStatus,
  ready: boolean,
  paused: boolean,
): ListingStatus {
  if (!ready) return 'needs_changes';
  if (paused) return 'paused';
  return status === 'selected' || status === 'needs_changes' ? 'ready' : status;
}
export function listingTransition(
  status: ListingStatus,
  action: 'publish' | 'pause' | 'resume',
  ready: boolean,
  enabled: boolean,
): ListingStatus | null {
  if (action === 'pause') return status === 'active' ? 'paused' : null;
  if (!ready || !enabled) return null;
  if (action === 'publish') return status === 'ready' ? 'active' : null;
  return status === 'paused' ? 'active' : null;
}

/** Online-store management copy. Readiness explanations live in storefrontIssueMessages. */
export const onlineMessages = {
  offline: 'Offline. Last loaded data is read-only. Reconnect before making changes.',
  denied:
    'You no longer have access to this online store. Ask an administrator to review your permissions.',
  readOnly: 'Read-only access. An owner or authorized administrator can make changes.',
  expired: 'Your session expired. Sign in again to continue.',
  conflict: 'This listing or its settings changed. Review the latest version before retrying.',
  rateLimited: 'Too many requests. Wait a moment, then retry.',
  serverError:
    'Unable to reach the online store. Retry to load the latest status before making changes.',
  invalid: 'Check the required fields, formats and selections.',
  prerequisites: 'Complete the setup checklist and save settings before enabling the store.',
  slugAvailable: 'Available',
  slugTaken: 'Already taken. Choose another URL slug.',
  slugInvalid:
    'Use 3–60 lowercase letters, numbers and single hyphens. Reserved names cannot be used.',
  enable:
    'Enable this online store? Only products explicitly published and passing readiness checks can appear. Orders and payment collection are not available yet.',
  disable:
    'Hide this online store immediately? Listings and settings are kept. Open orders, when supported, stay manageable.',
  lastFulfillment: 'Keep at least one fulfillment method enabled.',
  imageHostInvalid:
    'Use an exact public HTTPS hostname without a path, credentials, port or wildcard.',
  imageImpact: (count: number) =>
    `${count} listings use this image host and may move to Changes required. Confirm removal only after reviewing them.`,
  remove: 'Remove these selections from the online store? Catalog products and stock are kept.',
  limit: 'Select at most 200 items per action.',
  alreadyListed: 'Already listed. Open the existing selection to edit it.',
  nothingSelected: 'Select at least one product before continuing.',
  saved: 'Changes saved and confirmed by the server.',
  paused: 'Paused',
  soldOut: 'Sold out',
  hiddenSoldOut: 'Hidden: sold out',
  live: 'Live',
  hidden: 'Hidden',
  ready: 'Ready to publish',
  changes: 'Changes required',
  noPublicUrl:
    'Public storefront URL is not available. This release manages listings; a public site has not been deployed.',
  rechecked: 'Re-check confirmed. Review updated counts and products needing changes.',
  result: (ok: number, failed: number) =>
    `${ok} confirmed; ${failed} not completed. Review each result before retrying.`,
  noLongerReady: (count: number) =>
    `${count} products no longer meet requirements and moved to Changes required.`,
} as const;
export function onlineError(error: unknown) {
  const status = error && typeof error === 'object' && 'status' in error ? Number(error.status) : 0;
  if (status === 401) return onlineMessages.expired;
  if (status === 403 || status === 404) return onlineMessages.denied;
  if (status === 409) return onlineMessages.conflict;
  if (status === 429) return onlineMessages.rateLimited;
  if (status === 400 || status === 422 || (error instanceof Error && error.name === 'ZodError'))
    return onlineMessages.invalid;
  return onlineMessages.serverError;
}
/** Safe command-result explanations; never show raw server diagnostics. */
export function onlineResultMessage(code: string) {
  const messages: Record<string, string> = {
    active: 'Published and confirmed by the server.',
    paused: 'Paused and hidden from sale.',
    ready: 'Ready to publish. Publication requires confirmation.',
    needs_changes: 'Moved to Changes required. Fix the listed issues before publishing.',
    REMOVED: 'Removed from this online store. Catalog product and stock are kept.',
    delisted: 'Removed from this online store. Catalog product and stock are kept.',
    ALREADY_LISTED: onlineMessages.alreadyListed,
    LISTING_CHANGED: onlineMessages.conflict,
    LISTING_TRANSITION_INVALID:
      'This action is no longer available. Refresh and review the listing status.',
    NOT_FOUND: 'This selection is no longer available. Refresh the product list.',
    selected: 'Selection saved. Review readiness before publishing.',
  };
  return messages[code] ?? 'This item needs review. Refresh and check its current status.';
}
export function onlineFieldLabel(field: string) {
  if (field.startsWith('variants'))
    return field.endsWith('.price')
      ? 'price'
      : field.endsWith('.sku')
        ? 'SKU'
        : field.endsWith('.unit')
          ? 'unit'
          : 'variant details';
  if (field.startsWith('images')) return 'images';
  return (
    (
      {
        state: 'product status',
        stockSources: 'stock source',
        categoryId: 'category',
        productId: 'product selection',
        allowedImageHosts: 'image sources',
      } as Record<string, string>
    )[field] ?? field
  );
}

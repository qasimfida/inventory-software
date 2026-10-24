import {
  API_PREFIX,
  apiErrorSchema,
  apiOriginSchema,
  healthResponseSchema,
} from '@inventory/contracts';
import type { ApiErrorResponse, HealthResponse } from '@inventory/contracts';

// The host supplies its transport; no browser or native globals enter this package.
export interface HttpResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}
export type HttpTransport = (url: string) => Promise<HttpResponse>;

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly details?: ApiErrorResponse,
  ) {
    super(details?.message ?? 'The service returned an unexpected response.');
    this.name = 'ApiClientError';
  }
}

export function parseApiOrigin(baseUrl: unknown): string {
  const result = apiOriginSchema.safeParse(baseUrl);
  if (!result.success) {
    throw new Error('API base URL must be an HTTP(S) origin without a path.');
  }
  return result.data;
}

export function createApiClient(baseUrl: string, transport: HttpTransport) {
  const origin = parseApiOrigin(baseUrl);
  return {
    async getHealth(check: 'live' | 'ready' = 'live'): Promise<HealthResponse> {
      const response = await transport(`${origin}${API_PREFIX}/health/${check}`);
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new ApiClientError(response.status);
      }
      if (!response.ok) {
        const parsed = apiErrorSchema.safeParse(payload);
        throw new ApiClientError(response.status, parsed.success ? parsed.data : undefined);
      }
      const parsed = healthResponseSchema.safeParse(payload);
      if (!parsed.success) throw new ApiClientError(response.status);
      return parsed.data;
    },
  };
}

export { createAuthClient, memoryCredentialStore, AuthenticationError } from './auth.js';
export type { AuthTransport, CredentialStore } from './auth.js';
export { withReadRetries } from './read-retry.js';
export { createOrganizationClient } from './organization.js';
export type { OrganizationTransport } from './organization.js';
export { OrganizationModel } from './organization-model.js';
export type { OrganizationView } from './organization-model.js';
export { createCatalogClient, queryString } from './catalog.js';
export { ResourceModel } from './resource-model.js';
export type { CommandField, CommandForm, FormValues } from './forms.js';
export { formText } from './forms.js';
export { createPricingClient } from './pricing.js';
export { variantForms } from './variant-forms.js';
export { priceForms, quoteForm } from './price-forms.js';
export { formatMinorUnits } from '@inventory/domain';
export { createInventoryClient } from './inventory.js';
export { inventoryForms } from './inventory-forms.js';
export { RetryableCommands } from './retryable-commands.js';

export * from './purchasing.js';
export * from './purchase-forms.js';
export * from './storage.js';
export * from './storage-forms.js';
export * from './transfers.js';
export * from './transfer-forms.js';
export * from './customers.js';
export * from './customer-forms.js';
export * from './sales.js';
export * from './pos-model.js';
export type { PosItem, DraftLine, PosState } from './pos-types.js';
export * from './checkout-form.js';

export * from './cash.js';

export * from './cash-forms.js';

export * from './return-forms.js';

export * from './receipt-text.js';

export * from './offline-store.js';

export * from './offline-state.js';

export * from './offline-vault.js';

export * from './sync-client.js';

export * from './sync-engine.js';

export * from './offline-forms.js';

export * from './offline-workspace.js';

export * from './invalidations.js';

export * from './counts.js';
export * from './scanning.js';

export * from './warehouse-forms.js';

export * from './vault-partition.js';
export * from './payables.js';
export * from './payable-forms.js';
export * from './settings/client.js';
export * from './settings/model.js';
export * from './settings/fields.js';
export * from './settings/security-model.js';
export * from './reports.js';
export * from './business-notifications.js';
export * from './warehouse-view.js';
export * from './approval-review.js';
export * from './stage6.js';
export * from './trading-forms.js';
export * from './accounting-forms.js';

export { createDashboardClient, dashboardGrowth, dashboardHeights } from './dashboard.js';
export * from './workspace-navigation.js';
export * from './auth-links.js';

export { searchWorkspace } from './workspace-search.js';
export type { WorkspaceSearchResult } from './workspace-search.js';

export * from './stock-presentation.js';
export { observeCartQuotes } from './auto-quote.js';
export { stepQuantity } from './quantity-step.js';
export { cancellableResource } from './cancellable-resource.js';

export { mergePageCollections } from './page-collections.js';
export type { ResourceState } from './resource-model.js';
export { posPriceLabel } from './pos-presentation.js';

export { selectedLocations } from './location-selection.js';
export { companyFields } from './company-profile.js';

export * from './platform-businesses.js';
export * from './access-presentation.js';
export { createOperationsClient } from './operations.js';
export * from './operation-forms.js';
export * from './import-file.js';
export * from './import-client.js';

export { decodeUtf8 } from './import-file.js';

export { catalogLive } from './catalog-live.js';
export type { CatalogSocket } from './catalog-live.js';
export { catalogCsv } from './catalog-export.js';
export type { SyncProgress } from './sync-progress.js';
export { syncActivity } from './sync-activity.js';

export { isTransientReadFailure } from './auth.js';

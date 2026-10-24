# Live pricing and role-aware interface refinement

## Impact map

| Layer                 | Implementation                                                                                        | Acceptance                                                                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Authoritative pricing | Existing price entries, promotion withdrawals and catalog mutations                                   | No changed quote, tax, discount, permission or checkout math                                                                                                 |
| Committed events      | `1794800000000_live_catalog.sql`; existing `sync_changes` trigger                                     | PostgreSQL NOTIFY fires after commit; rolled-back changes never publish                                                                                      |
| Live authorization    | `apps/api/src/live/`                                                                                  | Existing authenticated POST issues a 30-second, single-use opaque ticket; no credentials in socket URLs; validate session/account/tenant/scope on every hint |
| Transport             | `packages/api-client/src/catalog-live.ts`; web/native `platform/useCatalogLive.ts`                    | One socket per business per app, schema validation, timeout, bounded exponential reconnect and full reload on reconnect                                      |
| Read projections      | `catalog/display-prices.ts`, catalog list and stock overview                                          | Batch load base-unit prices; current store override takes precedence; no customer-specific prices or unauthorized cost data                                  |
| UI                    | Catalog/inventory/pricing/POS; shared navigation/select/table components; notifications/audit drawers | Live authorized reads, retained edit fields, role-hidden routes, consistent selection spacing                                                                |
| Offline               | Existing encrypted cash snapshot and outbox                                                           | No change to saved snapshot prices or submitted sales; offline conflict policy remains authoritative                                                         |
| Platforms             | Web and Tauri use DOM components, Expo uses native controls                                           | Platform adapters supply sockets and scheduling, no DOM/native imports in shared code                                                                        |

## Behavior

Catalog displays the primary SKU's regular base-unit price. Inventory displays each variant's price. A single-store view uses its override; a multi-store view uses the business-wide price. These are indicative prices before customer discounts and tax. Checkout still obtains an authoritative quote. A missing base price is displayed explicitly, never as zero. Owners/authorized business-wide editors can open the same product and pricing drawers from inventory; scoped pricing permissions remain enforced by the existing backend.

The socket sends only `{type, revision, clock}` after current authorization. It does not transfer product, customer, stock or price records. Consumers reload through their normal permission-checked HTTP endpoints. Retained forms keep their fields during background reload. Additional loaded pages reset to page one after invalidation to avoid retaining stale prices. Scheduled price boundaries are rechecked within 30 seconds; committed edits wake the socket immediately. Socket notifications are not proof of stock availability or checkout success.

Tickets are hashed in PostgreSQL and consumed atomically, so API replicas can share tickets without sticky sessions. The first socket frame contains only the short-lived ticket. Each connection has a five-second authentication deadline and 256-byte client-message limit; extra client frames are rejected. The listener reconnects after database disconnects; a 30-second authorized heartbeat also recovers missed notifications. React Native marks its handshake with the existing `x-inventory-client: native` header because Android synthesizes an API Origin. Browser WebSocket cannot set that header and must pass the configured Origin allowlist. Both transports require the same single-use authenticated ticket. Concurrent tabs can hold separate pending tickets. Revoked or expired sessions close the channel. Socket count is bounded per API process; reverse-proxy connection limits remain an operational responsibility.

Cashiers no longer see Overview in sidebar, navigation search or native tabs. Direct routes retain existing guards/landing redirects. Warehouse context comes from the header; POS, cash shifts and receipts show the actual single working warehouse. Cash shifts and sale history remain available in navigation. Notifications use server-side event/reference search and read-status filters with cursor pagination; business activity logs filter **loaded** events and retain their existing cursor loading.

## Deployment

Apply `npm run db:migrate -w @inventory/api`. Forward HTTP upgrade requests at `/api/v1/catalog-live` to the API. Vite's `/api` proxy enables WebSocket forwarding. Production HTTPS clients need WSS connectivity, an allowed client Origin and proxy idle timeouts above 65 seconds. Desktop CSP pins HTTP and matching WS/WSS origins; packaging profiles include both. The added direct `ws` dependency provides the Node WebSocket server; platform clients use their existing WebSocket runtime.

The existing offline cache, credential storage, session renewal, stock ledger, payment submission and price-history rules are unchanged. There is no new financial mutation retry.

Implementation references: [ws authentication examples](https://github.com/websockets/ws#client-authentication), [PostgreSQL NOTIFY commit behavior](https://www.postgresql.org/docs/current/sql-notify.html).

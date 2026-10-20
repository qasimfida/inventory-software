# Organization management — Command 7

Implemented online management for businesses, memberships, stores/branches, warehouses and terminal registrations. No products, stock, sales, payments or synchronization tables were introduced. This guide records ownership, rollout and validation; authentication policy remains in [authentication](../security/authentication.md).

## Ownership and permissions

Account identities are global and may hold memberships in multiple businesses. Every store, warehouse, terminal and membership belongs exclusively to one business. A branch is a store with type `branch`, not a second hierarchy. Warehouses require a store; terminals require a store and optionally a warehouse within that same store. Parent links and entity types are fixed after creation. Registration is administrative device metadata, not a device credential, hardware attestation, login grant or offline capability.

| Operation                                           | Owner | Manager | Viewer |
| --------------------------------------------------- | ----- | ------- | ------ |
| Read active business locations/devices              | Yes   | Yes     | Yes    |
| Create/edit/deactivate locations/devices            | Yes   | Yes     | No     |
| Read membership roster, assign/change membership    | Yes   | No      | No     |
| Rename/suspend/archive business, read audit history | Yes   | No      | No     |

Any authenticated active account can create a business and becomes its first owner in the same transaction. Owners assign **existing active accounts** by email and role. For a new person, an operator first issues an authentication invitation using the existing `auth:admin` CLI; the recipient accepts it in the login screen, then the owner assigns that account. This command adds no email delivery or email-verification claim. Assignment does not grant access to other businesses. Suspended membership can be restored; archived membership cannot be reassigned or restored.

All three states are explicit: active, suspended and archived. Suspension is reversible; archival is permanent and retains records and unique codes. A store/warehouse cannot be suspended while active children remain; archival requires all children archived. New or reactivated child records require active parents. Business suspension or archival immediately blocks child reads/writes without rewriting each child's state. Active members retain the business summary; only owners can restore a suspended business or read its audit. Archived business edits fail.

The membership API preserves at least one active owner, including concurrent demotions. The separate operator account-disable capability can deliberately disable a sole owner for security; an operator must re-enable that account to recover access. There is no public ownership-recovery endpoint.

## Enforcement and consistency

Controllers read identity only from the global authenticated request context. A path business ID selects a candidate scope; `OrganizationScope` verifies active account and active membership, derives role, checks business status and passes a transaction context to services. Unknown businesses and nonmembership both return 404. Insufficient permissions return 403; stale versions, duplicate codes and invalid lifecycle changes return 409; invalid/extra DTO properties return 400. Clients cannot submit roles or tenant identity outside the explicit owner-controlled membership commands.

The business row is locked before a fresh membership lookup. All organizational reads and writes for that business use the same lock order, serializing membership/lifecycle changes with access checks. Edits require the current integer version. Queries include the authorized business ID; composite foreign keys independently reject cross-business and cross-store relationships. Codes are normalized uppercase and unique per business per entity table. Membership lookup, parent foreign keys and audit paging have indexes. No physical delete API exists.

Successful creation, edits and state/role changes write audit records in the same transaction: actor, business/resource, action, server request ID, timestamp and before/after state. Membership audit omits email; tokens/passwords are never recorded. A trigger rejects audit UPDATE/DELETE, and the API exposes only owner-scoped reading with 50-event cursor pages. Failed writes roll back without a success event; normal structured HTTP logs record rejected request status. This is not tamper-proof storage against database administrators; retention/export and separate security-event reporting remain deployment work.

RLS was evaluated and is **not enabled** in this increment. The existing deployment uses one configured database role, with no provisioned non-owner runtime role or trusted transaction-local account/tenant context. Application scoping plus relational constraints is the tested boundary; arbitrary SQL with database credentials is not tenant-isolated. Before enabling RLS, provision separate migration/runtime roles without BYPASSRLS, enforce transaction-local context and test actual-role policies (including business discovery and membership assignment). Do not claim RLS coverage from application tests. Reusing this module's scope is mandatory for future business endpoints.

## Client behavior and platforms

After login, open **Business management**, create or choose a business, then manage locations/devices. Owners also see business editing, membership assignment and audit history. Web and Tauri use the existing DOM primitives; mobile uses labelled native TextInput, Pressable and radio choices. Both use shared contracts, authenticated transport and the portable `OrganizationModel`. No new dependencies were added.

Data stays in memory. Switching clears the previous workspace immediately; stale responses after switching/logout are ignored. Refresh/mutation errors clear management data. Session checks, background/offline handling and logout unmount management through the existing auth gate. Membership is rechecked on every backend request; an already displayed view may remain until the next refresh/session check (normally at most 60 seconds while foregrounded). No business data is persisted, queued offline or available through an offline bypass. The current UI loads a whole business's locations/roster; large-directory pagination and search are follow-up work, not a tested scale claim.

## Impact map

| Layer                  | Changed implementation / evidence                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authority              | `apps/api/src/organization`: controller, business/location/membership services, scoped transaction, location repository                                 |
| Schema/permissions     | `1792500000000_organization.sql`: six tables, enums, composite constraints/indexes, immutable audit trigger; role/lifecycle/isolation integration tests |
| Contracts/transport    | `packages/contracts/src/organization.ts`; `packages/api-client/src/organization.ts`, authenticated serialized transport, shared view model              |
| Local persistence/sync | Absent by design; in-memory view reset and stale-response unit tests                                                                                    |
| Web/Windows/macOS      | `apps/web/src/features/organization`; reused by Tauri with existing ephemeral bearer transport                                                          |
| Mobile                 | `apps/mobile/src/organization`; platform-native controls and existing SecureStore/cookie transport                                                      |
| Rollout/tests          | PostgreSQL integration suites, native component test, model tests and real-browser manual scenario; see validation below                                |

## Rollout and commands

Back up an existing database and review migration SQL before production rollout. Apply migrations before deploying the new API/client:

```sh
npm run db:local # Default local DB only; otherwise start your configured database
npm run db:migrate -w @inventory/api
npm run dev
# Optional additional clients in separate terminals:
npm run dev:mobile
npm run dev:desktop
```

Use `npm run dev:api` and `dev:web` for separate processes. `npm run dev` provisions the development database but does not replace the explicit migration command. The new migration is additive to authentication and does not rewrite authentication records. Its destructive down migration drops organization data; use only disposable test databases or an approved recovery plan. Production authentication/TLS/secret setup is unchanged. No new environment variables are required.

For repeatable checks: `npm run validate`, `TEST_DATABASE_URL=... npm run test:integration` (disposable database role with CREATEDB), `npm run build:mobile`, and `npm run build -w @inventory/desktop -- --bundles app` on macOS. `tests/manual/organization.mjs` exercises Chrome against disposable migrated API/web servers using `E2E_WEB_URL` and a fresh `E2E_INVITATION` for `browser-e2e@example.test`; keep that invitation out of logs. It also checks axe accessibility and simulates desktop transport, which is not a native WebView test.

## Validation results

Verified on 2026-10-19 with Node 24.13.0, npm 11.6.2 and disposable PostgreSQL 18 clusters:

| Check                                                          | Exact result                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run validate`                                             | Passed formatting, foundation checks, lint/import boundaries, all workspace type checks, 12 tooling tests, 43 tests in 17 unit/component files, API and web production builds                                                                                           |
| `npm run test:integration` with disposable `TEST_DATABASE_URL` | 16 tests in 4 files passed; 7 organization tests cover tenant isolation, forged IDs, cross-store relationships, role escalation, duplicate codes, stale versions, parent lifecycle, membership revocation, concurrent owner preservation and audit integrity            |
| Migration/process checks                                       | Fresh up applied 2 migrations; repeated up applied 0; full rollback passed in fixtures; compiled API live/ready returned 200; SIGTERM exited within 8 seconds; invalid environment failed startup without exposing its value                                            |
| `tests/manual/organization.mjs` with real API/DB and Chrome    | Business/location creation, rename, parent selection, terminal suspension, audit visibility and logout data clearing passed; 0 axe WCAG A/AA violations in management panel; simulated desktop bearer session could load management and lost credentials/data on reload |
| `npm run build:mobile`                                         | Android and iOS Hermes bundles and Expo web export passed                                                                                                                                                                                                               |
| `npm run build -w @inventory/desktop -- --bundles app`         | macOS ARM64 release `.app` built successfully (9.66 MiB); no signing/notarization claim                                                                                                                                                                                 |
| `npm run doctor`                                               | Exit 1: Android JDK/SDK/adb and full Xcode/CocoaPods missing; Node/environment/Rust checks passed                                                                                                                                                                       |

Validation used disposable databases; it did not migrate existing local or external databases. Apply the migration to your configured development database before using the screens. Android/iOS native builds, physical device interaction/accessibility/vault behavior, Windows build/installer and actual desktop WebView management remain unverified. Windows requires a Windows/MSVC/WebView2 host. DMG automation and production signing remain prior platform blockers; neither was attempted for this change. Whole-business directory loading and deferred RLS are the foundation limits described above. Native SDK availability and release limitations remain in [platform status](../architecture/platforms.md).

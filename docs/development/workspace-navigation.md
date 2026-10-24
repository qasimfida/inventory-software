# Browser workspace navigation repair

## Finding

The default browser route still rendered the design-system demonstration around the login panel. After login, `OrganizationModel.refresh()` listed businesses but left `selectedId` empty. Users had to discover and select a business before any existing workflow appeared. Selected businesses then rendered all workflow panels in a single long page.

## Changes and impact

| Layer                       | Change                                                                                                                                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shared organization model   | Initial load selects the first authorized active business, falling back to a visible inactive business for administration. Explicit selections are preserved on refresh. Empty membership and denied responses still clear workspace data. |
| Web entry point             | `/#/` loads `WorkspacePage`. Local component demonstrations and connection diagnostics moved to `/#/design-system`.                                                                                                                        |
| Business workspace          | Business selector, overview, permission-filtered section navigation and POS entry. Existing catalog, stock, purchasing, payable, customer, storage and transfer components are reused.                                                     |
| Administration              | Existing location, membership, business lifecycle and audit controls are grouped under Business & access.                                                                                                                                  |
| Draft lifecycle             | Workflow panels first mount when opened and remain mounted while switching sections. Business changes, access changes and logout retain the existing clearing behavior. This is not new durable online draft storage.                      |
| API, database, transactions | No changes. Existing authorization, tenant scoping, financial idempotency and stock ledger remain authoritative.                                                                                                                           |
| Offline                     | Prepared encrypted registers remain accessible before login; the production service worker includes the new route assets.                                                                                                                  |
| Platforms                   | Web navigation also serves desktop DOM clients. Native mobile keeps its native UI and shares automatic business selection. No new claim of Android/iOS/Windows native build verification.                                                  |

## Usage

Open `http://127.0.0.1:5173/#/` and sign in. Use the Business selector to switch context. Open point of sale starts checkout; Workspace sections opens the other available workflows. Business & access contains setup and user assignments. A viewer intentionally cannot see transaction workflows. An account without a business receives onboarding instructions.

For local development, `admin@example.test` has owner access to the seeded development business; use the development-only credentials documented in README. Business and inventory data are not fabricated to populate the overview.

Section selection is in memory. Reload returns to the authorized business overview. Online draft recovery across reloads is not added by this UI repair; use the existing prepared offline register for durable offline cash operations.

## Validation

Regression coverage checks automatic business selection, explicit/inactive selections, no memberships, denied access, logout and stale-response isolation. Web tests cover keyboard navigation, draft preservation between sections and removal of restricted workflows. The native management test now verifies automatic opening.

The real PostgreSQL/API/browser workflow harness uses the section menu for catalog, pricing, stock, receiving, returns, storage, transfers, customers, checkout, supplier settlements and administration. It also checks cookie reload, narrow layouts, logout, accessibility and simulated desktop bearer reload clearing. The offline browser harness checks production-shell reload and durable outbox synchronization.

Verified on 2026-10-20:

- `npm run validate`: passed formatting, foundation, lint/boundaries, strict typing, tests and API/web builds.
- Unit/component tests: 83 passed across 41 files; tooling tests: 12 passed.
- Real PostgreSQL/API/browser workflows: passed with all 18 migrations on a disposable database. Browser session reload automatically reopened the authorized business.
- Production offline browser test: passed airplane-mode reload, durable cart/outbox restart, response loss after commit, same-ID replay, exactly one sale, stock count approval and accessibility.
- Playwright design-system route: 2 tests passed at 320px and 1440px, including keyboard controls and accessibility.
- Local seeded admin, super-admin, cashier and viewer: login, automatic workspace, permission-filtered navigation and logout passed. The authenticated overview had no detected WCAG A/AA violations or horizontal overflow at 320px and 1440px.
- Strict workspace type checks and dependency checks passed. ESLint had no errors and the same six previously reviewed source-length warnings.
- API and web production builds passed. macOS ARM64 Tauri `.app` packaging passed (11.51 MiB). Native WebView/device execution and Windows packaging were not reverified.

This report covers the browser entry/navigation correction. It does not certify completion of the broader Stage 4 security and release-readiness audit.

# Phase 6 — inventory

Date: 2026-11-06. Branch: `redesign/phase-6`. Inventory module only; no commit or implementation tag. The working tree already contained earlier redesign/user changes, which were preserved.

## Inspected and scope

Read AGENTS, global/Phase 6 prompts and the four canonical guides. Traced inventory workspace, catalog/stock collections, category editor, product details/setup, price/variant/unit forms, quantities, planning/holds, bulk import/export, channels, shared clients/contracts and web/native route dispatch.

The detailed route/tab/action matrix is [phase-6-inventory/routes.md](phase-6-inventory/routes.md). The generated root routes.md/routes.json and components evidence were regenerated; `check:redesign` verifies their exact current source inventory. Existing consistent primitives and command forms were retained, not duplicated. There is no standalone brand screen or catalog hard-delete endpoint.

## Changed

- Product details: compact name/SKU/status group; responsive image/metadata columns on web and labelled native metadata. Read-only drawer metadata uses the existing RecordDetails component.
- Movement history: shared-style zebra table with exact quantities and a keyboard-accessible drawer/native panel. Every previous delta/reason/source value remains; loaded actor, location, movement and reversal references are also labelled. No detail request or invented actor name.
- Price history: existing Table/RecordTable, labelled scope/effective date/tax, explicit empty state. Values remain exact, with no new currency conversion or price calculation.
- Stock workspace: shared search and retry/empty states, refresh placed with filters. Native refresh placement matches web; stock snapshot spacing/text uses theme tokens.
- Category editing: grouped labels, consistent creation icon and concise parent/archive explanation. Same schema, parent options, versioned save and archived lock.
- Reused existing product setup sections, SKU validation, rich text, image handling, variants/units/promotions, stock adjustment drawers, selection, channel actions, imports/exports and permission-aware controls.
- Native CatalogPanel test now substitutes only the native WebView host in jsdom, following the established POS test adapter. It does not mock the catalog under test.

No shared primitive API was changed, so existing showcase examples remain applicable. No dependency was added.

## Characterization before UI work

`characterization-before.log`: **14 tests / 4 files passed before presentation edits**. New inventory characterization pins uncertain movement request identity/exact quantity/scope, category versioned mutation single-attempt behavior, confirmed-write/failed-refresh messaging and reset versus late refresh. Existing catalog-live, inventory-controls and ProductEditor tests pin cancellation, quantities and failed-draft validation. These assertions were preserved after redesign.

## Behavior and diff review

No changes to backend, runtime contracts, domain or API-client implementations; start-hash comparison is recorded in `phase-6-inventory-validation/behavior-diff.json`. No route, permission, stock/money formula, mutation payload, retry policy, scope, offline rule, price resolver, schema or migration changed. Movement drawers use local selection only. Existing primary commands and field validations remain intact.

## Exact verification

All logs and screenshots are under `phase-6-inventory-validation/`.

| Check | Result |
| --- | --- |
| Focused final Vitest command below | **55 tests passed / 24 files** |
| `npm run typecheck` | Passed, including native test TypeScript |
| `npm run lint` | Passed: 0 errors, 69 existing warnings; 1,249 modules / 7,069 dependency edges, no boundary violations |
| `npm run audit:ui` | Passed: 598 source files, 6 review findings; design guard 499 files, 133 baseline findings, 0 new groups, 5 improved groups |
| `npm run check:foundation` | Passed: 40 documents / 1,354 source files; existing size-review warnings remain |
| `npm run check:parity` | Passed: 41 shared routes; 45 web / 45 native; 9 settings each |
| `npm run redesign:inventory`, `npm run check:redesign` | Passed: 56 generated routes and exactly four canonical guides |
| Scoped `npx prettier --check` | Passed for all 22 changed source/doc files |
| `git diff --check` | Passed |
| `npm run build` | API and web production builds passed |
| `npm run build -w @inventory/desktop -- --bundles app` | macOS app build passed, 12.53 MiB |
| `npm run build:mobile` | Android, iOS and web JavaScript exports passed |

Final test command:

```sh
npx vitest run packages/api-client/src/inventory-characterization.test.ts packages/api-client/src/inventory-controls.test.ts packages/api-client/src/catalog-live.test.ts packages/api-client/src/catalog-export.test.ts packages/api-client/src/product-setup-forms.test.ts packages/api-client/src/product-detail.test.ts packages/api-client/src/product-form-feedback.test.ts packages/api-client/src/stock-planning.test.ts packages/api-client/src/import-file.test.ts apps/web/src/features/catalog apps/web/src/features/inventory apps/mobile/src/catalog apps/mobile/src/inventory
```

Initial native CatalogPanel import failure and initial native movement test's ambiguous text selector were corrected; final assertions pass. Browser selectors were corrected to click the visible radio label and explicitly reset retained inventory tab selection; no application behavior was altered to accommodate automation. An initial route check correctly rejected an appended matrix as stale; detailed module coverage now lives in its own routes.md while generated root evidence remains generator-owned.

## Browser and visual evidence

`node scripts/redesign-inventory-browser.mjs`: Chrome loopback mock, owner role, UTC/en-US, fixed date. **36 route/theme/viewport cases**, plus **12 stock captures**, five product detail tabs and four editor sections in both themes, and stock movement editor in both themes. Widths **390, 844, 1024, 1280, 1440, 1920**; 844 uses 390px landscape height, others 900px. No page overflow in asserted collection/stock states; no uncaught page errors in these runs. browser.json also contains six runtime-error summary rows, so the log's 42 entries include 36 route cases and six summaries, not 42 routes.

External HTTPS images intentionally aborted for deterministic fallback screenshots; this does not qualify real media hosting/CSP. Additional price-history table captures verify expanded tables in both themes. Visually reviewed mobile inventory, mobile stock, desktop product metadata and dark pricing; screenshots are evidence, not an exhaustive accessibility audit.

Component tests exercise read-only/denied access, details open/close, empty states, failed saves, duplicate SKU hints, exact movement values, archived category lock and scoped stock planning. Browser mock actions do not prove live transaction success. No claim that every role/state combination was manually verified.

## Performance

Production totals: **JS 1,692,819 bytes (+0.13% vs Phase 5); CSS 136,339 (+0.04%); fonts 647,236 unchanged**. Per-file raw/gzip data in bundle-sizes.json. No new dependency or unbounded fetch.

Same development POS sentinel fixture as Phase 5: cold readiness **241ms** (247ms before), warm **54/205/96/206ms**, search median **397ms** (401ms before), no runner issues. Warm median **150.5ms** versus 130.5ms crosses the 10% review trigger (~15%). Reviewed: no POS, transport, debounce or data-flow code changed; this is a small automation sample with variable readiness timing, not a production latency guarantee. Retain the evidence and remeasure under release conditions. An earlier concurrent-browser performance run is retained separately and is not the comparison run.

## Platform status and remaining limitations

- **Web:** build, Chrome mock responsiveness/themes and focused regression tests verified. Live API/database transactions not run; no TEST_DATABASE_URL configured. Existing unrelated full-suite failures from previous phases were not requalified.
- **macOS:** Tauri shared frontend/app bundle built. Installed WKWebView, signed/notarized installer, peripherals and real offline vault not tested. Prior Finder Apple-events restriction blocks DMG qualification; app build is not an installer pass.
- **Windows:** shared web code only; no Windows build/runtime available. Release gate remains open.
- **Native Android/iOS:** native component tests and JS exports passed. No emulator/device runtime, screen reader, keyboard, native WebView or storage qualification available. Browser phone widths are not native testing.
- Product/category archival remains an existing state edit without a dedicated destructive confirmation. No hard deletion or new lifecycle behavior was introduced; this is a remaining UX gap, documented rather than represented as complete.
- Category collection has search but no separate filter menu; no unsupported brand page was fabricated. Server-validated live mutation, import file picker, concurrent updates, stock reconciliation and exhaustive preference combinations need release testing.

## Files created/modified/removed

No existing files removed. Complete source/doc change list (also machine-readable in `phase-6-inventory-changed-files.json`):

- `apps/mobile/src/catalog/CatalogPanel.test.tsx`
- `apps/mobile/src/catalog/CategoryEditor.tsx`
- `apps/mobile/src/catalog/ProductPage.tsx`
- `apps/mobile/src/inventory/InventoryOverview.tsx`
- `apps/mobile/src/inventory/InventoryPanel.tsx`
- `apps/mobile/src/inventory/MovementHistory.test.tsx`
- `apps/mobile/src/inventory/MovementHistory.tsx`
- `apps/mobile/src/inventory/StockSnapshot.tsx`
- `apps/mobile/src/pricing/PricingPanel.tsx`
- `apps/web/src/features/catalog/CatalogDetails.tsx`
- `apps/web/src/features/catalog/CatalogPanel.tsx`
- `apps/web/src/features/catalog/CategoryEditor.test.tsx`
- `apps/web/src/features/catalog/CategoryEditor.tsx`
- `apps/web/src/features/catalog/ProductPage.tsx`
- `apps/web/src/features/inventory/InventoryOverview.tsx`
- `apps/web/src/features/inventory/InventoryPanel.tsx`
- `apps/web/src/features/inventory/MovementHistory.test.tsx`
- `apps/web/src/features/inventory/MovementHistory.tsx`
- `apps/web/src/features/pricing/PricingPanel.tsx`
- `docs/design-system.md`
- `packages/api-client/src/inventory-characterization.test.ts`
- `scripts/redesign-inventory-browser.mjs`

Evidence additions: phase-6-inventory.md, phase-6-inventory/routes.md, start hashes, changed-file list, validation logs/screenshots/browser JSON/bundle and performance evidence. Generated route/component artifacts refreshed. Only canonical documentation changed: docs/design-system.md (DS-075).

## Next step

Stop here for review. Resolve the documented archive-confirmation and release qualification gaps before claiming exhaustive Phase 6 acceptance. No purchasing, warehouse, transfer, sales-cash or customer module redesign started.

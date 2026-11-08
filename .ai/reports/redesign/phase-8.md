# Phase 8 — Online-store management

## Scope and inspection

Executed `.ai/prompts/redesign/phase-8.md` under the global redesign rules on branch `redesign/phase-8`. Preserved the pre-existing dirty worktree. No commit or tag was created: tagging HEAD would not capture these uncommitted changes. No Phase 9 work.

Inspected the web/native OnlineStorePage, OnlineOverview, OnlineProducts, OnlineProductPicker, OnlineProductDetails, listing summaries/history/results, OnlineStoreEditor, settings fields/details forms, availability hooks, shared online models/messages/client/contracts and existing workflow tests. Tauri consumes the web implementation. Reused existing components and settings; no dependencies added.

| Surface                                                                  | Coverage and preserved behavior                                                                                                                                   |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/online-store`                                                          | Authorized store selection, setup status, actual metrics, attention links, initial loading/error/setup states. Active includes paused listings.                   |
| `/online-store/products`                                                 | Active/Changes required/Ready tabs, search/filter/sort, cursor paging, list/grid, bounded selection, warnings, empty and pending states.                          |
| `/online-store/products/add`                                             | Existing drawer picker, debounced cancellable search, selected count, permission checks, partial results and confirmation.                                        |
| `/online-store/products/:id`                                             | Existing details/overrides, availability, source-product correction, publication commands, removal confirmation and history.                                      |
| `/online-store/settings/general`, `/fulfillment`, `/policies`, `/images` | Existing section navigation, validation, dirty draft protection, save/cancel, enablement confirmation, inherited defaults versus explicit overrides.              |
| `/online-store/settings` and existing storefront destination             | Existing compatibility/setup destinations retained. Public-site-unavailable messaging remains truthful; no public checkout or fabricated preview URL.             |
| Native online-store destinations                                         | Equivalent native overview, details/history, picker and settings retain shared models and native primitives. Route parity check passes; not device qualification. |

## Changes

- Added shared presentation metadata for publication state, availability/visibility, effective online price, quantity and record references. Both platforms render it with their existing RecordDetails components. Readiness is explicitly distinguished from publication.
- Replaced listing-history paragraphs with the established web table/native RecordTable, retaining transitions, reasons, actor references, timestamps and the 200-event bound.
- Reused the accessible web Progress component for actual setup completion. Both platforms clarify that setup does not publish products.
- Clarified the overview Active count includes paused listings; did not change counts or queries.
- Applied existing settings-tab and drawer-action layout classes; result counts use existing semantic status tones.
- Fixed two stale test assumptions: wait for login navigation before navigating, and use the current Inventory sidebar label rather than retired Catalog & pricing.
- Added a repeatable responsive browser sweep and a shared listing-metadata regression test. No new shared UI primitive needed a showcase entry; existing primitives/showcase remain unchanged.

## Files

Modified:

- `packages/api-client/src/online-products.ts`
- `packages/api-client/src/online-products.test.ts`
- `apps/web/src/features/storefront/OnlineOverview.tsx`
- `apps/web/src/features/storefront/OnlineListingSummary.tsx`
- `apps/web/src/features/storefront/OnlineListingHistory.tsx`
- `apps/web/src/features/storefront/OnlineBulkResult.tsx`
- `apps/web/src/features/storefront/OnlineStoreEditor.tsx`
- `apps/mobile/src/storefront/OnlineOverview.tsx`
- `apps/mobile/src/storefront/OnlineProductDetails.tsx`
- `apps/mobile/src/storefront/OnlineListingHistory.tsx`
- `tests/shell/online-collection-ui.spec.ts`
- `tests/shell/online-store-setup.spec.ts`

Created `scripts/redesign-online-store-browser.mjs`, this report and `phase-8-validation/` evidence. Generated route/component inventory refreshed for repository checks. No files removed. Canonical docs unchanged. The task-start snapshot, scoped source diff and changed-file manifest in the evidence directory distinguish this work from unrelated existing edits.

## Behavior preserved

No API, database, permission, pricing, stock, publication, navigation destination or preference-storage changes. Mutations retain existing confirmation, stable identity and retry rules. Availability remains separate from content readiness. Inherited product/store values and explicit overrides retain their meaning. Existing catalog correction tests verify effective prices across Catalog/Inventory/POS; online price overrides remain distinct. Offline/denied controls retain their restrictions and never report local changes as published.

## Validation evidence

Logs and screenshots: `.ai/reports/redesign/phase-8-validation/`.

| Check                                                                                     | Actual result                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pre-edit characterization                                                                 | 3 files, 23 tests passed (`before-tests.log`).                                                                                                                                                                                                |
| Targeted Vitest: storefront management/model/client, online products, readiness contracts | 5 files, 58 tests passed (`tests.log`).                                                                                                                                                                                                       |
| Native overview, bulk results, settings fields, details form tests                        | 4 files, 6 tests passed (`native-tests.log`); RN-web test environment, not a device.                                                                                                                                                          |
| Playwright online collection, follow-up, products and setup workflows                     | Final 6/6 passed in 38.6s (`workflows-final.log`). Includes source-price propagation, picker/removal/history, offline/role controls, enablement and unsaved drafts.                                                                           |
| Responsive Chrome sweep                                                                   | 12 theme/viewport cases passed: 390, 844, 1024, 1280, 1440, 1920 px; height 390 at width 844, otherwise 900. Six page routes plus picker per case, 84 screenshots; no horizontal page overflow or page exceptions. Mock data, no live writes. |
| Visual inspection                                                                         | Narrow light General settings and 1440px light overview screenshots inspected. Screenshot generation is not an automated pixel-diff pass.                                                                                                     |
| `npm run typecheck`                                                                       | Passed. Initial unused native imports corrected before final run.                                                                                                                                                                             |
| `npm run lint` / boundaries                                                               | 0 errors, 69 warnings; no dependency violations across 1,323 modules / 7,562 dependencies.                                                                                                                                                    |
| Final scoped ESLint / Prettier                                                            | 0 errors, 3 max-lines warnings; all touched files formatted. Scoped `git diff --check` passed.                                                                                                                                                |
| UI audit                                                                                  | 0 new groups, 5 improved, 6 existing review findings.                                                                                                                                                                                         |
| Parity / redesign checks                                                                  | Passed: 41 shared routes, 45 web and 45 mobile routes, 9 settings per platform; route inventory/docs check passed.                                                                                                                            |
| Foundation                                                                                | Passed: 65 documents, 1,442 source files; existing size/cohesion warnings retained.                                                                                                                                                           |
| Web build                                                                                 | `npm run build -w @inventory/web` passed.                                                                                                                                                                                                     |
| API build                                                                                 | `npm run build -w @inventory/api` completed TypeScript build. No backend changes or migrations.                                                                                                                                               |
| macOS desktop                                                                             | `npm run build -w @inventory/desktop -- --bundles app` built a 12.53 MiB `.app`. Not an installed runtime qualification.                                                                                                                      |
| Mobile                                                                                    | `npm run build:mobile` exported successfully. Not an iOS/Android installed-app build or emulator run.                                                                                                                                         |

The first browser workflow run was 3 passed / 3 failed: a post-login navigation race, a stale sidebar label, and a loading-page mismatch while build activity was occurring. After the two test corrections, the unchanged behavioral assertions passed in a quiet rerun. Both logs are retained. Hash-navigation tests emit router blocker warnings; the real sidebar unsaved-draft assertion passes, but manual URL edits remain outside that guard guarantee. Vite config-loader and color-environment warnings are retained.

The three scoped length warnings concern native product details and web overview/editor. Existing draft/confirmation and render branches remain together to avoid unrelated lifecycle refactoring; no new state machine or component duplication introduced.

## Performance

Production bundle: JS 32 files, 1,732,415 raw / 532,719 gzip bytes; CSS 4 files, 139,187 raw / 24,680 gzip bytes. Prior platform-admin run: JS 531,502 gzip, CSS 24,688 gzip. JS increase approximately 0.23%; no new library.

Development mock POS timings: cold 261 ms; warm [67, 222, 54, 207] ms, median 137 ms; search [389, 443, 389, 428, 396] ms, median 396 ms. Prior run: cold 229, warm median 129.5, search median 394 ms. Cold readiness is ~14% higher and triggers review: this is a single development sample with automation overhead, no POS/search logic changed, and bundle growth is small. A production/device performance regression has neither been established nor ruled out; repeat under controlled production conditions before qualification. No performance-script errors.

## Platform status and remaining limits

- Web: mock-backed Chrome workflows and responsive checks verified. Real API/database integration not run; `TEST_DATABASE_URL` was unavailable. No production-record writes.
- macOS: shared web UI exercised in Chrome and native bundle built; installed Tauri runtime, printing, protocol handlers and offline vault not exercised this phase.
- Windows: no Windows build/runtime host available; unverified release gate.
- Mobile: native source parity, component tests, typecheck and Expo export passed. No emulator/physical-device keyboard, safe-area, gesture or screen-reader qualification.
- Existing history API supplies actor IDs, not names. Displayed honestly as Actor reference; no fabricated user names or extra privileged lookup.
- Browser sweep primarily covers populated owner paths; error/denial/offline/draft behavior relies on focused existing workflow/model tests. Exhaustive preference combinations, large-data device stress and assistive-technology tests remain manual follow-up.
- No public customer storefront deployment or checkout added. Settings for fulfillment remain configuration, not a claim of payment-provider support.

Next step: review this phase and qualify real API/device/release targets separately. Stop here.

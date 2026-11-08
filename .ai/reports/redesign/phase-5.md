# Phase 5 — POS presentation and transaction regression protection

## Scope and inspection

Branch `redesign/phase-5`. No commit or implementation tag; no Phase 6. Read AGENTS, global/Phase 5 instructions, canonical design/security/development guides and Phase 4 report. Preserved unrelated working-tree changes. Inspected web/native PosPanel, PosCheckout, product picker, cart lines/details/discounts, PaymentReview, HeldCarts, receipt panels/printers, native scanner and cart dock; shared PosModel, sales client, retryable commands, cart-line identity, quote observer, held-cart and offline tests; traced active cart CSS across owning stylesheets.

Before screenshots remain in `phase-4-browser/` and Phase 4 validation. Starting source hashes: `phase-5-start.json` (captured after adding Step 0 tests, before UI edits).

## Step 0 characterization gate

Before any UI change, added `packages/api-client/src/pos-characterization.test.ts` and ran it with pos-model, cart-lines, held-carts, retryable-commands, offline and offline-races suites: **27 tests / seven files passed**. Evidence: `phase-5-validation/characterization-before.log`.

Pinned quote path/body, line identity and repeated-add merging, unit/quantity/discount/customer payloads, credit intent, stable idempotency key and identical uncertain retries, held-cart resume invalidation and stale-quote checkout denial. Existing suites additionally pin simultaneous submit protection, confirmed cash receipt handling, malformed/lost responses, definite rejection, late responses after reset, hold limits and offline races. These assertions were not changed after the gate; the added transport mock later received a type-only lint cleanup. Credit authorization remains server-owned: transport tests do not prove live account eligibility.

## Changed

- Held-cart controls use existing web AccordionSection/native FormSection, collapsed initially. Fields remain mounted; name/draft state and all hold/resume/discard commands and confirmation rules are unchanged. Operators retain a visible count and can expand the session-only explanation.
- Removed the empty back-toolbar row when POS is composed without a back action. Cart headings show line counts, totals visibly distinguish updating/unavailable, and narrow web layouts provide a cart jump with focus management. Existing native browse → dock → cart drawer → payment flow remains.
- Fixed a real tablet interaction failure found by browser testing: cart height/sticky constraints began at 1000px while two columns began at 1100px. Aligned the cart rules at 1100px; below it the cart is in normal document flow with internal scrolling. Quantity controls and checkout are reachable at 1024px again.
- Product cards reuse existing web/native thumbnail behavior for returned product images, including lazy web loading/no-referrer and failed-image fallback. No image hosts/CSP broadened. Native POS layout gaps now use theme tokens.
- Payment allocation uses labelled, aligned cash/credit/change values on both platforms. Existing exact formatter, paymentAllocation calculation, server quote fingerprint, validation, cash/credit fields, pending behavior and submit handlers unchanged. Card providers remain unavailable.
- Receipt drawers use a readable receipt panel and confirmed-record total heading. Exact receiptText remains intact/selectable. Web/Tauri and Expo print use readable monospace wrapping, physical page margins and black/white output independent of screen theme. Reprint still calls the existing print adapter and never changes sale/payment status. Printer-delivery success is not inferred.
- Added safe literal-text print regression coverage. Native POS test now mocks only the native WebView host so its existing real POS-component/transport fixture assertions run; this is not device qualification.
- Added `scripts/redesign-pos-browser.mjs` for repeatable POS viewport/theme/interaction evidence. Corrected missing browser-global annotations in the prior Phase 4 generated navigation harness so repository lint can inspect it. No application behavior changed by that tooling correction.

## Preserved boundaries / existing behavior

No PosModel/sales/cart/held/offline domain implementation, API contract, stock/tax/discount/pricing calculation, permissions, transaction, retry/idempotency, backend or migration changed. Characterization expectations remain intact. Product/customer reads remain bounded and cancellable with existing debounce; no entire-dataset fetching. Barcode Enter searches and does not automatically add; actual camera scanner still requests native permission, returns a code and closes. Unit/location/discount edit capabilities and restrictions remain as implemented, not invented for this redesign.

Offline grants, prepared/encrypted storage, local pending/remote acknowledgement distinctions, cash-only restrictions and uncertain-outcome recovery are unchanged. No new synchronization system, payment provider or business feature. Grid remains the existing product-discovery view; no new listing mode was invented. Existing stock/availability errors and real server confirmation remain authoritative.

## Verification

- Before gate: **27/27 tests, seven files**.
- After UI changes: **37/37 tests, 14 files**, comprising the unchanged gate plus web/native POS panels, native checkout, held-cart interaction, cart lines/thumbnail and safe print tests.
- TypeScript: root typecheck passed; subsequent web production build and native test typecheck passed after additional presentation changes.
- Lint: **0 errors, 69 existing warnings**, dependency boundaries passed (1,245 modules, 7,024 dependencies). New browser script/characterization lint checked separately.
- Design audit: 595 source files, six review findings (two added physical-print black/white literals are intentional); regression guard has 133 baseline findings, zero new groups, five improved groups. No baseline reset.
- Desktop CSP guard test passed. Parity/docs/foundation results and final build evidence retained with logs under `phase-5-validation/`.
- Characterization and component tests use mocked transport. Real PostgreSQL/payment/stock integrations were not exercised: no isolated TEST_DATABASE_URL. Full unrelated repository suite not rerun; prior unrelated navigation/native-host failures are not claimed resolved.

## Platform status

| Platform      | Verified                                                                                       | Not qualified                                                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Web           | Production bundle, POS browser interactions/themes/viewports, component/print invocation tests | Live server checkout/credit/uncertain recovery, physical scanner/printer, assistive technology                                      |
| macOS Tauri   | Shared web build and native `.app` build                                                       | Installed app, actual printer/scanner, high-DPI runtime, signing/DMG/notarization; prior Finder DMG permission blocker remains      |
| Windows       | Shared presentation and CSP checks                                                             | Windows-host build/installer/WebView2/hardware unavailable                                                                          |
| Native mobile | Android/iOS/web JS exports, type checks and native-component tests through RN Web host         | No emulator/device runtime; camera, keyboard/safe areas, VoiceOver/TalkBack, actual Expo printing and offline storage not qualified |

## Browser evidence and visual review

Focused Chrome mock transport checks exercise light/dark at 390, 844 (390px landscape height), 1024, 1280, 1440 and 1920px. Assertions cover repeated-add merge, increment/decrement, search-only Enter behavior, narrow cart jump, held draft/resume and cash allocation review. No final checkout is submitted through the mock UI; the component/transport suites cover its command semantics. Screenshots/JSON are under `phase-5-validation/`. Initial 1024px pointer-interception failure is retained in logs; it led to the breakpoint fix rather than a forced click or weakened assertion. Visually reviewed desktop and tablet cart screenshots.

Final browser run: **12/12 viewport/theme cases passed**, no measured page overflow. Held-cart resume and payment review passed; screenshots show the corrected 1024px stacked cart and desktop checkout footer. Browser fixture uses local mock data and configured image fallbacks, not production transactions.

Final builds: macOS `.app` (12.53 MiB), web production bundle and Android/iOS/web JavaScript exports passed after the responsive fix. Native test typecheck passed. Scoped Prettier for all **25 source/document files** and git diff whitespace checks passed. Exact files: [phase-5-changed-files.json](phase-5-changed-files.json). No source removed; only canonical guide updated is `docs/design-system.md` (DS-074). The new characterization test is included; no dependencies added.

Production chunk totals: JS **1,690,647 bytes**, CSS **136,279 bytes**, fonts **647,236 bytes** (unchanged). Raw/gzip per-file breakdown is in `phase-5-validation/bundle-sizes.json`; totals are not initial payload. POS cold list 247ms (Phase 4: 238ms), warm 53/206/55/207ms, search median 401ms (Phase 4: 376ms). All measured changes are below the 10% review trigger; small local samples are not production INP or hardware qualification.

Final parity: 41 shared routes, web/native 45 each, nine settings destinations each; passed. Canonical docs/redesign checks passed (56 route rows, four guides); foundation passed (39 documents, 1,349 source files), with existing size-review warnings. Hash comparison confirms PosModel, sales client, cart-line and held-cart implementations unchanged. Final 37-test run passed again after the breakpoint/label fixes.

## Remaining risks / next step

Review the POS refinement. Complete real backend transaction and platform/hardware qualification before release, particularly uncertain-outcome recovery across restart, native scanning and physical receipt printing. Native test-host mocks and mock-browser screenshots cannot substitute for these checks. No subsequent redesign phase started.

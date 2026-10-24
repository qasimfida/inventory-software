# Empty states, filters, notifications and reconnect synchronization

October 24, 2026. Scope: existing web, shared Tauri frontend and Expo native clients. No new dependency, migration, payment provider or business workflow was introduced. The worktree already contained earlier UI/domain work; those changes were preserved.

## Implemented behavior

- Enhanced collection feedback now has an icon, visual title, description and optional authorized action. The catalog differentiates genuinely empty data from filtered results; only a writable unfiltered catalog offers Add product. Search misses provide guidance without an unrelated create action. API errors retain useful messages and an explicit retry, including POS/catalog/inventory/notifications/security. Simple mode remains compact. Native string/whitespace children found during checks were corrected.
- Applied filters use a shared count badge and a hover/focus summary on web/desktop; native uses accessible summaries and filter panels. Catalog badges reflect applied values, not an unsubmitted barcode. Catalog, POS, customers, registered businesses, notifications, audit and security filters reuse this pattern where applicable.
- Catalog bulk import sits beside New product. Export shown products writes a CSV of the currently loaded products, including exact base-unit prices, currency and unit. It uses existing platform save/share adapters, escapes quotes and spreadsheet-formula prefixes, and is disabled for empty results. **This is not an export of every paginated record or every variant's price history.** Existing bulk import/template validation is unchanged.
- Business notifications use the shared search/filter/refresh toolbar, semantic card surface and zebra table; unread status uses badges rather than replacing row backgrounds. Security notifications/logs also use a card surface, search, outcome filtering and retry. Audit history adds action/user filters, current actor email (ID fallback), and its existing before/after detail drawer. Security events show actor/outcome/details. Audit/security filtering is explicitly limited to loaded records; it does not silently download a complete history.
- POS detects unavailable API readiness and automatically offers the cached register when its live cart is empty/unlocked. An existing live or uncertain cart is preserved. Ready-state recovery starts synchronization immediately for an unlocked register; the existing recovery timer/backoff remains. Eligible commands drain in protected batches of 20. Progress counts server-confirmed records, not bytes sent or optimistic saves.
- Active local synchronization appears in the header notification menu with progress/counts and View synchronization result. Web has a dismissible completion/attention toast; native uses an accessible in-flow notification. The result drawer lists retained operation states, confirmed sale IDs and errors. Local activity is ephemeral and clears on lock; the encrypted outbox is durable and distinct from the business inbox.
- Transient background session/workspace read failures no longer discard a verified workspace. Original session expiry still applies; denied/malformed verification, logout and background/visibility locks still clear access. Server authorization and separately expiring cash grants remain authoritative.

## Impact map

| Layer                 | Actual change                                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shared presentation   | AsyncState, FilterButton, StateDemo/NativeShowcase, catalog actions, table containers and toolbars                                                                 |
| Organization read API | BusinessService.events adds nullable actorEmail from the existing account; audit.read and tenant/store/warehouse predicates unchanged                              |
| Contracts             | Optional actorEmail on audit events, compatible with older responses; no schema migration                                                                          |
| Local persistence     | Existing encrypted IndexedDB/SQLite adapters and vault format reused; no new persisted settings or storage keys                                                    |
| Sync                  | SyncEngine confirmation callbacks/batch draining, OfflineWorkspace task state, ephemeral syncActivity; stable IDs, claims, conflict outcomes and backoff preserved |
| Session lifecycle     | useSession and OrganizationModel.revalidate distinguish transient background read failures from denied access; original expiry retained                            |
| Platforms             | DOM UI shared by web/macOS/Windows shell; native components independently render the same states and task feedback                                                 |

## Verification evidence

- Unit/component tests: **262 passed in 122 files**. Includes enhanced/simple feedback, retry, filtered/unauthorized creation visibility, tooltip keyboard behavior, sync progress/attention/result cleanup, session expiry/revocation, lost upload-response replay, and native preference combinations.
- Tooling tests: **14 passed** (including native text children and dependency-rule regression checks).
- PostgreSQL integration: **14 passed in 6 files**: organization lifecycle/isolation, notifications, sync, sync conflicts and sync security. Real isolated databases ran migrations; test databases were retained. Actor-email responses and cross-business denial were checked. No application migration was added.
- Workspace TypeScript checks passed. Lint passed with **0 errors, 33 file-size warnings**; dependency boundaries passed. Existing large coordinator files remain; the extra sync lifecycle belongs with the vault owner, and notification/catalog composition retains existing command ownership. Security-event rendering was extracted rather than duplicating it in the panel. These size warnings are not a clean-lint claim.
- Production web/API build, macOS ARM64 `.app` packaging (12.27 MiB) and Android/iOS/Expo-web JavaScript exports passed.
- Chrome against the local API: enhanced catalog no-match icon/title/description, no empty-search creation action, filter count/tooltip, notification toolbar/card, actor email/details, failed-request retry recovery, automatic offline fallback, and restoration detection. The offline check advances browser time beyond the 60-second background revalidation interval and retains the bounded workspace. Notification layouts checked at **390, 768 and 1440 px** without page overflow; no page errors. See `browser.json` and screenshots.
- Android 16 emulator / Expo Go: cashier POS and enhanced empty-search title/description/icon exercised with real login. Preferences were restored after testing; no checkout was submitted. See `android.txt` and screenshot.
- macOS bundle launched successfully. Authenticated native macOS workflows, Windows runtime and native iOS runtime were **not verified**; Windows is unavailable here and the iOS native toolchain is unavailable. Mobile JavaScript export does not establish native device parity.

## Boundaries and remaining limitations

Offline capability still requires online preparation, an open shift, a separate encrypted-register passphrase and a valid bounded cash grant. A cold/locked vault cannot be silently decrypted. Credit, refunds, purchasing and stock adjustments remain online; no unsafe general last-write-wins synchronization was introduced. Vite development does not provide offline reload; production web's existing service worker and native bundles supply the shell.

The browser interruption test verifies connection/session/fallback behavior; it does not claim that a live browser cash sale was posted during that test. Financial replay/conflicts were exercised through the real PostgreSQL integration suite and encrypted-vault tests. End-to-end device interruption during a submitted sale remains a deployment qualification task. Task activity is local to the active unlocked register, not a new durable server notification type.

No complete historical audit query, full-catalog export, unprepared offline browsing of every page, or production-readiness claim is made. Existing appearance preference storage and precedence are unchanged.

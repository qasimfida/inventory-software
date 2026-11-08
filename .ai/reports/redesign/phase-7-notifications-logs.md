# Phase 7 — Notifications and logs

Scope: notifications-logs only. No commit or tag. No dependencies, schema, API, authorization, financial/stock calculations or retry identities changed. Existing unrelated work preserved.

## Inspected and changed

- Business inbox keeps server search/read filters, cursor pagination, exports, read/unread/dismiss commands, approval queue and admin-only failure resources.
- Web/desktop and native notification drawers now use existing RecordDetails with event context, actor, full time and read status. Web drawer descriptions no longer suggest saving read-only records.
- Business audit drawers replace raw JSON with labelled before/after evidence. Nested keys, exact string amounts, false, zero, empty arrays/objects and references are retained; nothing is calculated or inferred. Full timestamps use the business timezone. Unknown actor names are explicitly unavailable.
- Business event labels separate words for readability while the original event code stays in details. Audit actions are right-aligned; event/time rows are separated.
- Account/platform security drawers use the same detail pattern, independently of business audit history. Failed security events use error tone; denied events remain warning.
- Platform delivery failures and diagnostics use distinct columns and the existing native RecordTable; failure codes remain exact. A missing failure code is “Not recorded”, not incorrectly “Queued”. Retry callback and disabled state are unchanged.
- Security view selectors identify the selected view on web with aria-pressed and neutral styling.
- Approval review separates title, status and document reference. Existing reason validation, load/refresh, callbacks and stable mutation keys remain intact.
- Web inbox/audit/security refresh controls reuse the tooltip-bearing IconButton.
- No new UI primitive: existing showcase components were reused, no separate styling system introduced.

## Routes and coverage matrix

| Route / surface                           | Review and behavior retained                                                                                      | Verification                                                                                                              |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| /notifications business inbox             | Loaded table, actor/title/time, read/unread/delete, search/read filter, export, cursor paging, busy/error/empty   | Existing command characterization passed; Chrome both themes at six widths, details opened without mutations              |
| /notifications approval queue/review      | Purchase/transfer/count references; paged queue; load/error/refresh; authorized approve function; reason; pending | Shared approval test preserves stable retry key after uncertain response; UI inspected, live approval not posted          |
| /notifications business delivery failures | business.write guard, attempts/failure resources, failed-only retry                                               | Source review; fixture has no failures, no live retry verification                                                        |
| /logs business audit                      | audit.read guard, actor/action/search over loaded records, cursor load-more, immutable details                    | New exact-evidence UI test; Chrome responsive drawers; no detail request added                                            |
| /logs security center                     | Platform administration visibility distinct from business audit                                                   | Superadmin mock checks own events, detail, delivery empty state and diagnostics                                           |
| Settings security center                  | My events, security inbox, platform events/deliveries/diagnostics only for platform administrators                | Shared SecurityPanel inspected; security detail regression passed. Settings entry itself not separately browser exercised |
| Security inbox                            | Existing new-device notification details and mark-read                                                            | Shared details component reused on both platforms; real delivery/session revocation not tested                            |
| Header notification preview               | Existing NotificationMenu and inbox route interaction unchanged                                                   | Not redesigned; no new badge/polling behavior                                                                             |
| Native equivalents                        | notifications/*, organization/AuditHistory, settings/SecurityPanel/SecurityNotifications/LogsPage                 | Type checked and exported; not installed/emulator-qualified                                                               |
| Tauri                                     | Reuses actual web screens and existing adapters                                                                   | macOS .app build passed; installed runtime unverified                                                                     |

## Verification evidence

- Before UI edits: 4 files, 7 characterization tests passed.
- Final focused tests: 7 files, 11 tests passed (NotificationTable, SecurityEvents, AuditHistory, security-presentation, approval-review, notification-time, audit-presentation).
- Full workspace typecheck passed; final native typecheck passed after the native detail composition change.
- Full lint: 0 errors, 69 warnings. Final scoped lint: 0 errors, 3 file-length warnings. Existing large coordinator components retained to avoid workflow refactoring.
- Dependency boundaries: 1,321 modules, 7,541 dependencies, no violations.
- Browser: 12 inbox/business-log cases across 390, 844, 1024, 1280, 1440, 1920px, both themes. Height 390 at width 844, otherwise 900. Drawers and horizontal page overflow checked; no runtime page errors.
- Security browser: 4 cases at 390/1440px light/dark, own event details, delivery empty state and restricted diagnostics. No mutations submitted.
- Screenshots visually reviewed: 390px light audit details and 1440px dark diagnostics. Browser tests are mock transport evidence, not live permission proof.
- Web production build and macOS Tauri .app passed (.app 12.53 MiB).
- Expo Android/iOS/web exports passed. No Android/iOS native runtime claim.
- UI audit: 0 new groups, 5 improved groups; 6 review findings remain.
- Route parity: 41 shared routes, web/mobile 45 each, settings 9 each; passed.
- Route/docs checks passed after regenerating evidence; canonical guides unchanged.
- Foundation check passed: 63 documents, 1,438 source files (before this report).
- Production JS: 31 files, 1,729,380 bytes raw / 531,256 gzip; CSS: 4 files, 139,236 / 24,688. No heavy dependency introduced.

## Boundaries and limitations

- Business notification access and retries remain in NotificationsService with business scope; security platform reads/retries still require requirePlatformAdmin. Client presentation never grants authority.
- No TEST_DATABASE_URL available; live database integration, cross-tenant denials, approval execution and durable delivery retries were not run. No migration needed.
- No Windows build/runtime available. macOS installed/signing/updater, native emulator/device, VoiceOver/TalkBack and offline restart qualification remain unverified.
- Not every pending/error/large-data/preference combination was injected. Search semantics, pagination and original mutation states are retained rather than expanded.
- No future-stage work started. Next step is review and real test-environment qualification, not automatic advancement.

## Files and artifacts

- apps/web/src/features/notifications/NotificationTable.tsx
- apps/web/src/features/notifications/ApprovalReview.tsx
- apps/web/src/features/settings/SecurityPanel.tsx
- apps/web/src/features/settings/SecurityNotifications.tsx
- apps/web/src/features/organization/AuditHistory.tsx
- apps/mobile/src/notifications/NotificationTable.tsx
- apps/mobile/src/notifications/ApprovalReview.tsx
- apps/mobile/src/settings/SecurityPanel.tsx
- apps/mobile/src/settings/SecurityNotifications.tsx
- apps/mobile/src/organization/AuditHistory.tsx
- apps/web/src/features/settings/SecurityEvents.tsx
- packages/api-client/src/index.ts
- apps/web/src/features/notifications/NotificationsPanel.tsx
- apps/web/src/features/organization/AuditHistory.test.tsx
- packages/api-client/src/audit-presentation.ts
- packages/api-client/src/audit-presentation.test.ts
- scripts/redesign-notifications-logs-browser.mjs
- scripts/redesign-security-browser.mjs
- Generated route/component evidence and validation artifacts updated; no files removed.

## Performance smoke

- cold POS list readiness: [234] ms; median 234 ms.
- search to matching suggestion and filtered cards (debounce included): [370, 418, 394, 438, 374] ms; median 394 ms.
- warm POS list readiness: [60, 198, 55, 210] ms; median 129.0 ms.
- Development mock Chrome timing only, not production INP. Compare previous team/staff: cold 260ms, warm median 127ms, search median 407ms. No POS or debounce code changed; variability requires controlled production measurement before a performance conclusion.

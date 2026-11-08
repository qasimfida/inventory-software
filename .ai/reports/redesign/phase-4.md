# Phase 4 — global shell, overview and settings

## Scope / inspected

Branch `redesign/phase-4`; no commit or implementation tag (DEV-036 requires an authorized reviewed commit). Preserved the pre-existing dirty tree. Read AGENTS, global/Phase 4 instructions, canonical design/development/architecture and relevant security boundaries. Starting source hashes: `phase-4-start.json`; before comparison: `phase-3-verified/` and its recovered captures.

Inspected web AppShell/Header/Sidebar/WorkspaceSwitcher/ProfileMenu/WorkspaceScreens/SettingsPage; native NativeShell/NativeHeader/MoreScreen/Navigation/SettingsScreen/NativeStatus; shared route visibility, preference resolver/model, report/setup contracts and clients; dashboard and setup consumers; existing shell/overview refinement sheets; Tauri window/CSP configuration. Reused existing mature implementations rather than rebuilding them.

## Changes

- Web/Tauri sidebar collapse and bounded width now survive reload in device-local `inventory.sidebar.layout`. It contains only collapse and width; no account, business, credentials or transactions. Restricted/malformed storage safely falls back to the canonical default. Keyboard and pointer resizing remain available.
- Single-destination navigation groups render direct links; expanded multi-destination groups retain accessible accordions. Collapsed navigation renders every permitted destination without redundant accordion controls. Native More applies the matching single-destination rule. Exact route matching prevents a parent destination being marked active alongside its child. No destination or compatibility path removed.
- Reduced inter-group sidebar gaps, added token-based visible link focus, preserved independently scrolling navigation and pinned workspace/profile identities. Sidebar toggle now uses the real tooltip primitive. Business switcher remains in sidebar/native More; warehouse context and notification/search/status entries retain their existing scope.
- Preferences on web/native now group Basic (theme, density, control size), Advanced style/typography, Advanced accessibility/performance, and regional/list behavior. Existing controls and save calls remain. Compacted the token-based typography/palette preview and removed duplicate panel padding; verified this final settings-only adjustment separately. Web displays current effective presentation and live reduced-motion override; native describes resolved values and device constraints. No settings precedence, persistence, defaults or account policy changes in this phase.
- Overview setup is a consistent information panel using actual server completion flags, counts, completed/needs-attention labels and existing authorized destination links. Native renders the equivalent surface and status labels. No invented setup data or additional requests; existing polling/cancellation and access guards remain.
- Unknown native destinations no longer receive the misleading “Platform overview” header. `/admin` retains that label; existing unknown-route handling remains authoritative.

Exact 20 created/modified source/document paths: [phase-4-changed-files.json](phase-4-changed-files.json). No source deletion, dependency addition, API/schema/migration change or backend change. Only canonical guide updated: `docs/design-system.md` (DS-073). Added feature-local EffectiveAppearance and device-layout helper plus focused tests; no duplicate shared component system.

## Reused / preserved

| Phase requirement               | Existing implementation retained / result                                                                                                                                                                                                                       |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell and responsive navigation | Existing viewport-height sidebar, sticky header, Vaul mobile navigation, pinned profile, scroll containers, global search and notification menus; refined state and navigation presentation                                                                     |
| Business overview               | Existing permission-scoped KPI, inventory, trend, recent-sales/top-product panels; date/currency/location scope and authoritative amounts unchanged; improved setup panel                                                                                       |
| Settings architecture           | Existing nine destinations: Profile, Company, Business, Preferences, Security, Device, Notifications, Locations, Audit; staff/users compatibility paths unchanged; account/business/platform/device boundaries retained                                         |
| Appearance stability            | Existing Phase 3 account resolver and tests retained; business switching does not apply cosmetic business policies; no new preference store                                                                                                                     |
| Shell states                    | Existing session checking/expiry, onboarding/no business, switching lock, offline/connection status, denied access, platform admin, unknown route and lazy loading retained; route/state mock captures provide visual coverage, not live security qualification |
| Tauri                           | OS-provided window chrome/drag behavior retained; no custom drag region over controls. Existing Cmd/Ctrl+K shortcut, minimum window dimensions and explicit image-host CSP preserved; allowlist guard tests pass                                                |
| Native                          | Native More/header/preferences/setup equivalents updated. Existing SafeAreaView, keyboard avoidance, bottom navigation, guarded back navigation and native overlays retained                                                                                    |

Dashboard's current API uses UTC and gross sales before returns; this phase preserves and labels that behavior, rather than silently claiming business-timezone/net-of-return analytics. Those calculation changes require separate domain scope. No chart/metric data, financial calculation, permission, session, checkout, offline, API retry or export behavior changed.

## Verification

- Focused Vitest: **39/39 tests in 11 files passed**. Includes sidebar persistence/failure fallback, collapsed/direct navigation, keyboard resize, web/native settings, setup server flags/store-scope denial, dashboards, settings model/contracts and shared route authorization.
- Tooling: **4/4 tests passed** (desktop CSP and design guard).
- Final web TypeScript and native test TypeScript checks passed. Earlier root typecheck caught a nonexistent summary property and an incomplete fixture; both corrected and verified with final scoped checks. API/shared compilation passed during build pipeline.
- ESLint: **0 errors, 69 existing warnings**; boundaries passed (1,244 modules, 7,013 dependencies). Final new-file lint passed. All 20 changed files pass Prettier. `git diff --check` passed. Whole-repository formatting was not rerun; Phase 3's pre-existing prompt/generated-evidence formatting debt remains.
- Foundation passed (38 documents, 1,346 source files), with file-length review warnings. Redesign/docs check passed: 56 route rows and four concise canonical guides.
- Parity passed: 41 shared routes, web/native 45 each, nine settings destinations each.
- UI audit: 595 source files, four existing review findings. Design check: 499 files, 133 baseline findings, zero new groups, five improved groups. No baseline reset.
- Web production build passed through final Tauri build. API compilation passed in the initial root build; that initial root build failed at web on the subsequently corrected summary typing error. Mobile Android/iOS/web JS exports passed.
- macOS: `npm run build -w @inventory/desktop -- --bundles app` passed, producing a 12.53 MiB `.app`. No DMG/signing/notarization claim; prior Finder automation blocker remains for DMG packaging.
- Targeted Chrome navigation passed: collapse survives reload/re-authentication, keyboard resizing, Cmd+K/Escape, Basic/Advanced preferences, mobile navigation drawer closes on destination with no page overflow. Mock authentication is intentionally memory-only; initial harness assumption of a persisted session was corrected, not application auth.
- Full repository suite and real-database integration not rerun in this scoped phase. Phase 3's two legacy navigation assertion failures and four native WebView/Flow import blockers remain open. TEST_DATABASE_URL is unavailable.

## Platform status and release risks

Web/browser checks use loopback mocks, not production records. Native exports and React Native Web-backed tests do not verify real VoiceOver/TalkBack, keyboard/safe-area behavior or native storage. No usable Android/iOS emulator runtime was available. Windows installer/WebView2 runtime unavailable on this macOS host. macOS `.app` compilation is not installed-app qualification: printing, vault storage, deep links, high-DPI/OS resizing, CSP-host loading and updates still require real hardware tests. No native integration or host permission was altered.

Production output totals across all chunks (not initial payload): JS **1,687,955 bytes** (+0.20% vs Phase 3), CSS **135,341 bytes** (+0.21%), fonts **647,236 bytes** (unchanged). Raw/gzip file breakdown: `phase-4-validation/bundle-sizes.json`. No heavy dependency, unbounded query or debounce change.

## Browser evidence

Broad sweep: **264 captures**, zero measured document overflow, zero recorded theme mismatch; 11 issue records relate to external images intentionally blocked by the mock runner. **43 supplemental editor/cart/role captures** completed with no reported errors or overflow. Widths: 390/1,440 for the broad light/dark route sweep; additional POS/inventory/preferences checks at 844, 1,024, 1,280 and 1,920px. Before evidence is preserved in Phase 3; no baseline artifacts overwritten.

The final settings preview spacing adjustment was made after this sweep: settings tests passed again (5/5), web/macOS/mobile were rebuilt, and the preferences view was recaptured at 390/1,440 in light/dark under `phase-4-validation/preferences-*-final.png`. Other sweep screenshots remain evidence for the unchanged routes. Inspected desktop overview and preferences visually.

Development-mock timings: cold POS list 238ms (Phase 3: 260ms); warm 67/192/51/211ms; search median 376ms (Phase 3: 403ms), including debounce and automation. No timing-run issues. These small localhost samples are not production INP/device qualification. Logs, source hashes, screenshot records, navigation assertions and bundle sizes are retained in `phase-4-browser/` and `phase-4-validation/`.

## Next step

Review this global-shell/settings refinement. No Phase 5 work started. Release remains gated by the platform/runtime and existing suite limitations above, not by build success alone.

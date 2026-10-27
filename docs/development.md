# Development and verification

## Setup and commands

Use Node 24.x and npm 11.x (pinned packageManager in root package.json), one root lockfile and npm workspaces. Run `npm ci`, `npm run setup`, `npm run doctor`, then `npm run dev` for web/API plus repository-local PostgreSQL. Setup preserves existing environment files; use the workspace `.env.example` files, never commit credentials. PostgreSQL binaries must be on PATH or under `PG_BIN`.

Default local ports: web 5173, desktop 5174, API 3100, Metro 8081, isolated PostgreSQL 5433. Do not kill unrelated processes to free ports. `npm run db:local -- stop` preserves repository-local data. Verify API readiness before exercising database workflows.

| Task            | Command                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------ |
| Independent dev | `npm run dev:web`, `dev:api`, `dev:mobile`, `dev:desktop`                                        |
| Native launch   | `npm run android`, `npm run ios`; requires SDK/emulator or hardware                              |
| Code quality    | `npm run format:check`, `check:foundation`, `check:parity`, `lint`, `typecheck`                  |
| Tests           | `npm test`; `npm run test:integration` against isolated test PostgreSQL                          |
| Browser         | `npm run test:web:browser`; shell scenarios use their existing Playwright config                 |
| Build           | `npm run build` (API/web); `build:mobile` (JS export); `build:desktop` (host native tools)       |
| Audit inventory | `npm run audit:ui` writes source/route evidence under artifacts, not docs                        |
| Demo            | Existing `dev:mock:web/mobile/desktop` and `db:seed:dev/showcase/transactions`; never production |
| Deployment      | `npm run package:api`; `package:desktop:remote` or `package:desktop:local`                       |
| Backup          | `npm run db:backup -- --help`; verify restore into an isolated destination before release        |

Web/desktop need a valid `VITE_API_BASE_URL`; native uses its existing `EXPO_PUBLIC_*` origin. Client values are embedded/public. Production HTTPS, API CORS and exact desktop CSP media origins must agree. `DESKTOP_IMAGE_ORIGINS` is an explicit HTTPS allowlist, not `https:*`. Android emulator host access normally uses 10.0.2.2; real devices need a reachable permitted API. Never weaken production TLS for local development.

Migrations are versioned files under `apps/api/migrations`, executed explicitly using the API workspace's `db:migrate`; never edit applied migrations or auto-migrate at app startup. Inspect workspace scripts for exact options. API artifacts deploy independently: inject production config/secrets, migrate, start. Desktop local-network edition requires a separately deployed server/database; it is not an embedded multi-device database.

## Workflow and reusable commands

1. Read AGENTS, then only the relevant guide. Inspect actual implementations, routes, models, schemas and consumers before editing.
2. Record impact: source/permissions → transaction → contracts/events → cache/outbox → web/native/desktop adapters → tests. Mark absent layers and unknowns.
3. Extend existing components and models; keep scope and business behavior explicit. Target cohesive 100–150-line sources; review >200 and record justified exceptions in `scripts/source-size-exceptions.json`.
4. Validate success/failure, permissions, isolation, retries, rollback and relevant preference/device states. Review final diff; preserve unrelated changes and do not commit.
5. Report exact commands/results, actual screen/role/viewport evidence, unrun checks, blockers and follow-up. Build success is not runtime qualification.

`/milestone`: implement only named items after confirming their current scope; old milestone specs are historical inputs, not blanket authority. If only a number is given and its detailed spec is unavailable, ask for that scope before implementing.
`/milestone-1-decisions`: review existing accepted decisions in architecture/security guides; do not execute business features from a decision review.
`/parity-check`: inspect registries, route visibility, native equivalents, adapters and failure/offline states; run check:parity and record tested versus code-only coverage.
`/visual-qa`: inspect every applicable route/role with existing mock fixtures; test responsive/theme/preference/error/empty/offline states, fix in scope, record screenshots and results under `artifacts/qa`. Never fabricate production data or device results.

## Release qualification

Record artifact version/hash, OS/browser/device, role/scenario and result; checklist remains open until evidence exists for that artifact.

| Gate          | Web                                                             | Windows                                                               | macOS                                                                |
| ------------- | --------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Build/install | Production Vite deploy, HTTPS/CSP/SW                            | Windows-host Tauri installer, signing/WebView2, clean install/upgrade | Target-architecture Tauri app/DMG, signing, notarization, Gatekeeper |
| Runtime       | Real API login/navigation/POS/receipt/stock/roles               | Installed app, narrow/fullscreen, lock/restart                        | Installed WKWebView app, resize/lock/restart                         |
| Offline vault | IndexedDB quota/eviction, offline reload, grant expiry and sync | SQLite WAL, concurrent claims/crash/disk pressure/upgrade             | SQLite WAL, interruption/permissions/sleep/upgrade                   |
| Printing      | Actual supported browser/printer, cancel/reprint                | Actual scanner/printer/driver and cancelled print                     | Actual scanner/printer, native dialog and cancellation               |
| Deep links    | Configured HTTPS invite/recovery, invalid/expired/replay        | Installed inventory: registration, cold/warm/single-instance          | Launch Services inventory:, cold/warm/single-instance                |
| Remote images | Trusted allowlist/error placeholder, no private leakage         | Emitted CSP, actual WebView2 hosts/TLS denial                         | Emitted CSP, actual WKWebView hosts/TLS denial                       |
| Updates       | Old/new shell compatibility, no forced checkout reload          | Signed replacement/update preserves vault/outbox                      | Signed/notarized replacement preserves vault/outbox                  |
| Real hardware | Offline/reload, scanner/printer, browser accessibility          | Physical supported Windows host and peripherals                       | Physical Mac for every advertised architecture/peripheral            |

Android/iOS are parity targets, not launch gates: JS export is insufficient. Qualify signed native install, SQLite/SecureStore, safe areas/keyboard, TalkBack/VoiceOver, links, camera/printing, process death and sync on emulator plus relevant physical hardware. Missing tools/devices must be reported, not bypassed.

CI plan (not installed): Linux quality + isolated PostgreSQL integration + web build/browser artifact; Windows runner with Rust/MSVC/WebView2 installer build; macOS runner with Xcode/Rust app/DMG build. Publish checksummed artifacts/logs. Keep signing/notarization secrets on protected release jobs; do not expose to untrusted PRs. Physical-device/peripheral gates remain manual.

## Documentation history

There are exactly four active guides in this folder; AGENTS is the short root entry point and README is startup only. Keep new decisions/invariants in the owning guide; put component prop detail in typed source and examples in the showcase. Do not add stage diaries or duplicate instructions here.

The consolidation preserved every original docs file, including untracked specifications/prompts and QA evidence, in `artifacts/documentation-consolidation/original-docs.tar.gz`; `manifest.json` contains paths, byte counts and SHA-256 hashes verified against the archive. Archive paths start with `docs/`. Root instructions/README also have a separate snapshot. This is a local ignored archive, not a committed or remote backup: retain it when transferring this work and recover a historical spec from it when explicitly needed. It is historical evidence, not automatically active instructions.

Generated screenshots/data now live under `artifacts/qa`; executable parity exceptions live in `scripts/parity-exceptions.json`. Tests/tools write outside docs. Workflow wrappers point here instead of deleted prompt paths. Source scan evidence is `artifacts/ui-audit/source-inventory.json`; it distinguishes limited static checks from visual review.

## Current audit evidence

Documentation consolidation and UI preference audit: 2026-10-26. All 536 web/native TS/TSX/CSS files were read by the inventory scanner, including import relationships and route registry coverage. This is whole-source inventory, not a claim of manual visual or semantic review of every page. The two retained literal-color findings are physical barcode rendering, which must stay black/white.

Fixed undefined web badges, shape preference on web/native badges and native cards/fields, 17 unscaled CSS text rules, sync-toast elevation/foreground, 200% text overflow in the identity showcase, and duplicate sibling keys shared by inventory planning/overview on web and native. Existing settings storage, policy precedence, API contracts, permissions, financial calculations and routes are unchanged.

- Source/parity: 536 files scanned; 40 shared / 42 web / 42 native routes, 9 settings routes each; no registry mismatch. Two literal-color findings are deliberate physical barcode black/white. `validate` now checks UI regressions and exactly four flat docs files.
- Unit/tooling: `npm test -- --maxWorkers=2`: 156 files, 374 tests passed; 25 tooling tests passed. Typecheck passed; lint passed with 55 pre-existing warnings and zero errors; formatting, foundation and diff checks passed.
- Browser: installed Chrome used because bundled Playwright Chromium is absent. Six preference/showcase tests passed, then eight preference/showcase tests plus four responsive/accessibility tests passed across runs after correcting 4px overflow at 200% text. The CSS preference matrix covers 1,080 combinations at 320/1440px, with additional five-font form/table/menu checks and a separate inventory duplicate-key regression; this is not a persistence test of each combination.
- Screens: mock route sweep completed 828 role/theme/viewport checks (seven roles, light/dark, 390/768/1440px), zero detected overflow, unexpected alerts or page exceptions. Screenshots/results: `artifacts/qa/screens/web` and `artifacts/qa/web-matrix.json`. Representative POS and dark Preferences screenshots were visually inspected; all 828 were not manually reviewed.
- Builds: API/web production build, Expo Android/iOS/web exports and macOS ARM64 `.app` passed. No migration required. Database integration/real transaction tests were not run for these presentation/documentation changes.
- Runtime limits: Android 16 emulator/Expo Go mock smoke covered sign-in, overview, POS and Preferences navigation with dark theme/teal selection and Inventory display (which exposed the duplicate-key warning fixed on both clients); this is not a signed APK or hardware/storage qualification. macOS app launch is not authenticated workflow qualification. Windows unavailable; iOS simulator unavailable (`simctl` missing); hardware printing, offline crash/recovery, release signing/installer/update and exhaustive native screen checks remain unverified.

Remaining presentation limits: native local-machine fonts fall back; native surfaces intentionally remain flat (enabling effects does not add shadows everywhere); simple charts may use lightweight inline SVG and native summaries. Source scanning and mock routes do not establish complete semantic review or live transaction correctness for every component. Continue any deeper workflow/device audit with the same evidence distinction, not new duplicate docs.

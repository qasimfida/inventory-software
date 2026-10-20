# Command 3 validation — 2026-10-19

Scope: establish workspace/application boundaries and smoke coverage. No business screens, tables, migrations or native integrations were added.

## Corrections

- Added independent development/test/type-check/lint/build interfaces across six workspaces; shared prerequisites build automatically. API builds prepare only contracts, not client packages.
- Added npm engine enforcement while retaining Node 24.13.0 in `.nvmrc`, npm 11, one source lockfile and existing framework versions.
- Strengthened import enforcement for backend UI/native dependencies, mobile browser implementation imports, desktop cross-app source imports, and an explicit shared dependency allowlist. Negative probes now run outside live source.
- Added actual browser-entry mounting, mobile entry registration/rendering, real Nest bootstrap, compiled shared-package exports and native Tauri context smoke coverage. Added jsdom solely for entry tests.
- Corrected Expo TypeScript base extension for Vite test compatibility; reused existing strict compiler/lint policies and aliases.
- Added separate test/production environment templates, deterministic test inputs, explicit HTTPS production client builds, and API production startup without automatic local dotenv loading.
- Added an API-only deployment artifact with production startup, compiled contracts and a pruned runtime lockfile. No client/runtime SDK is required to install or launch it.

## Validation evidence

| Validation                                                                                                           | Result                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `npm run validate`                                                                                                   | Formatting, foundation links, lint/boundaries, TypeScript, tooling/application tests and API/web builds pass          |
| `npm run test:tooling`                                                                                               | 12 passed, including 8 forbidden-import probes and existing setup/icon/lint checks                                    |
| Vitest suite                                                                                                         | 21 passed in 8 files                                                                                                  |
| `npm test -w @inventory/contracts -w @inventory/api-client -w @inventory/api -w @inventory/web -w @inventory/mobile` | Each workspace independently passes: contracts 1, api-client 4, API 12, web 3, mobile 1                               |
| `npm test -w @inventory/desktop`                                                                                     | Shared web tests pass; Rust desktop context test 1 passed                                                             |
| `npm run typecheck -w @inventory/desktop`                                                                            | Web TypeScript and native Cargo checking pass                                                                         |
| `npm run lint -w @inventory/desktop`                                                                                 | Web ESLint and Rust formatting pass                                                                                   |
| `npm run build:production -w @inventory/web` with explicit HTTPS origin                                              | Production web bundle builds                                                                                          |
| `npm run build:production -w @inventory/mobile` with explicit HTTPS origin                                           | Android, iOS and Expo web exports build                                                                               |
| Missing/HTTP production client origin probes                                                                         | Both web and mobile reject missing or insecure explicit origins                                                       |
| `npm run package:api`                                                                                                | Produces ignored API-only runtime artifact                                                                            |
| Artifact `npm ci --omit=dev --ignore-scripts --no-audit --no-fund`                                                   | 144 runtime packages installed; no React, Expo, Vite or TypeScript in the pruned lock                                 |
| Artifact copied outside the repository and launched with production settings                                         | Liveness HTTP 200 with `{"status":"ok"}`; no source workspace or UI dependencies available                            |
| Production API with disabled database TLS                                                                            | Startup rejected by real environment validator; artifact forces production even with a development parent environment |

The isolated API smoke checks liveness and production configuration, not a production database connection. Root validation and application smoke tests do not require or mutate a real database. The separate PostgreSQL integration command remains available with `TEST_DATABASE_URL`.

## Remaining blockers and limits

Android and iOS native device builds remain blocked by missing JDK/Android SDK and full Xcode/CocoaPods respectively. JavaScript exports and mocked Expo registration do not establish native runtime coverage. Windows native validation requires a Windows host; macOS Rust tests do not substitute for it. Release signing/notarization, peripheral integration and browser E2E are not implemented. Existing upstream dependency advisories from the prior audit remain outside these boundary corrections.

See [workspace boundaries and commands](workspace-boundaries.md) for configuration, deployment and platform responsibilities. Development files and generated artifacts remain ignored; production examples contain placeholders only. `npm ls --depth=0` and `git diff --check` also pass. The artifact smoke process was shut down and its temporary external directory removed after validation.

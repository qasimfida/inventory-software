# Foundation verification — 2026-10-19

This is the historical Command 1 record. See the [Command 2 audit](foundation-audit.md) for current corrections and results. This is not a guarantee for subsequent changes. No business workflows were implemented.

## Commands executed

| Check                                                          | Result                                                                                                          |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `npm ci`                                                       | Passed; lockfile reproducible, advisory findings below                                                          |
| `npm run validate`                                             | Passed: format, 19 Markdown documents, 35 source files, ESLint/boundaries, TypeScript, tests and web/API builds |
| `npm test`                                                     | 12 tests passed across 3 files                                                                                  |
| `npm run test:integration` with disposable `TEST_DATABASE_URL` | 1 real PostgreSQL test passed                                                                                   |
| `npm run db:migrate -w @inventory/api` twice                   | Passed after restricting the runner to SQL files; metadata initialization/repeat run verified                   |
| Compiled API readiness smoke check                             | Passed against the disposable PostgreSQL cluster                                                                |
| `npm run dev -w @inventory/api` and web equivalent             | Both started and served expected HTTP responses; processes stopped afterward                                    |
| `npm run build:mobile`                                         | Android and iOS Hermes exports passed                                                                           |
| `npm exec -w @inventory/mobile -- expo install --check`        | Dependencies up to date                                                                                         |
| `npm run build:desktop`                                        | Blocked: Cargo not installed                                                                                    |
| `git diff --check`, Git ignore checks, Node dev-script syntax  | Passed; no tracked deletions; examples remain trackable and secrets/build outputs ignored                       |

## Verified scope

- npm workspace dependency installation and lockfile; shared ESM/declaration imports resolve in Node, Vite and Metro.
- Strict TypeScript for applications, shared packages and test/tooling code; ESLint with typed promise checks, React Hooks and DOM accessibility rules; dependency-cruiser reports no forbidden imports/cycles.
- Unit/HTTP tests cover environment validation, API client validation, security headers, CORS, error envelopes, liveness/readiness and request validation.
- API TypeScript compilation and Vite production build pass. Initial web bundle baseline: about 347 kB JS (110 kB gzip), plus lazy foundation page 82 kB (24 kB gzip), and 16 kB CSS (4 kB gzip). These are build measurements, not device performance measurements.
- Expo exports Android and iOS Hermes JS bundles successfully (about 2.2 MB each). This does not build/install an APK, AAB or iOS application.
- PostgreSQL integration and migration runner are exercised against a fresh disposable local PostgreSQL 18 cluster, separate from the existing server. Empty migration runs exercise metadata setup/repeatability, not future business-schema upgrades.

## Native and operational limitations

- `npm run build:desktop` was attempted and failed before compilation because `cargo` is not installed. Rust compilation, Windows packaging and macOS packaging are unverified. Cargo.lock must be generated with the real toolchain.
- Full Xcode is absent (`xcodebuild -version` reports Command Line Tools only); Android adb is absent. Mobile native builds, emulator/device execution, signing, peripherals and storage adapters were not verified.
- No UI browser E2E/device acceptance suite, offline launch/cache, IndexedDB/SQLite adapter, credential store, authentication, tenant business data or synchronization exists.
- No cloud, CI provider, container, deployment or paid service was added. Release identities, icons, code signing, HTTPS endpoints, CSP and secret provisioning need environment-specific setup.

## Dependency findings

`npm audit` after updating tsx to 4.23.15 reports 22 advisory nodes (7 moderate, 15 high), all through mobile tooling dependencies. The underlying findings are `braces` (nested-pattern denial of service), `node-forge` (signature verification), and `uuid` via `xcode` (buffer bounds). At verification, registry latest versions of braces (3.0.3) and node-forge (1.4.0) remain affected. The suggested Expo/React Native major downgrades are not compatible fixes for this scaffold and were not applied. Do not use this as release approval; resolve/reassess with upstream compatible updates before distribution and avoid untrusted build inputs.

ESLint 9 is marked unsupported by npm; it is retained for the current JSX accessibility plugin's declared peer compatibility. Upgrade the lint stack together when compatible. No peer dependencies or security checks were forcibly bypassed. The earlier esbuild advisory was removed by the compatible tsx update.

Use [README](../../README.md) for reproducible commands and [platform setup](../platforms/setup.md) for prerequisites. Native source presence, JavaScript export and production hardware support are separate claims.

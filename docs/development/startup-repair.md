# Startup repair — 2026-10-19

Scope: make the existing application shells start reliably. No business features were added. Existing changes and `prompt.txt` were preserved.

## Reproduced and corrected

- `npm run dev` failed with “Missing script”. Added a combined web/API launcher and `npm start` alias, with child shutdown handling and an early occupied-port check.
- Web startup failed because its API environment was missing. Added `npm run setup` and root development hooks to create missing example environments without overwriting custom settings. Two regression tests cover preservation/idempotency and occupied-port rejection.
- API port 3000 was already occupied by Docker; 3001 was occupied too. Set the example/default API port to 3100 and updated all client examples and desktop CSP. Existing Docker services were left running.
- Database examples referenced an unprovisioned account. Added a repository-owned PostgreSQL development cluster on loopback port 5433, with data in ignored `.local/postgres`. The combined launcher starts it only for the exact example URL; custom database URLs are left to the developer. Existing PostgreSQL on port 5432 was left unchanged. Development credentials are unsuitable for deployment.
- Web and desktop used the same strict port. Desktop now uses 5174 while browser web uses 5173; API CORS examples allow both.
- Desktop had no Rust toolchain. Installed Rust/Cargo 1.99.1 through Homebrew, resolved native dependencies, and generated `apps/desktop/src-tauri/Cargo.lock`. Homebrew also installed/upgraded Rust's supporting libraries.
- Added root Android/iOS aliases and targeted prerequisite checks. Missing native SDKs now produce actionable diagnostics before attempting generation/compilation.

## Validation results

| Command / check                                                            | Result                                                                                                                                       |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run validate`                                                         | Exit 0: formatting, foundation checks, lint/boundaries, TypeScript, 8 tooling tests, 17 Vitest tests, API and web builds                     |
| `npm run lint` and `npm run format:check` after final launcher diagnostics | Exit 0                                                                                                                                       |
| `node --test scripts/startup.test.mjs`                                     | 2/2 passed; also included in the 8 tooling tests                                                                                             |
| `npm run dev`                                                              | Web and API started together; web HTTP 200 on 5173 and API readiness HTTP 200 with `{"status":"ok"}` on 3100                                 |
| `npm run db:local` repeated                                                | Exit 0; reused the existing repository cluster and database, including after stop/start                                                      |
| `TEST_DATABASE_URL=<local-development-url> npm run test:integration`       | Exit 0; 1/1 real PostgreSQL integration test passed                                                                                          |
| `npm run dev:mobile`                                                       | Metro started; port 8081 `/status` returned `packager-status:running`                                                                        |
| `npm run build:mobile`                                                     | Exit 0; Android and iOS Hermes bundles exported, about 2.2 MB each                                                                           |
| `npm exec -w @inventory/mobile -- expo install --check`                    | Exit 0; dependencies up to date                                                                                                              |
| `npm run dev:desktop`                                                      | Native macOS debug compilation succeeded and `target/debug/inventory-desktop` launched; frontend HTTP 200 on 5174 while web also ran on 5173 |
| `npm run build -w @inventory/desktop -- --debug --bundles app`             | Exit 0; produced a 26.54 MiB macOS `.app` bundle; launched the packaged executable successfully                                              |
| `npm run android`                                                          | Exit 1 at prerequisite check: JDK and Android SDK/adb missing                                                                                |
| `npm run ios`                                                              | Exit 1 at prerequisite check: full Xcode and CocoaPods missing                                                                               |
| `git check-ignore` for all three `.env` files and local PostgreSQL data    | All ignored                                                                                                                                  |

## Remaining platform limits

Android native binaries/emulators are unverified until the JDK, Android SDK and device/emulator are installed. iOS requires full Xcode, simulator and CocoaPods; only Command Line Tools are installed. Follow [Expo environment setup](https://docs.expo.dev/get-started/set-up-your-environment/). The Android emulator uses `http://10.0.2.2:3100`; an iOS simulator uses loopback. Physical phones require a reachable LAN API address and an explicit development interface binding. Restart Metro after changing public environment variables.

Windows native execution requires a Windows machine with MSVC/WebView2 and Rust; macOS verification does not establish Windows support. See [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/). Signing, notarization, production installers and hardware integrations are outside this startup repair. Earlier dependency advisory findings in the [foundation audit](foundation-audit.md) have not been resolved by these startup changes.

## Run locally

Run `npm run dev` for browser web/API. In separate terminals run `npm run dev:desktop` for macOS or `npm run dev:mobile` for Metro. Run `npm run doctor` to inspect native prerequisites; after installing them use `npm run android` or `npm run ios`. `npm run db:local -- stop` stops the dedicated PostgreSQL cluster without deleting its data. See [README](../../README.md) for configuration details.

Test web/API/Metro/desktop processes were stopped after validation to release their ports. The isolated PostgreSQL cluster remains available on port 5433; the launcher also starts it when needed.

## Follow-up: Expo browser preview

The reported `react-native-web/dist/exports/ActivityIndicator` resolution failure occurred when opening the mobile app in Expo web. The earlier Android/iOS bundle checks did not cover this target. Installed Expo-compatible `react-native-web`, `react-dom` and `@expo/metro-runtime` in the mobile workspace and updated the npm lockfile. Mobile builds now export web alongside Android and iOS, so this target is checked regularly. Added localhost/127.0.0.1 port 8081 to the development API CORS example and this checkout's local API environment. Restart a running API to load those environment changes.

Verified: `npm run build:mobile` exit 0 for all three targets; mobile TypeScript and repository lint/boundaries exit 0; `expo install --check` reports dependencies up to date. The actual Metro browser preview served HTML and its development JavaScript bundle with HTTP 200. This verifies the reported module-resolution failure is corrected; native device verification remains separate.

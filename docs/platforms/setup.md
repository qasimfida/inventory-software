# Platform feasibility and setup

Approved foundation: React/Vite web, Tauri 2 desktop, Expo SDK 58 / React Native 0.88 mobile, NestJS 12 API. These are scaffolds, not qualified POS device releases. [Platform status](../architecture/platforms.md) records the distinction.

## Feasibility decisions

| Capability                 | Web                                                                  | Windows/macOS                                                    | Android/iOS                                                                              |
| -------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Local durable transactions | IndexedDB adapter planned; quotas/eviction must be tested            | SQLite through a Tauri plugin or Rust boundary planned           | Expo SQLite planned; native migration/crash tests required                               |
| Credentials                | Browser session threat model pending                                 | OS credential store or Stronghold with explicit key lifecycle    | Expo SecureStore planned; not bulk business storage                                      |
| Barcode input              | Keyboard-wedge scanners; browser camera permission path              | Keyboard-wedge scanners; vendor drivers require OS qualification | Expo Camera or vendor native SDK via development build                                   |
| Printing/cash drawers      | Browser printing is limited; not equivalent to raw receipt protocols | Rust/plugin/vendor driver adapter per printer and OS             | Vendor SDK/network printer/native module; iOS restrictions require testing               |
| Updates                    | Web deployment and future versioned offline app shell                | Signed Tauri updater/installer planned                           | Store-native releases; optional signed JS updates only within native compatibility rules |

This assessment supports scaffolding both native stacks: they expose native extension points and suitable storage mechanisms. It does **not** establish support for unspecified printer protocols or peripheral models. Select actual hardware and validate libraries, licensing, permissions, disconnect recovery and platform coverage before accepting a device feature. Keep Electron/alternate mobile delivery as fallback decisions if a required device cannot be supported.

## Web

Install from root; copy the example web environment and run `npm run dev:web`. Hash routes work both in a browser and Tauri packaged files. The foundation page is lazy-loaded. `VITE_API_BASE_URL` is a public origin compiled into the web bundle; set it for each build. Missing or invalid configuration fails development/build startup. Shared origin validation also checks runtime client construction. Supply the web `.env` or `VITE_API_BASE_URL` explicitly when validating in automation.

Tailwind design tokens live in `apps/web/src/styles.css`. System fonts avoid a network font dependency. Use the spacing scale, responsive widths and semantic token colors. `components/ui/Button.tsx` comes from shadcn's new-york-v4 registry, with only local utility/scoped Radix imports adapted. `components/common/AsyncState.tsx` owns reusable loading/empty/error/retry states. Keep keyboard focus and text alternatives visible. Future forms use native semantics plus shared schema validation; introduce a form library only when complexity justifies it. React state owns this shell's transient status; TanStack Query is deferred until reusable remote-query state exists.

## Desktop

Install Rust stable/Cargo and the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for the host OS. macOS needs Apple tools; Windows needs MSVC build tools and WebView2. Run `npm run dev:desktop` or `npm run build:desktop`. Builds reuse `apps/web`; Tauri's target selection is host-specific. Do Windows packaging on Windows and macOS packaging on macOS. Commit the generated `Cargo.lock` when native dependencies resolve successfully.

The shell grants no native commands/plugins yet. Production CSP restricts assets and connection origins; development CSP additionally permits the local Vite refresh/websocket connection; update `connect-src` to the exact HTTPS API origin for deployment. Allow the matching Tauri origin in API CORS (`tauri://localhost`, `http://tauri.localhost`, or `https://tauri.localhost` depending on host). Those exact local origins are exceptions to the production HTTPS-browser-origin requirement; they grant no authorization. A simple foundation SVG and required PNG/ICO/ICNS assets are included because Tauri reads an icon at compile time. Regenerate with `npm exec -w @inventory/desktop -- tauri icon app-icon.svg --output <temporary-directory>` and retain only the six desktop files already listed under `src-tauri/icons`; mobile/Appx outputs are not used. Signing, notarization, replacement branding, installer identity and updater keys are release tasks; default identifiers must be replaced before distribution.

## Mobile

Expo provides npm-workspace-aware Metro resolution; do not add duplicate Metro resolver hacks. Run `npm run dev:mobile` for Metro. `npm run build:mobile` exports Android/iOS Hermes bundles and the Expo web preview; this proves bundling only. Press `w` in Metro to preview the mobile UI in a browser. Expo-compatible `react-native-web`, `react-dom` and `@expo/metro-runtime` are declared in the mobile workspace. API CORS must allow the preview origin (localhost or 127.0.0.1 on port 8081); the development example includes both. `npm run android -w @inventory/mobile` and `npm run ios -w @inventory/mobile` generate native projects and compile using local SDKs. Generated native directories are ignored under Expo's generated-project workflow; encode persistent changes in app configuration/config plugins.

Full Xcode/CocoaPods and Apple signing are needed for iOS; Android SDK/JDK/device or emulator for Android. Run `npm run doctor` for current host prerequisites. Native Android requires Android Studio, its SDK, a compatible JDK, and an emulator or USB device. iOS requires full Xcode with an installed simulator and CocoaPods; Command Line Tools alone are insufficient. Use local native builds for future custom printer/scanner modules; Expo Go is not sufficient proof of those integrations. Define supported OS/device versions with device acceptance, rather than claiming every version supported by React Native is product-qualified.

Copy `.env.example`; use `10.0.2.2` for an Android emulator's host API, loopback for iOS simulator, or a reachable HTTPS/LAN origin on real devices. API defaults to loopback: explicitly bind an appropriate development interface to test over LAN. Release builds must use HTTPS; do not globally weaken native transport security to make development HTTP work. Client environment values are embedded and public. Offline/background work must survive OS suspension; no assumption of continuously running mobile sockets.

Evidence: [Expo monorepos](https://docs.expo.dev/guides/monorepos/), [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/), [Expo SDK modules](https://docs.expo.dev/versions/latest/), [Tauri Stronghold](https://v2.tauri.app/reference/javascript/stronghold/), [shadcn manual setup](https://ui.shadcn.com/docs/installation/manual). These establish available integration paths, not implemented adapters.

The latest verification and corrections are recorded in the [foundation audit](../development/foundation-audit.md). The earlier Command 1 report is a historical snapshot.

## Development startup troubleshooting

Run `npm run setup`, then `npm run dev` for web/API. The example API port is 3100; web uses 5173, desktop uses 5174, Metro uses 8081, and the isolated development PostgreSQL cluster uses 5433. If a port is occupied, stop the other dev session or update the corresponding configuration; the launcher does not terminate unrelated programs.

Install PostgreSQL if `npm run db:local` reports missing binaries. Set `PG_BIN` to the directory containing `pg_ctl`, `initdb`, `psql`, and `createdb` when needed. `npm run db:local -- stop` stops only the repository-owned cluster and preserves its data. The API readiness endpoint must return 200 before database-dependent work.

For native setup follow [Expo environment setup](https://docs.expo.dev/get-started/set-up-your-environment/) and [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/). After installing the required tools, run `npm run android`, `npm run ios`, or `npm run dev:desktop`. Windows desktop compilation and execution require a Windows host; the macOS build does not verify Windows.

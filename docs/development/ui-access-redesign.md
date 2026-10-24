# Workspace access and UI refinement

This change responds to the failed-session screenshot and the neutral inventory-layout reference.
It builds on the design foundation; business rules, endpoints, schema and permissions are unchanged.

## Inspection and impact map

| Layer                                | Existing implementation and change                                                                                                                                                                                                                                                                                                           |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication authority             | Nest auth guard, origin checks, Strict/HttpOnly cookies and native bearer validation retained. No server bypass or token persistence added.                                                                                                                                                                                                  |
| Browser transport                    | Reproduced `localhost:5173` → `127.0.0.1:3100`: login 201, no saved cookie, then session 401. Vite now proxies `/api` to the configured backend; web auth and health use the page origin in development. Desktop and production keep the explicit API origin.                                                                                |
| Session presentation                 | Web and native saved-session checks treat 401 as signed out; invalid login and protected operations retain safe authentication errors. Network errors are still shown. Visibility, offline locking and expiry remain enforced.                                                                                                               |
| Expo web                             | Development loopback API host follows the page's loopback alias to preserve Strict cookies; no remote/production rewriting. Native continues using the configured API and SecureStore.                                                                                                                                                       |
| Tokens                               | Canonical CSS now supplies neutral light/dark surfaces and a warm primary accent, including sidebar/table states. Teal preference, system theme, typography/density and motion settings remain supported. Native exports are regenerated. Control colors change atomically to preserve contrast through theme changes.                       |
| Web/macOS/Windows UI                 | Compact shared header/sign-in layout, permission-aware icon rail, catalog filters/cards/details, explicit missing-image and empty states, top-level New product action, collapsible category/session administration. Business policy lives in Business & access.                                                                             |
| Native UI                            | Connection/appearance tools collapse above sign-in. Touch section buttons open one workflow at a time; visited sections preserve drafts, unvisited sections avoid queries. Fixed an empty error string rendered directly inside the native catalog View, detected while exercising Expo web. Business administration has its own disclosure. |
| Persistence, schema, financial rules | Unchanged. Existing catalog clients, validations, prices and stock services reused. Cards do not fabricate prices, balances, ratings or product images.                                                                                                                                                                                      |
| Tests and documentation              | Added session-host, signed-out-state, product detail/action tests; updated workflow navigation tests and common-component examples/usage.                                                                                                                                                                                                    |

## Local demonstration data

Created **Design Review Store** with four clearly identifiable `DEMO-*` product records using the
existing development administrator and real UI/API. No stock, prices, financial balances or
production accounts were fabricated. Other local records were retained. Workflow validation
uses a separate disposable PostgreSQL database and invitation-created test account.

## Validation

| Check                                                | Actual result                                                                                                                                                                                                                                                                       |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run validate`                                   | Passed formatting, foundation, lint/boundaries, all workspace type checks, 13 tooling tests, unit tests and web/API builds. Six existing file-length lint warnings; zero errors.                                                                                                    |
| Final `npx vitest run`                               | 149 tests in 74 files passed, including the new native rendering regression. Final native type check also passed.                                                                                                                                                                   |
| `PLAYWRIGHT_CHANNEL=chrome npm run test:web:browser` | 7 Chrome checks passed: light/dark at 320/1440 px, keyboard controls, system appearance, text/density/effects and motion.                                                                                                                                                           |
| Real API/browser workflows                           | All 17 workflow groups passed using 23 migrations in disposable PostgreSQL: organization, catalog/pricing, stock, purchasing/returns, transfers, customers/POS/payables, reports, settings, recovery and both loopback hostnames. No authenticated 401s in the hostname regression. |
| Populated development UI                             | Created one business/four products; light/dark whole-page axe checks, 375px layout and cookie reload passed. Screenshots inspected.                                                                                                                                                 |
| Expo web                                             | Actual `localhost:8081` login, protected four-product catalog and reload passed; Strict/HttpOnly cookie verified. Final run had no empty-text rendering error.                                                                                                                      |
| Android emulator                                     | Android 16 ARM64 / Expo Go: login, SecureStore session restoration after process restart, business selection, workflow navigation and real catalog records verified. Screenshot captured.                                                                                           |
| macOS WebView                                        | Actual `tauri://localhost`, Tauri marker and bearer path verified; login 201, protected business/settings/products/categories 200, product detail and logout passed. Initial unsigned session 401 is expected.                                                                      |
| Mobile build                                         | `npm run build:mobile` exported Android, iOS and web successfully. This does not certify signed native installers.                                                                                                                                                                  |
| Desktop build                                        | `npm run build -w @inventory/desktop -- --bundles app` built an 11.56 MiB macOS ARM64 app; relaunched the final bundle. Packaged binary checked for absence of temporary automation hooks.                                                                                          |
| Diff review                                          | No dependency, schema, business-rule or authorization changes introduced by this refinement; unrelated existing work preserved. `git diff --check` passed.                                                                                                                          |

The web entry retains an existing ~521 kB chunk warning; the catalog remains lazy-loaded
(~15.75 kB minified), and no visualization engine or new dependency was introduced.
Windows cannot be built on this macOS host; full Xcode/iOS Simulator is unavailable. Android verification uses an actual Android
16 emulator with Expo Go. macOS WebView automation uses an isolated instrumented Tauri host
with the same application bundle/security configuration, a separate app identifier and temporary
DOM-driving code outside the repository. This is distinct from browser bearer simulation and
does not add a test backdoor to the delivered application.

## Operational limitations

Production web still needs same-site HTTPS API hosting (or a configured same-origin reverse
proxy) and explicit allowed origins. Start the backend for desktop use; desktop session tokens
are deliberately ephemeral and a new login is required after reload/restart. Native packaging,
signing, printers/scanners and Windows/iOS device qualification remain separate work.
The optional product-image display requires actual image URLs. Desktop's existing CSP blocks
remote image hosts; it shows the image fallback until operators approve image-host deployment
policy. Product cards do not display stock or price estimates that are absent from the catalog
contract. The rest of the business screens retain their existing functional layouts.

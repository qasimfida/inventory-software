Read AGENTS.md and follow it. Do not commit.

Scope: all platforms (web, Windows, macOS, mobile). Web/desktop share DOM UI; mobile gets native equivalents of every fix. Launch-gated platforms are web, Windows, macOS, so prioritize their verification.

Goal: make the app look and behave like a real multi-page application, make mock data show every feature on every platform, then run the app everywhere and fix whatever looks bad or doesn't work.

IMPORTANT: the shell, header search, theme toggle and settings already partly exist. Check each item below against the current code first and fix only what is actually wrong or missing. Don't rebuild what already works.

## 1. App shell

Header (sticky, token-styled): page title/breadcrumbs, global search (Ctrl/Cmd+K command palette on web/desktop, native search on mobile), light/dark/system theme toggle (persisted), notifications bell with unread count, offline/sync status.
- No "signed in as" label, business selector or create-business control anywhere in the layout chrome.

Sidebar:
- Groups by functionality (e.g. Overview, Sales/POS, Inventory, Purchasing, Customers, Finance, Reports, Administration), icon + label, route-driven active state, collapsible to an icon rail, items hidden when the user lacks permission.
- Height is exactly the viewport (100dvh). Three parts: fixed brand top, middle nav area with its own overflow-y scroll, and a user profile section pinned to the bottom that is always visible however long the nav is.
- Profile menu (opens upward): name/email, active business name (plain text linking to Business settings), Profile, Preferences, theme toggle, Sign out. Keyboard accessible, closes on outside click/Escape.
- Mobile: bottom tabs for the 4-5 primary areas, a "More" screen grouped like the sidebar, stack headers with icon back buttons, profile and theme controls on a Profile screen.

Business management:
- Business switching and creating live on a Business settings page, plus a first-run onboarding screen when the user has no business. Respect invitation-based onboarding and server authorization.

## 2. Auth screens

- AuthLayout only: logo, centered card (web/desktop) or full-screen form (mobile). No settings panel, no offline cash register section, no business controls, no nav.
- Move offline cash register setup and device settings to Settings > Device & Offline (post-login, permission-gated). If something must be configured before login (e.g. API origin on desktop), put it behind a small "Connection" link in advanced mode.
- Login: email, password, show/hide icon, a plain "Forgot password?" text link (no accordion), validation, loading and error states.
- Recovery is invitation/operator based. Follow docs/security/authentication.md. The forgot screen explains the process; the reset screen validates the token on load (clear expired/invalid state), takes new password + confirm with strength indicator, revokes sessions, then goes to login. Check that the recovery link opens correctly per platform (web HTTPS route, mobile universal/app link with custom-scheme fallback, desktop deep-link plugin with single-instance handling). Fix gaps; document config in docs/deep-linking.md.

## 3. Controls and settings UX

- Plain on/off settings use a Switch (label + description). Few exclusive options use a segmented control or radio group. Many options use the design-system Select. No checkbox or dropdown for a plain on/off.
- Settings pages use a sub-navigation (Profile, Business, Preferences, Security, Device & Offline, Notifications, Users & Roles, ...), one concern per page, sections in cards, clear save/cancel.
- Every screen has a PageHeader, an icon back button when not a root screen, a loading skeleton, an empty state with action, an error state with retry, and an offline state where relevant.
- Fix dropdown sizing (per-size height, trigger width, menu min-width, max-height with scroll, edge flipping, portal rendering so modals/tables don't clip it) and every unstyled or off-system component. Replace hardcoded values with tokens; add missing tokens to packages/design-tokens/tokens.css and run npm run build:shared.

## 4. Mock data

- Check what mock/seed data exists. Extend it; don't create a second system. It must be enabled only by an explicit env flag, excluded from production builds, and never bypass real server authorization.
- Cover every module: businesses and roles, users, catalog/categories/pricing, stock, ledger movements, counts, purchasing/suppliers/invoices, transfers, storage hierarchy, customers and credit, POS sales/receipts/cash shifts, reports, inbox/approvals, notifications, audit/device logs, settings.
- Realistic data with enough rows for pagination and search, plus edge cases (empty module, long names, low stock, overdue credit, error response, offline). Add a dev-only switcher for scenario (normal / empty / error / offline) and role (owner, manager, cashier).
- Add npm scripts for running each platform in mock mode. Document in docs/development/mock-data.md.

## 5. Run everywhere and fix loop

Run each platform in mock mode and walk every route as every role:
- Web: Playwright at tablet and desktop widths, light and dark. Screenshots to docs/qa/screens/web/.
- Desktop: run Tauri dev on this machine's OS. For the OS you can't run, build only if possible and mark it "Not verified" with the reason. Never claim runtime verification you didn't do.
- Mobile: run via Expo on an Android emulator or the available target and capture screenshots of every route. For iOS, run only if tooling exists here, otherwise mark "Not verified". Fix bottom tabs, More screen, headers, touch targets, keyboard overlap and safe areas.
- Fix the desktop CSP so trusted HTTPS product images render without opening img-src to arbitrary hosts. Document the allowed-host approach.
- Per screen check: sidebar height/scroll/sticky profile menu, header, spacing and alignment, overflow/clipping, dropdown sizing, unstyled components, contrast in both themes, keyboard/focus, touch target size, console errors, broken links/routes, missing states.
- Fix every issue, re-run, repeat until a full pass is clean. Log in docs/qa/report.md: screen, platform, issue, fix, status (Fixed / Blocked / Not verified).
- Add Playwright smoke tests for the shell (sidebar scroll + sticky profile menu, theme toggle, search, route guards, auth layout isolation).

## 6. Finish

Run lint, typecheck, test, build (and build:mobile / build:desktop where tooling exists). Report exact results, what couldn't run on which platform, backend follow-ups and decisions you made. Update docs/routes.md and docs/development/stage-history.md. No production-readiness claims.
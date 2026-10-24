# POS & inventory platform

A multi-business POS/inventory platform under development. Invitation-based authentication, scoped permissions, catalog/pricing, an immutable stock ledger, purchasing, storage and transfers have web/Tauri and native mobile screens. Customer credit, POS, cash shifts, receipts, returns/refunds, bounded offline cash sales, stock counts and supplier payable settlement are implemented. Cash is the only approved tender. External payment providers remain disabled. Stage 6 adds explicit business trading and a limited double-entry journal/source-posting foundation. Native scaffolding is not proof of hardware or release readiness. See the [Stage 3 workflow report](docs/development/stage-3-workflows.md) and [offline rollout](docs/development/offline-rollout.md).

## Setup

Use Node.js 24.x (tested 24.13.0) and npm 11.x (tested 11.6.2). One npm lockfile covers all workspaces.

```sh
npm ci
npm run setup
npm run db:local
npm run db:migrate -w @inventory/api
npm run db:seed:dev
npm run dev
```

The commands above use the default local PostgreSQL configuration; with your own `DATABASE_URL`, start that database instead of `db:local`.

`npm run setup` creates missing environment files without overwriting existing settings. `npm run dev` starts web and API together. With the example database URL it also initializes/starts an isolated local PostgreSQL cluster on port 5433, stored in ignored `.local/postgres`. PostgreSQL binaries must be installed (set `PG_BIN` if they are not on PATH; Homebrew PostgreSQL 18 is detected automatically). This loopback-only cluster uses development credentials and must never serve production. An existing database on port 5432 is left alone. To use your own database, set `DATABASE_URL` in `apps/api/.env`; the combined launcher then skips local provisioning. Stop the local database separately with `npm run db:local -- stop`. The API validates environment settings at startup; production requires verified database TLS and explicit HTTPS/desktop origins. Client-prefixed variables are public and must never contain secrets. Web/desktop development and production builds fail early if `VITE_API_BASE_URL` is missing or invalid; set the example web environment or supply it explicitly. See [migrations](docs/development/migrations.md) and [security](docs/security/authorization.md).

See [organization management](docs/development/organization-management.md) for migration, onboarding, permissions and platform validation. Apply migrations with `npm run db:migrate -w @inventory/api` before using authentication or management.

## Applications and commands

Start with `npm run dev` (or `npm start`). Run additional clients in separate terminals from the repository root. `npm run doctor` reports missing native prerequisites:

| Target         | Develop               | Build / check                                                              |
| -------------- | --------------------- | -------------------------------------------------------------------------- |
| Web            | `npm run dev:web`     | `npm run build -w @inventory/web`                                          |
| API            | `npm run dev:api`     | `npm run build -w @inventory/api`; `npm run start:local -w @inventory/api` |
| Mobile         | `npm run dev:mobile`  | `npm run build:mobile` exports Android/iOS JS bundles and Expo web preview |
| Android native | `npm run android`     | Requires Android SDK/JDK/device; generates native project                  |
| iOS native     | `npm run ios`         | Requires macOS, full Xcode/CocoaPods; generates native project             |
| Desktop        | `npm run dev:desktop` | `npm run build:desktop`; `npm run check -w @inventory/desktop`             |

Application build/development lifecycle hooks prepare shared packages automatically, including direct workspace commands from a clean checkout. Rebuild shared packages with `npm run build:shared` after changing them during a running dev session. `npm run build` builds shared packages, API and web; native commands remain separate because of OS/SDK requirements. Desktop reuses the web build with its own development server on port 5174, so web and desktop can run together. Individual root development commands also create missing environment files; run `npm run setup` before direct workspace commands.

To preview the mobile UI in a browser, run `npm run dev:mobile` and press `w`. Expo web uses port 8081; it is separate from the main web application. The API example allows localhost/127.0.0.1 on 8081 for connection checks. Restart the API after changing its CORS settings.

Web runs on `http://127.0.0.1:5173`; API on `http://127.0.0.1:3100`. `GET /api/v1/health/live` checks process liveness; `GET /api/v1/health/ready` performs a PostgreSQL query and returns 503 on failure. These public endpoints expose no business data. The example API uses port 3100 to avoid the Docker services occupying 3000/3001 on this machine. For Android emulator, set `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3100` in `apps/mobile/.env` and restart Metro. For a physical phone, set API `HOST=0.0.0.0` and use this computer's LAN IP with port 3100 in the mobile environment; both devices need network access to each other. An iOS simulator can use the default loopback address. Changing API ports also requires updating web/mobile origins and desktop CSP.

| Repository check                                    | Command                                                          |
| --------------------------------------------------- | ---------------------------------------------------------------- |
| Format / check formatting                           | `npm run format` / `npm run format:check`                        |
| ESLint and dependency boundaries                    | `npm run lint`                                                   |
| TypeScript including test/tooling code              | `npm run typecheck`                                              |
| Tooling, unit, TSX render and in-process HTTP tests | `npm test`                                                       |
| PostgreSQL integration                              | `TEST_DATABASE_URL=<disposable-db-url> npm run test:integration` |
| Documentation and source review thresholds          | `npm run check:foundation`                                       |
| Standard validation plus web/API builds             | `npm run validate`                                               |
| Apply migrations                                    | `npm run db:migrate -w @inventory/api`                           |
| Create migration                                    | `npm run db:create -w @inventory/api -- meaningful-name`         |

## Organization

```text
apps/
  web/                 React, Vite, React Router, Tailwind, shadcn/ui
  api/                 NestJS, environment/HTTP/health/database foundation
  mobile/              Expo React Native Android/iOS shell
  desktop/src-tauri/   Tauri host consuming the web application
packages/
  contracts/           Versioned API and domain schemas and types
  api-client/          Typed transport, workflow models and shared form descriptions
  domain/              Portable exact decimal, pricing, unit and scanner rules
scripts/               Foundation checks and Nest test compilation
docs/                 Architecture, platforms, development, security, offline, AI
```

Implemented domain rules, persistence, business workflows and offline synchronization are documented in the [module map](docs/ai/architecture-map.md). Schemas live with contracts; portable rules live in domain; platform storage and native integrations stay in their owning applications. No empty future packages are scaffolded.

Start with [AGENTS.md](AGENTS.md), [architecture](docs/architecture/overview.md), [platform setup and feasibility](docs/platforms/setup.md), and the [current foundation audit](docs/development/foundation-audit.md). Use the [feature workflow](docs/development/feature-workflow.md) and [prompt template](docs/ai/feature-prompt-template.md) for subsequent requests. See the [startup repair report](docs/development/startup-repair.md) for current runtime validation. Known native-toolchain and dependency limitations are recorded, not treated as passed checks.

Workspace ownership, independent commands, production environments and API-only packaging are defined in [workspace boundaries](docs/development/workspace-boundaries.md). Use `npm test -w @inventory/<workspace>` for isolated workspace tests; native desktop tests require Cargo.

The [design system guide](docs/development/design-system.md) documents web primitives, form/feedback conventions, native equivalents and accessibility checks. The default route opens the business workspace; the component demo is at `/#/design-system`. The [component library reference](docs/development/component-library.md) links complete web/native props, examples and contribution rules; showcase theme and form interactions are local-only. See the [workspace navigation report](docs/development/workspace-navigation.md) for the login flow and available screens. Run `npm run test:web:browser` after installing Playwright Chromium to check browser layout and accessibility.

Stage 3.5 adds light/dark/system appearance, shared CSS/native tokens, a development showcase link, and documented common components. Account appearance and layered business/platform policies are now persisted by Command 25A; guest appearance remains temporary. See [component APIs](docs/development/common-components.md), [Stage 3.5 audit and results](docs/development/stage-3-5.md), and the [disabled AI foundation](docs/ai/provider-foundation.md). AI has no installed provider SDK or action execution; its authenticated navigation endpoint returns unavailable while disabled; leave server `AI_PROVIDER=disabled` until a reviewed adapter is implemented. Never add AI credentials to frontend environment variables.

Stage 4 adds operator-issued password recovery on the existing sign-in screens, safe-read retries and durable sync race fixes. Apply migration 19 with `npm run db:migrate -w @inventory/api` before starting updated clients/API. For forgotten passwords, use **Forgot password / recovery code**; a trusted operator issues a 30-minute code through the existing stdin-based admin CLI after identity verification. No recovery email is sent automatically. See [recovery instructions](docs/security/authentication.md#password-recovery--stage-4) and the [Stage 4 audit, tests and release blockers](docs/development/stage-4.md). Native toolchain/dependency advisories and privileged MFA remain release qualifications, not completed capabilities.

Backend modules, transaction conventions and Command 5 verification results: [backend foundation](docs/development/backend-foundation.md).

Authentication uses operator-issued invitations outside the optional local development fixtures below. Apply migrations with `npm run db:migrate -w @inventory/api`, then use `npm run auth:admin -w @inventory/api` to issue an invitation via stdin. See [authentication setup, storage and offline policy](docs/security/authentication.md).

## Local development login accounts

**Public test credentials — local development only. Never seed these accounts into a deployed environment, expose the development database publicly, or reuse these passwords for real accounts.** Seeding is an explicit command; application startup and migrations never create test accounts.

After the setup commands above, open **[http://127.0.0.1:5173/#/](http://127.0.0.1:5173/#/)**, enter the email and password, and choose **Log in**. After login, the first available active business opens automatically. Use **Open point of sale** or the **Workspace sections** menu for catalog, inventory, purchasing, customers, supplier balances, and business/access settings. Only permitted sections appear; switch businesses with the **Business** selector. Accounts without memberships see onboarding instructions. There is no separate `/login` route. Use the same accounts in the mobile and desktop sign-in screens when they connect to this API.

| Email                | Actual role                          | Development-only password | Testing purpose                                                                                       |
| -------------------- | ------------------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------------- |
| `superadmin@inv.com` | Platform `super_admin`               | `asdF@123`                | Access both fixture businesses without any business membership; platform-wide business administration |
| `admin@inv.com`      | `owner`                              | `asdF@123`                | Manage the development business, memberships, settings, and approvals                                 |
| `owner@inv.com`      | `owner`                              | `asdF@123`                | Separate business owner account with business-wide management access                                  |
| `manager@inv.com`    | `manager`, warehouse scoped          | `asdF@123`                | Operational management in the fixture warehouse; cannot manage memberships or business settings       |
| `cashier@inv.com`    | `cashier`, warehouse scoped          | `asdF@123`                | POS, customers, own cash shifts and payments; no refund/void, membership or location administration   |
| `inventory@inv.com`  | `custom`, warehouse scoped           | `asdF@123`                | Read products/locations; read/write stock and purchasing; no sales, payments or product editing       |
| `accountant@inv.com` | Read-only `custom`, warehouse scoped | `asdF@123`                | Read sales, payments, customers, locations and scoped audit; no financial writes                      |
| `viewer@inv.com`     | `viewer`, warehouse scoped           | `asdF@123`                | Read business and location metadata only                                                              |

There are no named inventory-operator or accountant roles: these fixtures use the existing custom-permission model. Reports and accounting screens require explicit report and financial permissions; the viewer role does **not** grant sales, stock or financial report access. Permissions remain enforced by the API. Any authenticated account can create a separate business as its owner under the existing onboarding policy; these fixture roles apply inside **Local Development Business**.

All six ordinary accounts belong to **Local Development Business**, with a store, warehouse and POS terminal ready for selection. The owner has business-wide access; the other five are restricted to that warehouse. **Local Isolation Business** has no ordinary memberships and is visible only to the super admin until explicitly assigned. This is an isolation fixture, not a second ready-to-trade tenant. No products, balances, sales or open shifts are fabricated. Create products/prices, receive stock and open a cash shift to test checkout.

`npm run db:seed:dev` requires explicit `NODE_ENV=development` in `apps/api/.env` (created by `npm run setup`). It accepts only loopback PostgreSQL: the default `inventory` database on port `5433`, or a deliberately named `inventory_dev_*` database on another local port. Existing process environment variables take precedence over `.env`. Production/test modes, remote hosts, URL query options and other database names are refused before connection. Never point an accepted local address at a production tunnel.

Rerunning the command preserves fixture passwords, sessions, permissions and manual test data. It refuses to overwrite existing accounts with the same email or a mismatched fixture identity, and commits all initial fixtures atomically. If an email collision occurs, use a fresh local `inventory_dev_*` database, update `DATABASE_URL`, then migrate and seed it. Do not delete or rename real accounts to make the seed pass.

To restore the seven fixture passwords and reactivate their accounts:

```sh
npm run db:seed:dev -- --reset-accounts
```

This revokes their active sessions. It preserves memberships, custom permissions, business records, all unrelated users and existing rate-limit buckets. If login was rate-limited, wait for the normal 15-minute window. Use a fresh database for pristine roles and business test data.

To reset **all data in the default isolated local development database**, stop API/web/mobile/desktop processes first. The following deletes the `inventory` database on `127.0.0.1:5433`, including any manual test data. Use only for the disposable default cluster:

```sh
npm run db:local
# Put PostgreSQL 18 tools on PATH first if necessary:
# export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH"
PGPASSWORD=local-development-only dropdb -h 127.0.0.1 -p 5433 -U inventory inventory
npm run db:local
npm run db:migrate -w @inventory/api
npm run db:seed:dev
npm run dev
```

The `PGPASSWORD=...` syntax is for macOS/Linux shells; on Windows PowerShell set `$env:PGPASSWORD='local-development-only'` before `dropdb`, then `Remove-Item Env:PGPASSWORD`. For a custom database, deliberately create a new empty `inventory_dev_*` database and update `apps/api/.env` instead. No destructive reset runs automatically. See [development account validation](docs/development/test-accounts.md) for safeguards, checks and platform limits.

## Running cash checkout

For supplier payments, record the supplier invoice in **Purchasing**, then use **Supplier balances** in management. Select the warehouse/invoice and open your cash shift before recording cash paid or refunded. A stock return is separate from its confirmed supplier credit note. Reads require `purchases.read` plus `payments.read`; cash settlement also requires `payments.write` and `payments.cash`. Read-only custom accounting users need the purchasing read grant explicitly. Apply migration 18 with `npm run db:migrate -w @inventory/api` before using the updated clients. See [supplier balance policy and verification](docs/development/stage-3-workflows.md).

Run `npm run dev` for the API/web environment, or the independent platform commands above. Apply the latest migrations with `npm run db:migrate -w @inventory/api` against your intended development database. Sign in with an invited account, select the business, and create an active store, warehouse and terminal assigned to that warehouse. Publish a product price and receive/open stock through the inventory workflow.

Open **Point of sale → Cash shifts / sale history**, select the warehouse, and open your cash shift with a currency and counted opening float. Add products by name/SKU or barcode, select units/customer, calculate the server total, and confirm cash actually received. Amount fields explicitly use currency minor units (USD 1250 = USD 12.50). Cash applied below the total requires an eligible customer; zero cash is a full credit sale. Change is tendered cash minus applied cash. Receipts, returns, voids and shift closing are in the same tools panel. Customer-management statements support later partial cash collections using an open shift.

An unknown checkout response locks the cart; retry that same checkout. After a reload, background/session lock or sign-in, inspect sale history before creating another transaction. Cash operations do not infer receipt of physical money from a timeout. See the report for exchange, return, printer and offline policies.

## Offline cash, live updates and warehouse counts

Offline cash is disabled until a business owner enables a bounded policy. Open a cash shift, prepare a passphrase-encrypted register online, then use **Offline cash register** for durable carts and cash-only provisional sales. Reconnect with the original account; keep the shift open until uploads resolve. Only root-warehouse stock and up to 250 active variants are supported per snapshot. Credit, refunds, purchasing and warehouse posting remain online.

The production web build supports offline reload through an app-shell service worker. Desktop/mobile use SQLite; Expo web uses IndexedDB but requires an online shell reload. Do not clear application storage while sales are pending. See [storage, grants, conflicts and recovery](docs/offline/synchronization.md) and [platform validation and limits](docs/development/offline-rollout.md).

**Stock counts / warehouse scanning** provides resumable blind counts, owner-reviewed adjustments, product/location scans, partial purchase receipts with damage, bin moves and transfer confirmation. Keyboard scanners work as text input; native mobile uses the existing camera adapter. Stock movement during a count forces a recount. Apply the three new migrations through the documented database workflow before running the updated clients.

## Settings, connectivity and security

Apply migrations 20–21 with `npm run db:migrate -w @inventory/api`, then restart the API and clients. After sign-in, open **Settings, connectivity and security** for personal preferences, readiness, security inbox and audit events. Business owners see **Business policy**; platform administrators additionally manage global policy and review restricted diagnostics and notification failures. Set server `APP_VERSION` to your release identifier. In-app notifications are durable; email/SMS/push are not configured. LAN deployment needs operator-managed HTTPS infrastructure and has not been physically qualified. See [Command 25A architecture, configuration, tests and limitations](docs/development/command-25a.md).

## Reports, profiles and business notifications

After applying migration 22, open **Reports & dashboard**, **Notifications & approvals**, or **Warehouse hierarchy** from business management. Reports require `reports.read` and the corresponding sales/purchasing/payment/stock permission; owners/managers already have broad access. Financial categories stay hidden from stock-only roles. Report amounts explicitly use currency minor units and dates use inclusive UTC days. Business policy includes general/retail/wholesale conventions and a low-stock threshold. Notification review invokes the existing domain approval commands. Native screens expose the same functions in collapsible sections; desktop shares the lazy web screens. See [Stage 5 behavior, deployment and verification](docs/development/stage-5.md). 3D, physical floor plans and profit/margin calculations remain unavailable pending appropriate geometry and historical cost data.

## Stage 6: trading, accounting and release operations

Apply migration 23 with `npm run db:migrate -w @inventory/api`, then open **Business trading**, **Accounting**, or **Integrations & help** from the business workspace. Native Expo exposes equivalent collapsible sections; Tauri shares the web screens. Trading requires business-wide `business.write` and explicit partner acceptance; only submitted terms are shared. It does not automatically create either tenant's stock or cash transactions. Accounting requires unscoped `reports.read`, `payments.read`, `sales.read`, and `purchases.read`; posting additionally requires `reports.write` and `payments.write`. Existing custom memberships are not silently upgraded.

Accounting provides a fixed starter chart, exact balanced journals, source posting, trial balances, period closure and immutable reversals. It is not a complete accounting system: inventory valuation/COGS, statutory statements, tax filing, bank reconciliation and foreign exchange are absent. Do not recreate an already-posted source as a manual journal. AI and external payments/notifications remain unconfigured; supplying a key alone cannot install an adapter.

See the [Stage 6 audit and exact results](docs/development/stage-6.md) and [release/backup/provider runbook](docs/development/release-operations.md). Integration tests now also require matching `pg_dump` and `pg_restore` clients on PATH for the populated restore drill. Browser checks: `PLAYWRIGHT_CHANNEL=chrome npm run test:web:browser`. Native macOS app build: `npm run build -w @inventory/desktop -- --bundles app`. Production deployment and native device qualification remain separate release gates.

### Browser login succeeds but subsequent requests return 401

Use `npm run dev` to start both the web application and API. In Vite development, browser
requests now use the same-origin `/api` proxy targeting `VITE_API_BASE_URL`. This supports
both `localhost` and `127.0.0.1` without browsers rejecting `SameSite=Strict` session cookies
between those different hosts. Restart Vite after updating configuration. The API must still
allow the exact browser origin in `CORS_ORIGINS`; the proxy does not bypass origin checks.
Production uses the configured public API origin and requires same-site HTTPS deployment
(or an operator-configured same-origin reverse proxy). Desktop uses its configured API directly
with an in-memory bearer session; start the API separately and sign in again after restarting
or reloading the desktop app. A 401 on an initial saved-session check means signed out, while
failed login and protected requests still surface authentication errors.

## Routed workspace and local UI demos

Use `npm run dev:mock:web`, `npm run dev:mock:mobile`, or `npm run dev:mock:desktop` for explicit, isolated demonstration data. Normal development commands keep using the real API. See [mock-data limits](docs/development/mock-data.md), [route map](docs/routes.md), [invitation links](docs/deep-linking.md), and [shell QA evidence](docs/qa/report.md). Business switching and register preparation live in Settings; authentication has a separate layout.

For a populated **local development** workspace, first prepare the normal development
accounts with `npm run db:seed:dev`, then run `npm run db:seed:showcase` while the API
is running. This adds three demo businesses plus products and locations in Demo Retail:
12 priced products per business, Downtown/Riverside stores, and a sales-floor/back-room
warehouse for each store. Existing data and prices are preserved; opening stock uses
traceable, stable-ID ledger commands. The owner fixture also receives ownership of the
new demo businesses. Run again safely to check every prepared warehouse reconciles.
For another loopback development API: `npm run db:seed:showcase -- http://127.0.0.1:3191`.
The command requires the built API development fixtures and refuses production or
nonlocal database configuration. Authentication and write rate limits remain enabled;
a failed run stops without retrying mutations. Wait for any rate-limit window before
resuming. See the [management UX report](docs/qa/management-ux/report.md).

### Extended development examples and operational tools

After the local API is running, `npm run db:seed:showcase` adds the multi-business catalog and `npm run db:seed:transactions` adds representative purchasing, sales, returns, payments, transfers, counts and staff/expense records. These commands are local-development only and preserve checkpointed transactions on rerun.

Settings → **Staff & expenses** provides owner-level operational salary/expense tracking. Catalog → **Bulk import** accepts the downloadable CSV template or a values-only Excel workbook. POS → **Use cached products** opens the encrypted cash workflow; Device & Offline provides vault backup and restore. See [usage and limitations](docs/development/operations-expansion.md) and [server backup / desktop deployment profiles](docs/development/release-operations.md).

# POS & inventory platform

A multi-business POS/inventory platform under development. Invitation-based authentication, scoped permissions, organizational management, catalog/pricing, an immutable stock ledger, suppliers/purchasing, storage locations and transfers are implemented with online screens for web/Tauri and native mobile. Customer credit, online POS, cash shifts, receipts, returns and refunds are implemented. Cash is the only approved tender. Offline operation, external payment providers, supplier settlement and general-ledger accounting are not implemented. Native scaffolding is not proof of hardware or release readiness. See the [domain report](docs/development/domain-rollout.md) and [customer/POS/cash verification report](docs/development/commerce-rollout.md).

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
  contracts/           Versioned health/error schemas and types
  api-client/          Typed transport with runtime response validation
scripts/               Foundation checks and Nest test compilation
docs/                 Architecture, platforms, development, security, offline, AI
```

Domain rules, persistence adapters, synchronization, native device integrations and business modules remain future work. No empty `domain`, `validation`, `config`, or `test-utils` package was added: schemas live with contracts and configuration lives at the root until reuse justifies more packages.

Start with [AGENTS.md](AGENTS.md), [architecture](docs/architecture/overview.md), [platform setup and feasibility](docs/platforms/setup.md), and the [current foundation audit](docs/development/foundation-audit.md). Use the [feature workflow](docs/development/feature-workflow.md) and [prompt template](docs/ai/feature-prompt-template.md) for subsequent requests. See the [startup repair report](docs/development/startup-repair.md) for current runtime validation. Known native-toolchain and dependency limitations are recorded, not treated as passed checks.

Workspace ownership, independent commands, production environments and API-only packaging are defined in [workspace boundaries](docs/development/workspace-boundaries.md). Use `npm test -w @inventory/<workspace>` for isolated workspace tests; native desktop tests require Cargo.

The [design system guide](docs/development/design-system.md) documents web primitives, form/feedback conventions, native equivalents and accessibility checks. The default foundation route contains a small local component demo. Run `npm run test:web:browser` after installing Playwright Chromium to check browser layout and accessibility.

Backend modules, transaction conventions and Command 5 verification results: [backend foundation](docs/development/backend-foundation.md).

Authentication uses operator-issued invitations outside the optional local development fixtures below. Apply migrations with `npm run db:migrate -w @inventory/api`, then use `npm run auth:admin -w @inventory/api` to issue an invitation via stdin. See [authentication setup, storage and offline policy](docs/security/authentication.md).

## Local development login accounts

**Public test credentials — local development only. Never seed these accounts into a deployed environment, expose the development database publicly, or reuse these passwords for real accounts.** Seeding is an explicit command; application startup and migrations never create test accounts.

After the setup commands above, open **[http://127.0.0.1:5173/#/](http://127.0.0.1:5173/#/)**, enter the email and password, and choose **Log in**. The existing screen is the login entry point; there is no separate `/login` route. Use the same accounts in the mobile and desktop sign-in screens when they connect to this API.

| Email                     | Actual role                          | Development-only password | Testing purpose                                                                                       |
| ------------------------- | ------------------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------------- |
| `superadmin@example.test` | Platform `super_admin`               | `LocalDev!2026-Only`      | Access both fixture businesses without any business membership; platform-wide business administration |
| `admin@example.test`      | `owner`                              | `LocalDev!2026-Only`      | Manage the development business, memberships, settings, and approvals                                 |
| `manager@example.test`    | `manager`, warehouse scoped          | `LocalDev!2026-Only`      | Operational management in the fixture warehouse; cannot manage memberships or business settings       |
| `cashier@example.test`    | `cashier`, warehouse scoped          | `LocalDev!2026-Only`      | POS, customers, own cash shifts and payments; no refund/void, membership or location administration   |
| `inventory@example.test`  | `custom`, warehouse scoped           | `LocalDev!2026-Only`      | Read products/locations; read/write stock and purchasing; no sales, payments or product editing       |
| `accountant@example.test` | Read-only `custom`, warehouse scoped | `LocalDev!2026-Only`      | Read sales, payments, customers, locations and scoped audit; no financial writes                      |
| `viewer@example.test`     | `viewer`, warehouse scoped           | `LocalDev!2026-Only`      | Read business and location metadata only                                                              |

There are no named inventory-operator or accountant roles: these fixtures use the existing custom-permission model. General-ledger accounting and report screens are not implemented; the viewer role does **not** grant sales, stock or financial report access. Permissions remain enforced by the API. Any authenticated account can create a separate business as its owner under the existing onboarding policy; these fixture roles apply inside **Local Development Business**.

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

Run `npm run dev` for the API/web environment, or the independent platform commands above. Apply the latest migrations with `npm run db:migrate -w @inventory/api` against your intended development database. Sign in with an invited account, select the business, and create an active store, warehouse and terminal assigned to that warehouse. Publish a product price and receive/open stock through the inventory workflow.

Open **Point of sale → Cash shifts / sale history**, select the warehouse, and open your cash shift with a currency and counted opening float. Add products by name/SKU or barcode, select units/customer, calculate the server total, and confirm cash actually received. Amount fields explicitly use currency minor units (USD 1250 = USD 12.50). Cash applied below the total requires an eligible customer; zero cash is a full credit sale. Change is tendered cash minus applied cash. Receipts, returns, voids and shift closing are in the same tools panel. Customer-management statements support later partial cash collections using an open shift.

An unknown checkout response locks the cart; retry that same checkout. After a reload, background/session lock or sign-in, inspect sale history before creating another transaction. Cash operations do not infer receipt of physical money from a timeout. See the report for exchange, return, printer and offline policies.

## Offline cash, live updates and warehouse counts

Offline cash is disabled until a business owner enables a bounded policy. Open a cash shift, prepare a passphrase-encrypted register online, then use **Offline cash register** for durable carts and cash-only provisional sales. Reconnect with the original account; keep the shift open until uploads resolve. Only root-warehouse stock and up to 250 active variants are supported per snapshot. Credit, refunds, purchasing and warehouse posting remain online.

The production web build supports offline reload through an app-shell service worker. Desktop/mobile use SQLite; Expo web uses IndexedDB but requires an online shell reload. Do not clear application storage while sales are pending. See [storage, grants, conflicts and recovery](docs/offline/synchronization.md) and [platform validation and limits](docs/development/offline-rollout.md).

**Stock counts / warehouse scanning** provides resumable blind counts, owner-reviewed adjustments, product/location scans, partial purchase receipts with damage, bin moves and transfer confirmation. Keyboard scanners work as text input; native mobile uses the existing camera adapter. Stock movement during a count forces a recount. Apply the three new migrations through the documented database workflow before running the updated clients.

# POS & inventory platform

An offline-first, multi-business platform foundation. The repository has runnable web/API shells, an Expo React Native shell, and a Tauri desktop host. **No POS, inventory, authentication, accounting, local database, or synchronization workflows are implemented.** Native scaffolding is not proof of hardware or release readiness.

## Setup

Use Node.js 24.x (tested 24.13.0) and npm 11.x (tested 11.6.2). One npm lockfile covers all workspaces.

```sh
npm ci
npm run setup
npm run dev
```

`npm run setup` creates missing environment files without overwriting existing settings. `npm run dev` starts web and API together. With the example database URL it also initializes/starts an isolated local PostgreSQL cluster on port 5433, stored in ignored `.local/postgres`. PostgreSQL binaries must be installed (set `PG_BIN` if they are not on PATH; Homebrew PostgreSQL 18 is detected automatically). This loopback-only cluster uses development credentials and must never serve production. An existing database on port 5432 is left alone. To use your own database, set `DATABASE_URL` in `apps/api/.env`; the combined launcher then skips local provisioning. Stop the local database separately with `npm run db:local -- stop`. The API validates environment settings at startup; production requires verified database TLS and explicit HTTPS/desktop origins. Client-prefixed variables are public and must never contain secrets. Web/desktop development and production builds fail early if `VITE_API_BASE_URL` is missing or invalid; set the example web environment or supply it explicitly. See [migrations](docs/development/migrations.md) and [security](docs/security/authorization.md).

## Applications and commands

Start with `npm run dev` (or `npm start`). Run additional clients in separate terminals from the repository root. `npm run doctor` reports missing native prerequisites:

| Target         | Develop               | Build / check                                                              |
| -------------- | --------------------- | -------------------------------------------------------------------------- |
| Web            | `npm run dev:web`     | `npm run build -w @inventory/web`                                          |
| API            | `npm run dev:api`     | `npm run build -w @inventory/api`; `npm run start -w @inventory/api`       |
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

# Workspace boundaries and configuration

Command 3 scope: workspace tooling and application entry points only. No business screens, workflows or tables were added.

## Ownership

| Workspace               | Responsibility                                 | Permitted application dependencies                   |
| ----------------------- | ---------------------------------------------- | ---------------------------------------------------- |
| `@inventory/contracts`  | Portable wire schemas and API constants        | Zod; no other workspace                              |
| `@inventory/api-client` | Portable injected HTTP transport               | contracts                                            |
| `@inventory/api`        | Independently deployed Nest/PostgreSQL service | contracts                                            |
| `@inventory/web`        | Browser React UI, also bundled by desktop      | api-client                                           |
| `@inventory/mobile`     | Expo native UI and its browser preview         | api-client                                           |
| `@inventory/desktop`    | Tauri Rust host                                | Builds the web artifact; no cross-app source imports |

No domain package exists without a current domain use case. All shared source is platform-neutral: no DOM/Node globals, React, React Native, Expo, Tauri, database or server dependencies. Dependency-cruiser allows only the current shared dependencies and rejects other external imports until explicitly reviewed. Contracts cannot import another package. Applications cannot import each other's source. The API cannot import UI/native runtimes; browser source cannot import native/server runtimes; mobile source cannot import DOM implementations. The mobile test uses React Native Web as a test renderer; its test-only exception does not permit browser imports in application code. Future native bridges belong in explicit platform adapters, not portable packages or the browser entry point.

Use public `@inventory/contracts` / `@inventory/api-client` exports. npm workspace links resolve compiled ESM and declarations; lifecycle hooks prepare prerequisites. The web-only `@/` alias maps to its source in TypeScript, Vite and Vitest. `tsconfig.boundaries.json` source mappings exist for architecture analysis, not runtime resolution. Root strict TypeScript and ESLint policies are inherited rather than copied. Mobile explicitly extends `expo/tsconfig.base.json` for compatibility with both TypeScript and the test transformer.

## Independent commands

Use Node 24 and npm 11 (`.nvmrc`, `engines`, `packageManager`, and `.npmrc` agree). Install once with `npm ci`; only the root npm lockfile is committed. Run `npm run setup` for local example environments. Workspace commands work from the repository root or from the corresponding workspace directory.

For any workspace in the table, use:

```sh
npm run dev -w @inventory/web
npm test -w @inventory/web
npm run typecheck -w @inventory/web
npm run lint -w @inventory/web
npm run build -w @inventory/web
```

Replace `web` with `api`, `mobile`, `desktop`, `contracts`, or `api-client`. Shared-package development commands watch TypeScript. API development needs its own environment/database; it never starts a UI. Mobile builds export Android/iOS JavaScript and Expo web, not native binaries. Desktop testing runs the shared web tests and a native Rust context smoke test; desktop type checking includes web TypeScript and Cargo checking, and desktop lint includes Rust formatting. These native commands require the host toolchain. Cross-workspace checks remain `npm run validate`; host-dependent desktop checks and mobile exports are explicit separate commands.

The root `npm run dev` / `npm start` convenience command starts local web/API and the dedicated example PostgreSQL cluster. It is not a production entry point. See [platform setup](../platforms/setup.md) for native SDKs and Android/iOS device commands. Windows execution must be checked on Windows; mobile SDK/device blockers remain explicit.

## Environment separation

| Context              | Source and behavior                                                                                                                                                                                                                                                                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local                | Each app owns `.env.example`; `setup` copies missing `.env` files without overwriting. Vite/Expo load their own environment. API `dev` and `start:local` load API `.env`.                                                                                                                                                                                  |
| Unit/smoke tests     | Vitest injects deterministic public origins and `NODE_ENV=test`. API bootstrap tests inject a deliberately unreachable test database and only call liveness. They never load local API `.env` or query a production database.                                                                                                                              |
| Database integration | Explicit `TEST_DATABASE_URL` pointing at a disposable database; separate from unit tests and local runtime.                                                                                                                                                                                                                                                |
| Production           | Inject environment through the deployment host. Committed `.env.production.example` files contain placeholders, not credentials. API `start` reads process environment only; `start:production` forces production validation. Client `build:production` requires an explicitly supplied HTTPS API origin; mobile disables dotenv loading for that command. |

`.env.test.example` documents a separate test configuration for manual test services; ordinary unit tests do not load it automatically. Actual `.env*` files are ignored, while example templates are committed. Client `VITE_*` / `EXPO_PUBLIC_*` variables are public build inputs. Database settings and credentials belong only to the API. Shared URL validation lives in contracts; server-only environment validation lives in the API. Do not add a shared environment package that would expose server settings to clients.

```sh
VITE_API_BASE_URL=https://api.example.test npm run build:production -w @inventory/web
EXPO_PUBLIC_API_BASE_URL=https://api.example.test npm run build:production -w @inventory/mobile
```

These are shell examples; use the equivalent environment assignment on Windows. Ordinary `build` remains useful with local development origins. A desktop release must also set the Tauri CSP `connect-src` to its exact deployment origin before packaging; the current native configuration deliberately permits only the local development API. Production API requires verified PostgreSQL TLS and HTTPS browser CORS origins. Runtime tests exercise its rejection of insecure settings.

## API-only deployment artifact

```sh
npm run package:api
cd artifacts/api
npm ci --omit=dev
# Inject DATABASE_URL, DATABASE_SSL=verify-full, CORS_ORIGINS, HOST and PORT.
npm run db:migrate
npm start
```

The artifact contains compiled API/contracts, SQL migration files, minimal manifests and a pruned lockfile retaining repository dependency versions. Its launcher forces `NODE_ENV=production`; it copies no `.env`, client app, source test, Rust code or native SDK. Choose a fresh destination on subsequent builds with `npm run package:api -- artifacts/api-next`; existing output is never silently overwritten. The generated artifact has its own deployment lockfile but remains ignored by source control. Migrations are an explicit release step, never an application startup side effect. The runner applies authentication tables and migration metadata; there are no business migrations at this stage. The artifact includes the stdin-based `auth:admin` operator command.

## Smoke coverage and validation

The browser test mounts the actual main module, resolves the lazy route and renders the shell. The mobile test imports the actual entry point, checks Expo registration and renders the actual component through React Native Web; the native registration and secure-store bridges are mocked. The API test constructs the same Nest application factory used by main and verifies liveness. Shared package tests import compiled public exports. The Rust test generates the same Tauri context used at startup. These tests are foundation checks, not native device or browser E2E qualification.

Boundary regression tests run forbidden imports in temporary copies instead of writing into live source, so they cannot interrupt concurrent app builds. See the [Command 3 validation report](workspace-validation.md) for exact results and remaining blockers.

Mobile adapter tests that execute SQLite through Node live in `apps/mobile/test` and use `tsconfig.test.json`. The mobile typecheck command validates that test environment separately, keeping Node globals out of the native application program.

The portable API-client import adapter uses `fflate` for bounded ZIP/UTF-8 decoding and `fast-xml-parser` for values-only XLSX worksheets. Neither imports DOM/native/server APIs. The dependency rule permits these only in `import-file.ts` and `import-xlsx.ts`; domain/contracts remain free of spreadsheet dependencies. XLSX parsing is dynamically imported. Native document selection and sharing stay in the mobile platform adapter (`expo-document-picker`, `expo-file-system`, `expo-sharing`); browser/Tauri file dialogs stay in the web adapter.

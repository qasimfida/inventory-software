# Inventory platform

Offline-first POS/inventory workspace: React/Vite web, NestJS/PostgreSQL API, Tauri Windows/macOS desktop and Expo React Native mobile. See [architecture and limits](docs/architecture.md); a platform build is not a release qualification.

## Start

Use Node 24.x, npm 11.x and local PostgreSQL tools (or configure `PG_BIN`).

```sh
npm ci
npm run setup
npm run doctor
npm run dev
```

Setup uses the workspace `.env.example` files and preserves existing configuration. Web normally runs on 5173, API on 3100 and isolated development PostgreSQL on 5433. Client origins are public build configuration; never put secrets in them.

Independent commands: `npm run dev:web`, `dev:api`, `dev:desktop`, `dev:mobile`. Native targets require their host SDKs. See [setup, tests, builds, deployments and release gates](docs/development.md).

## Four guides

- [Architecture](docs/architecture.md): module ownership, routes, accepted decisions and unsupported features.
- [Design system](docs/design-system.md): reusable components, user preferences and native equivalents.
- [Security and data](docs/security-and-data.md): authorization, ledgers, retry and offline rules.
- [Development](docs/development.md): commands, workflow, verification and documentation history.

Open `/#/design-system` for interactive local component examples. Run `npm run audit:ui` for a source/route inventory. Run `npm run validate` for repository quality checks; device/peripheral qualification remains separate.

Development fixtures use the existing mock and seed scripts; inspect their options before running. Never seed production, publish development credentials or clear a vault with unsynchronized sales.

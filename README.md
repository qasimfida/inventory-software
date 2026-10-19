# POS & inventory platform

Architecture foundation for an offline-first, multi-business POS and inventory product. **No application or business functionality exists yet.** Web, mobile, Windows, and macOS are planned, not supported releases.

## Setup and commands

Use Node.js 24.x and npm 11.x (inspection environment: Node 24.13.0, npm 11.6.2). Run from the repository root:

```sh
npm ci
npm run format
npm run format:check
npm run check:foundation
npm run validate
```

Prettier formats documentation and configuration. The foundation checker verifies local Markdown file links, required documents, source-file line limits, and approved exceptions. `validate` runs formatting and foundation checks. It does not test an application.

There are no runtime prerequisites, environment variables, database setup, dev server, or deployment yet. ESLint, application tests, TypeScript checks, and production builds will be added with the first executable scaffold; no success-only placeholder scripts exist. See [testing](docs/development/testing.md) for the required script contract.

## Architecture and navigation

Target: React/Vite clients, a NestJS modular monolith, PostgreSQL authority, and transactional local persistence with explicit synchronization. Shared TypeScript domain logic and contracts stay independent of UI and platform devices. Tauri desktop and React Native mobile remain proposed until device/storage feasibility checks.

Start with [AGENTS.md](AGENTS.md), [architecture overview](docs/architecture/overview.md), and [decisions](docs/architecture/decisions.md). Use the [implementation roadmap](docs/development/roadmap.md) and [feature prompt template](docs/ai/feature-prompt-template.md) for later work. The [inspection record](docs/architecture/repository-inspection.md) distinguishes observed facts from target design.

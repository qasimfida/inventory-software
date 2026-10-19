# Agent instructions

This is an offline-first POS/inventory foundation: npm workspaces, React/Vite web, NestJS/PostgreSQL API, Tauri desktop and Expo React Native mobile shells. No business workflows, local storage adapters or sync engine exist. Application builds prepare shared dependencies automatically; web/desktop commands require a valid public API origin. Native build/device coverage is limited; inspect [platform status](docs/architecture/platforms.md) before claiming support.

Commands: `npm ci`; `npm run setup`; `npm run dev` (combined web/API with isolated local PostgreSQL); `npm run doctor`; `npm run dev:web`, `dev:api`, `dev:mobile`, `dev:desktop`; `npm run lint`, `typecheck`, `test`, `build`, `validate`. `build` covers shared packages/web/API; `build:mobile` exports native JS and `build:desktop` needs Rust/native tools. See [README](README.md) for environment setup and database/native commands.

Applications consume `packages/contracts` and `packages/api-client`. Shared packages never import apps, UI or native/server runtime APIs. Web/desktop share DOM UI; mobile owns native UI. Domain/device packages are added only for real use cases.

- Inspect existing implementations and follow data flow before editing. Preserve unrelated work and never expose credentials.
- **Without an explicit platform scope, implement the requested feature across every applicable supported platform: web, mobile, Windows, and macOS.** Inspect which are actually scaffolded. For a missing platform, add its foundation only if in scope; otherwise report the blocker and follow-up. Never claim unsupported platforms are complete.
- An explicit platform request limits platform UI/device work. Update shared domain, contracts, security, schemas, and sync when necessary; explain the impact. Do not add unrelated features on other platforms.
- Follow [the feature workflow](docs/development/feature-workflow.md): interpret → inspect → trace consumers → plan → implement → validate → report. Use an impact map for substantial changes.
- Follow [code standards](docs/development/code-standards.md). Target 100–150 lines; 200 is a review threshold, not an absolute cap. Split by cohesion, record justified exceptions, and avoid duplicate rules or unexplained dependencies.
- Server authorization and transactional inventory/financial integrity are mandatory. Never silently resolve inventory or financial conflicts with last-write-wins. Locally saved is distinct from server-confirmed.
- Run relevant available checks; report exact results and unrun checks. Update documentation with implementation. No fabricated tests or platform claims.

Read only documents relevant to the task:

| Task                                | Canonical guidance                                                                                                                        |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| System boundaries, stack, decisions | [Overview](docs/architecture/overview.md), [decisions](docs/architecture/decisions.md), [module map](docs/ai/architecture-map.md)         |
| Platform coverage and adapters      | [Platforms](docs/architecture/platforms.md)                                                                                               |
| Coding and review                   | [Standards](docs/development/code-standards.md), [workflow](docs/development/feature-workflow.md), [testing](docs/development/testing.md) |
| Stock or money                      | [Domain invariants](docs/domain/inventory-and-finance.md)                                                                                 |
| Offline or live updates             | [Synchronization](docs/offline/synchronization.md)                                                                                        |
| Identity or tenant data             | [Authorization](docs/security/authorization.md)                                                                                           |
| New feature request                 | [Prompt template](docs/ai/feature-prompt-template.md)                                                                                     |

The current foundation audit stops at non-business corrections. Subsequent business work requires a feature-specific request. Never silently skip a supported platform: provide an equivalent platform-appropriate capability or identify its blocker and follow-up.

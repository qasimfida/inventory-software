# Agent instructions

This repository currently contains architecture documentation and foundation tooling only. No business feature or platform is implemented. Verify this status against the repository before each task.

- Inspect existing implementations and follow data flow before editing. Preserve unrelated work and never expose credentials.
- **Without an explicit platform scope, implement the requested feature across every applicable supported platform: web, mobile, Windows, and macOS.** Inspect which are actually scaffolded. For a missing platform, add its foundation only if in scope; otherwise report the blocker and follow-up. Never claim unsupported platforms are complete.
- An explicit platform request limits platform UI/device work. Update shared domain, contracts, security, schemas, and sync when necessary; explain the impact. Do not add unrelated features on other platforms.
- Follow [the feature workflow](docs/development/feature-workflow.md): interpret → inspect → trace consumers → plan → implement → validate → report. Use an impact map for substantial changes.
- Follow [code standards](docs/development/code-standards.md). Target 100–150 lines per source file, maximum 200 except reviewed exceptions. Do not duplicate business rules or introduce dependencies without a concrete need.
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

The initial foundation task must stop at documentation and necessary tooling. Subsequent business work requires a feature-specific request.

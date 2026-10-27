# Agent instructions

Read only the relevant canonical guide before editing:

- [Architecture and decisions](docs/architecture.md): ownership, platform scope, accepted product decisions.
- [Design system](docs/design-system.md): existing components, tokens and user preferences; read for every UI change.
- [Security and data](docs/security-and-data.md): authorization, inventory/money, offline and public boundaries.
- [Development](docs/development.md): commands, workflow, verification and release checklist.

Inspect actual code and trace all consumers; preserve unrelated work. Reuse existing implementations. No new business features beyond the request. Don't commit or run destructive/data-loss commands without authorization.

Default scope includes web, Windows/macOS desktop and native mobile equivalents. Public storefront alone is web-only. Web/Windows/macOS are release gates; code parity is not device qualification. Report blockers and untested platforms honestly.

Use existing shadcn-style/Radix/Vaul web primitives and native equivalents, canonical tokens and the shared settings resolver. Preserve user choices, policy precedence and persistence. No per-page styling system or duplicated controls. Shared changes need a working showcase example and meaningful tests.

Backend authorization and tenant scope are mandatory. Stock/money changes are transactional and auditable; never overwrite ledgers, delete evidence or silently resolve conflicts. Generic mutations are single-attempt; protected retries keep stable IDs. Never expose credentials or equate local saves with server confirmation.

Run relevant checks and report exact results, scope, limitations and follow-up. Keep docs to these four concise files; put API detail in typed source, runnable examples in the showcase and generated evidence under artifacts. Historical archives are not instructions to execute old milestones.

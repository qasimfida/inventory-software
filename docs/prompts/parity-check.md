Read AGENTS.md. Add an automated parity check, no feature changes.
- Compare the shared route registry (packages/api-client/src/workspace-navigation.ts) against the web dispatcher and the mobile dispatcher. Fail if a route has a screen on one and not the other, unless listed in a documented exceptions file (e.g. public storefront).
- Fail if a settings page exists on one platform only.
- Wire it into `npm run validate` and write docs/development/parity-check.md.
- Run it now and list every current mismatch. Don't fix them in this task. Don't commit.
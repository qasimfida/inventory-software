# Development account fixtures

The account table and verified setup commands live in [README](../../README.md#local-development-login-accounts).

## Existing implementation and impact

Inspection found NestJS/PostgreSQL authentication with invitation onboarding, `auth_accounts`, scrypt-v1 password hashes, opaque revocable sessions, cookie transport for browsers and bearer transport for native clients. Existing roles are platform `super_admin` and tenant `owner`, `manager`, `cashier`, `viewer`, `custom`. There was no seed mechanism. Operator invitation and platform-role CLIs already existed.

| Layer                   | Change                                                                                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account provisioning    | `apps/api/src/development`: standalone local CLI, fixed fixture IDs, existing `hashPassword`, one transaction and advisory lock                                                                         |
| Schema / authorization  | No migrations or permission changes; uses existing accounts, businesses, scoped memberships, locations, platform administrators and audit tables                                                        |
| Ownership / recovery    | Append-only platform audit records initial fixture ownership; collisions refuse the whole transaction. Ordinary reruns preserve fixtures. Explicit password reset revokes sessions for fixture IDs only |
| API / clients / offline | No new endpoint or client-side bypass. All platforms use their existing online login and session storage. Password reset revokes online sessions; existing bounded offline policy remains unchanged     |
| Deployment              | `scripts/package-api.mjs` excludes the entire compiled development directory, including public test credentials                                                                                         |
| Documentation / tests   | README commands and role limitations; unit target guard and PostgreSQL login, cookie, permission, isolation, idempotency, collision and reset tests                                                     |

The isolated business demonstrates backend platform access without assigning the super admin a tenant membership. The application does not expose an HTTP endpoint for granting platform administrator privileges: trusted operator provisioning remains the only path. Tenant role assignment rejects `super_admin`, including when attempted by an owner. The backend derives platform access from `platform_administrators`, never a submitted role.

Inventory and accounting fixtures deliberately use restricted existing custom permissions. Accounting is read-only inspection of implemented sales/payments/customer/audit data; no general ledger or report UI is implied. The built-in viewer only sees business/location metadata. Existing managers have broad operational rights, including refunds and voids, but no business settings or user management.

No emails are sent and no successful external email verification is claimed. No production configuration, password hashing, session duration, rate limits or MFA behavior is changed. Credentials are not emitted by the seed CLI or application logs. Production/test modes and nonlocal/nonfixture database targets are rejected before any connection. This is a local operator tool, not a deployment feature; a database proxy must never be used to aim it at real data.

`AuthService.login` now checks that the password hash is still the verified hash when it acquires the account lock. This prevents an in-flight login from issuing a new session using credentials that were reset during password verification. A deterministic integration regression covers the race and successful login with the replacement password.

## Validation — 2026-10-20

| Check                      | Actual result                                                                                                                                                                                                                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local setup                | `npm run setup`, `npm run db:local`, migrations and root `npm run db:seed:dev` passed against the configured loopback database. Applied all 17 migrations; created seven accounts. A second seed returned `preserved`                                                                              |
| README seed/reset commands | Migrate, root seed and `npm run db:seed:dev -- --reset-accounts` also passed against a newly created `inventory_dev_*` database, subsequently dropped                                                                                                                                              |
| Full repository checks     | `npm run validate` passed: formatting, foundation (32 documents / 421 source files), TypeScript across API/web/mobile/shared code, lint, dependency boundaries, tests and API/web builds                                                                                                           |
| Lint / boundaries          | Zero errors; six existing reviewed source-size warnings. No dependency violations across 425 modules / 1,910 dependencies. Runtime API imports of development fixtures are forbidden                                                                                                               |
| Unit / tooling             | 78 tests in 39 Vitest files; all 12 tooling tests passed                                                                                                                                                                                                                                           |
| PostgreSQL integration     | 70 tests in 31 files passed, including seven logins, distinct scrypt salts, every backend permission, cookie transport, tenant isolation, platform access without membership, forbidden role escalation, collision protection, preserved reruns, reset/session revocation and the login/reset race |
| Compiled API / migrations  | Live and readiness HTTP 200; SIGTERM exited within eight seconds; invalid configuration failed without exposing its value. All 17 migrations down/up and repeated up (zero pending) passed in a disposable cluster                                                                                 |
| Real browser login         | `node tests/manual/development-accounts.mjs` passed in Chrome against `http://127.0.0.1:5173/#/`: all seven local accounts logged in, restored cookie sessions after reload and logged out                                                                                                         |
| Production refusal         | `NODE_ENV=production npm run db:seed:dev` exited 1 with an explicit development-only refusal, as intended                                                                                                                                                                                          |
| API packaging              | `npm run package:api -- /tmp/inventory-dev-accounts-runtime` passed. Artifact inspection found neither `dist/development` nor the public fixture password. Clean `npm ci --omit=dev --ignore-scripts --no-audit --no-fund` installed 145 production packages                                       |
| Diff review                | `git diff --check` passed. No unrelated accounts were overwritten or local databases reset. Existing user development servers were retained                                                                                                                                                        |

The initial type check caught an optional cookie-header type in the new test; it was corrected before the passing final validation. No checks remain failing. Dependencies already existed in the source workspace, so a fresh root `npm ci` was not rerun; the clean install above covers the API artifact only. Existing API/web servers occupied the documented ports and were reused for browser testing; `npm run dev` was not relaunched.

No mobile/desktop UI or native storage changes were needed: all clients authenticate against the same account/session backend. Bearer login was verified through real HTTP integration tests. Android/iOS device login, Tauri WebView login, Windows/macOS native builds and production PostgreSQL TLS connectivity were not rerun for this change; existing native prerequisites and limitations still apply.

## Files changed for this request

- Added `apps/api/src/development/{fixtures,seed,seed-organization,seed-cli}.ts` and four focused test files in that directory.
- Updated `apps/api/src/auth/auth.service.ts` for the reset race and `apps/api/test/auth-fixture.ts` for named disposable development databases.
- Added `tests/manual/development-accounts.mjs` for repeatable browser login/reload/logout verification.
- Updated root/API `package.json` scripts, `.dependency-cruiser.cjs` and `scripts/package-api.mjs` for the explicit command, import boundary and artifact exclusion.
- Updated `README.md`, `docs/security/authentication.md`, `docs/development/testing.md`, `docs/ai/architecture-map.md` and this report.

The accounts are ready now. For further manual POS testing, create products/prices and stock and open a cash shift; no business transactions were fabricated. No credentials for email, SMS or an external payment provider are needed for these local fixtures.

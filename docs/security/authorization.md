# Tenant authorization and security

Authentication establishes identity; authorization decides allowed actions on specific resources. Provider and session/token design are deferred until the identity task. Never trust a client-supplied business ID, hidden button or shared client validator as enforcement.

- Resolve active business membership server-side, then evaluate permission, role, branch/store/warehouse scope, resource ownership and approval requirements on every command/query. Deny by default. Sensitive permissions include price overrides, refunds, adjustments and cross-business trade.
- Include tenant keys in business rows, scoped unique constraints and foreign-key relationships so cross-tenant references cannot be formed accidentally. Repository queries, joins, exports, aggregates, jobs, sync feeds and sockets all need tenant filtering. A guessed UUID is not authorization.
- Inter-business trade uses separately authorized participants and minimal disclosure. Do not grant one business access to the other's private inventory, pricing or customer records through a shared correlation ID.
- PostgreSQL RLS is proposed defense in depth for tenant tables. At schema implementation, evaluate coverage, use a non-owner runtime role without BYPASSRLS, consider FORCE ROW LEVEL SECURITY, and set tenant context transaction-locally to prevent pooled connection leakage. Migration/admin roles stay separate. Test policies using the actual runtime role; application permissions still apply.
- Reauthorize queued offline commands when received. Define signed/validated offline capability scope, device binding, expiration and permitted actions before enabling offline login/work. No indefinite offline authorization; disclose revocation latency. Rejected work stays protected for authorized resolution.
- Partition local caches and secure credentials; use native secure storage and an explicit browser session/threat model. Encrypt sensitive local data where required with a real key lifecycle; encryption with exposed keys does not protect shared terminals. Address XSS, CSP, CSRF if cookie-based, TLS, input validation and rate limits during implementation.
- Audit sensitive attempts and changes with actor, business/resource scope, operation/correlation ID, timestamp, reason, approval and safe before/after references. Protect audit integrity and restrict reading. Never log passwords, tokens, payment secrets or unnecessary personal data.
- Secrets stay outside source control; document variable names with fake examples only when introduced. Logs and errors must not reveal other tenants' existence or sensitive records. Payment data should remain with the provider wherever possible.

Security acceptance includes cross-tenant IDs, mismatched nested resources, insufficient warehouse scopes, revoked users, feed/socket access, background jobs, cache switching and RLS role behavior. Use [testing](../development/testing.md) and update this policy with each new authorization surface.

## Current foundation enforcement

The only public endpoints are live/ready health checks. The API binds loopback by default, validates environment variables, uses verified PostgreSQL TLS in production, allowlisted CORS, Helmet, request-size defaults, generated request IDs and safe JSON errors/logs. Exact packaged Tauri origins are documented exceptions to browser HTTPS origins. CORS is not authorization. There is no authentication or tenant data yet; add real backend authorization before any business endpoint.

Native plugins/capabilities and secure credential stores are not enabled. Client environment variables are public. Production deployment still needs rate limits, HTTPS ingress, signing, secret provisioning and the relevant authentication/CSRF policy. [Validation status](../development/validation-status.md) records unresolved transitive mobile-tooling advisories; do not claim dependency security clearance or deploy unsigned/unqualified shells.

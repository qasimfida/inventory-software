# Offline persistence and synchronization

Design only; no synchronization engine exists. IndexedDB is the web persistence direction; SQLite native bindings remain to be selected. Shared orchestration uses platform ports; transaction semantics must be proven per adapter.

## Local acceptance

1. Validate supported offline permission/policy and inputs. Assign a stable operation ID once; persist business/actor/device context, command schema version, entity IDs, expected revision and dependencies.
2. Atomically persist provisional data and an outbox command in the same local database transaction. If atomicity is unavailable, block the offline mutation until a proven recovery design exists.
3. Show **locally saved / pending**, **sending**, **server-confirmed**, or **needs attention**. A rejected operation remains visible with recovery options; network failure never deletes it. Display last sync time, pending count and stale/offline indicators.

Do not store the only copy in memory, query cache, localStorage, or a service-worker cache. An offline web app also needs versioned app-shell caching and a safe update strategy; IndexedDB alone does not provide offline launch. Multiple tabs/processes require coordinated dispatch or leases and atomic queue claims; server idempotency remains the final duplicate guard.

## Server acceptance and retries

- Send over authenticated REST with stable tenant-scoped operation identity and a payload fingerprint. Reuse the identity after timeouts/restarts. A reused key with different payload is a permanent conflict.
- Reauthorize tenant, membership and resource scopes at processing time; validate command version, business invariants and expected revisions. Client timestamps do not establish ordering or authorization.
- In one transaction, claim a uniquely constrained idempotency receipt, execute owning module commands, persist results and append authorized durable change records. Concurrent duplicates return the same result; business failure rolls back safely. Record terminal rejections with explicit semantics.
- Return committed outcome/revision. A lost response is recovered by retrying the same ID or querying its receipt. Permanent validation/authorization conflicts require review; transient network/5xx failures retry with bounded exponential backoff and jitter, respecting rate limits. Preserve failed commands; stop automatic retry loops for permanent errors.
- Order dependent commands explicitly; do not let a failed parent silently release children. Independent operations can proceed within defined partition/order limits.
- Retain idempotency receipts at least through the supported offline/replay window. Expired clients need a documented resnapshot/reconciliation flow, never blind replay after deduplication history is removed.

## Incremental pull and recovery

Use an opaque server cursor scoped to tenant and authorized dataset. The durable feed must guarantee no skipped commits; a naïve sequence allocated before commit is insufficient for cursor ordering. Specify commit-safe ordering with the first sync implementation. Paginate stable results including tombstones and revisions; apply a batch and checkpoint atomically in local storage. Resume from the last committed cursor after interruption.

Expired cursors trigger a consistent snapshot plus subsequent changes. Preserve unsent outbox entries and replay/reconcile their provisional overlays; never clear pending work to rebuild a cache. Access-scope changes require safe reauthorization and removal/quarantine of inaccessible cached data without exposing it to a new user. Version contracts and local schemas; older clients receive an actionable upgrade response before incompatible mutations.

## Conflict policy

| Conflict                          | Required behavior                                                                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Metadata edited concurrently      | Detect expected-revision mismatch; field merge only with documented safe policy or user choice                                     |
| Inventory/financial command       | Revalidate invariant; accept transactionally, reject or require approved compensation/reconciliation; never silent last-write-wins |
| Price changed during offline sale | Preserve original local receipt and price snapshot; resolve through explicit checkout policy and audited adjustment                |
| Revoked user / invalid scope      | Stop synchronization under that identity; retain protected evidence for authorized recovery, no bypass                             |

## Live events and all consumers

Optional sockets carry versioned, tenant-authorized invalidation hints after commit; no authoritative balances or guaranteed delivery. Publish via committed change records/outbox when reliability requires it. Authenticate subscriptions and recheck permissions. Clients validate payloads, deduplicate/order by revision, refresh durable local data, and notify every affected query/view. On reconnect, pull from the durable checkpoint regardless of socket history. An open cart must show stale/changed prices and follow checkout policy.

## Retention, recovery and terminals

Browser storage can be evicted and has quota/durability limits; request persistent storage where available, monitor capacity and fail visibly on write failure. Never promise unqualified durability or private-mode support. Define encrypted authorized exports/backups for unsent work and test restores; native backup must include a consistent database/outbox state. Central backups require restore drills and agreed recovery objectives. Purge acknowledged history only under the agreed retention policy.

Shared terminals partition local data and credentials by business/user context; lock sessions, restrict offline authorization lifetime, protect keys and prevent sign-out/updates from discarding pending work. Offline revocation is inherently delayed; the security policy must bound it. Devices remain independent offline writers: a local network alone provides neither shared truth nor stock consensus. A future store-local server requires an explicit authority/failover design; no ad hoc peer database sharing.

# Optional navigation assistant boundary

There is no configured external model connection, tool executor, embedding store or autonomous action. Stage 6 exposes authenticated integration status and a guarded navigation endpoint; disabled AI returns HTTP 503, while static permission-aware navigation remains usable. `AiModule` is registered in Nest but has a null provider. The application boots normally with AI disabled. Enabling a provider name without an installed adapter fails startup with a safe configuration error; it never returns fabricated AI success.

## Boundaries

| File under apps/api/src/ai | Responsibility                                                                                                                                                                                  |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| configuration.ts           | Validate provider/model identifiers, server credential presence, 100–30000ms timeout and 64–2048 output-token budget without echoing values.                                                    |
| provider.ts                | Provider-independent request interface and unknown response, AbortSignal, safe failure codes. No database, mutation callbacks or tool interfaces.                                               |
| templates.ts               | Versioned navigation-help.v1 policy, strict input, strict output and usage schemas.                                                                                                             |
| context.ts                 | Permission-filtered static navigation labels. No customer records, warehouse quantities, names, account identifiers or tenant IDs are sent to a provider.                                       |
| execution.ts               | One provider attempt, bounded timeout with abort, schema validation, safe failure categories. No automatic retries.                                                                             |
| ai.service.ts              | Internal authenticated-context entry point; authorization before context construction and after the provider boundary; at most two in-flight calls per service instance; allowlisted telemetry. |
| ai.module.ts               | Disabled-by-default composition; refuses uninstalled providers.                                                                                                                                 |

`POST /businesses/:businessId/integrations/assistant` invokes `explainNavigation(actor, businessId, input)`. The controller applies database-backed limits of 20 requests/account and 100 requests/business per 15 minutes; `GET /businesses/:businessId/integrations` returns safe status and static navigation. The Actor must come from the existing authenticated backend request, never request-body identity. `OrganizationScope.run` reuses active-account, business membership, permission and scoped-location checks. It authorizes `business.read`, filters allowed section labels with the existing permissions, releases the transaction before any provider network call, and reauthorizes before returning output. Revoked membership, disabled accounts or changed allowed sections prevent delivery. Foreign businesses fail before the provider is called.

This narrow permission-aware context builder is intentionally the only retrieval implementation. Future retrieval must use explicitly scoped business-service adapters and a field allowlist. An unrestricted database/repository connection must never be passed to a model or provider. There is no database transaction held across inference, no business mutation and no AI-specific business table.

## Configuration

Server-only examples are in `apps/api/.env.example`, `.env.test.example` and `.env.production.example`:

```dotenv
AI_PROVIDER=disabled
AI_MODEL=
AI_API_KEY=
AI_TIMEOUT_MS=10000
AI_MAX_OUTPUT_TOKENS=512
```

Only placeholder credential names are supplied. Do not add AI keys to VITE_, EXPO_PUBLIC_, desktop config, README login tables or prompts. Secrets remain in server environment configuration. No provider-specific SDK is installed. Model/provider identifiers have bounded safe syntax; missing enabled credentials and invalid numeric limits produce value-free errors. Unknown adapters fail closed in AiModule.

To add a real adapter: select the approved provider and capabilities; add its dependency only in the API workspace; implement AiProvider behind the module injection token; replace the fail-closed composition with a fixed allowlist of installed adapters; keep credentials inside the adapter; honor AbortSignal; validate adapter responses; and test credentials/configuration without paid network calls. Do not accept arbitrary provider URLs, models or tools from clients. The exposed endpoint uses authenticated context, permissions and durable account/business quotas. The adapter still needs a reviewed provider/privacy/retention policy and an operator-set spending cap; token/request limits do not certify a monetary budget.

## Prompts, context and outputs

`navigation-help.v1` has one purpose: explain existing navigation. It cannot inspect stock, calculate balances, approve requests or perform transactions. Trusted policy and untrusted user text are separate request fields. Context contains only server-selected static labels. Retrieved/imported/external text must remain untrusted data in future templates; it cannot override policies or grant privileges.

Separating prompt fields is not a security sandbox. Security comes from backend authorization, bounded data access, absent action interfaces, strict schemas and reauthorization. Output accepts only `{ explanation: string }` (1–1200 characters); action/tool/extra fields and malformed responses are rejected. The web/Tauri and native UI display output as escaped, untrusted text, and never execute it, render unchecked HTML, or treat its claims as proof of an action.

Each future prompt version must document purpose, allowed operations, input/output schemas, trusted sources, prohibited operations, failure handling and evaluation criteria. Add deterministic tests for authorization denial, tenant boundaries, malicious user/retrieved instructions, malformed output, timeout, revoked access and sensitive-data leakage. Global prompt templates must not contain tenant records or secrets. A consequential operation must be a separately authorized normal business-service command, with trusted parameter validation, idempotency and explicit user review where appropriate; AI text itself cannot invoke one.

## Failures, observability and retention

AiFailure exposes only fixed codes: AI_DISABLED, AI_INVALID_INPUT, AI_TIMEOUT, AI_BUSY, AI_RATE_LIMITED, AI_PROVIDER_FAILED, AI_INVALID_OUTPUT. Timeout, busy and provider availability/rate failures carry a retryable hint, not an automatic retry. No raw SDK error or unvalidated provider response crosses this boundary. Aborted results are discarded; adapters must actually cancel their network work when the signal aborts. Output delivery has a second authorization check.

SafeLogger receives request/correlation ID, provider and model identifiers, template operation, outcome code, latency and optional inputUnits/outputUnits (token counts). It receives neither question nor explanation, credentials, business identifiers nor retrieved content. Its general redactor also suppresses prompt/response/completion/api-key keys as defense in depth. Tests check exact emitted metadata and secret-bearing nested values. No prompt, response, embedding or chat history is stored. Cost is not estimated because there is no provider tariff or usage billing integration. Existing restricted log collection owns metadata retention; review deployment retention/access before enabling a real provider. Any future content retention needs a separate explicit policy and tenant-aware storage/erasure design.

## Validation and limits

Unit tests use deterministic mocked providers: disabled configuration, invalid credentials/config values without leakage, strict input/output schemas, denied retrieval, policy/data separation, authorization after inference, safe provider errors, timeout cancellation and redaction. A real PostgreSQL integration test proves cross-business denial, viewer context minimization, account revocation during provider work and default-disabled application wiring. No paid model requests occur.

No external provider behavior, model safety quality, monetary cost accounting, retrieval of business data or production AI deployment is claimed. Stage 6 adds shared database request quotas and HTTP/UI unavailable behavior; real provider integration requires selection, implementation and operational review. See the [Stage 6 audit](../development/stage-6.md).

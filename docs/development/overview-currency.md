# Overview dashboard and currency preference

The existing `/dashboard` overview is now a responsive, read-only operational dashboard. Web and Tauri share the React panels; Expo renders native cards and data rows using the same tokens, contracts and exact monetary helpers. No new dependencies or database migrations are required.

## Impact map

| Layer                     | Ownership and change                                                                                                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authoritative facts       | Existing sales, sale lines, catalog, stock balances and business settings; no source records changed                                                                         |
| Transaction / permissions | `apps/api/src/reports/dashboard.service.ts` uses `OrganizationScope.run`, fresh membership and authenticated store/warehouse scope; `reports.read` plus category permissions |
| REST contracts            | `packages/contracts/src/dashboard.ts`, `apps/api/src/reports/dashboard-queries.ts` and `reports.controller.ts`; bounded, validated read endpoint                             |
| Settings persistence      | Existing `settings.ts` preference schema and `settings/fields.ts`; account currency defaults to USD and follows existing policy precedence, versioning and persistence       |
| Client / recovery         | `packages/api-client/src/dashboard.ts`; cancel obsolete reads when business, period or currency changes; refresh and retry remain read-only; no offline queue changes        |
| Web / desktop             | `apps/web/src/features/reports/Dashboard*.tsx`, `theme/overview.css`; actual common metrics, table, badges, buttons and loading/error primitives                             |
| Native                    | `apps/mobile/src/reports/Dashboard*.tsx`; native equivalents, accessible daily values and currency link; no DOM components                                                   |
| Verification              | Contract/client tests, web/native component tests, PostgreSQL integration, `tests/manual/overview-currency.mjs`, screenshots in `docs/qa/overview-currency`                  |

## Screen and currency behavior

- Four permission-aware metrics: sales today, orders today, average basket and low stock. Inventory preview shows four lowest-availability active tracked SKUs with units and semantic statuses.
- Quick POS previews two recent confirmed sale records and links to the existing checkout when authorized. Receipts and top products link to the existing sales screen. Product images are not invented; package icons identify records without catalog images.
- The trend covers the last 7 or 30 inclusive UTC dates, with an exact-value accessible table on web and expandable daily rows on native. Native uses light bar geometry rather than a DOM SVG.
- Growth compares gross sales with the preceding equal-length UTC window. A zero prior baseline is explicitly unavailable, not an invented percentage. The arc represents current sales' share of the two periods when a comparison exists; exact current/previous amounts accompany it.
- Settings → Preferences → Currency supports the existing validated currency types: USD, EUR, GBP, PKR, JPY, KWD and CLF. Missing preferences resolve to USD. It selects which recorded transaction currency the overview queries. It does **not** convert currencies, relabel existing monetary values, change checkout pricing or modify existing receipts.
- Currency changes are saved using the existing authenticated account settings store. Business/platform policy enforcement retains its existing precedence. Demo preferences are intentionally in-memory; database-backed account persistence is tested separately.
- The overview requires connectivity. Refresh failures remain visible and do not claim unconfirmed offline transactions as server sales. The existing offline cash workflow is unchanged.

## API and calculation rules

`GET /api/v1/businesses/:businessId/reports/overview?currency=USD&days=30` accepts only the supported currency enum and `days=7|30`. Unknown query keys are rejected. The server obtains location scope from the authenticated membership, never from a client-provided warehouse. Sales requires `sales.read`; inventory requires `stock.read`, in addition to `reports.read`. Unauthorized categories are `null` and omitted by the UI.

Monetary fields are exact minor-unit strings. Counts, trend totals and product totals aggregate existing sale facts. Sales are **gross recorded sales including tax, before return/void compensation**, consistent with the existing gross report; they are not net revenue, profit or cash balances. Average basket is rounded to the currency's minor unit. Refunded/voided records retain their explicit sale status. Top products aggregate line gross amounts by SKU within the same window/currency. No sum combines currencies.

Available stock is on-hand minus reserved minus damaged, summed across authorized warehouses. The current business low-stock threshold uses each SKU's base unit. Positive availability at/below threshold is low stock; zero/negative availability is separately out of stock. Current stock is independent of the selected sales period and currency.

The API returns at most 30 daily points, six recent sales, five top products and six stock preview rows. It reuses database indexes and transaction/statement timeouts. No whole sales dataset is downloaded. Production-volume query benchmarking remains necessary; a bounded response alone is not a throughput guarantee.

## Validation evidence

See the accompanying QA record below for actual commands, outcomes and platform limitations. Tests use isolated, retained PostgreSQL databases. No production accounts or transactions were created or modified.

Exact command and platform results: [QA report](../qa/overview-currency/report.md).

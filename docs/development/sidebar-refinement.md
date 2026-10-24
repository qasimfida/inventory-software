# Sidebar, selection and role overview refinement

## Impact map

| Layer             | Change                                                                                               | Preserved boundary                                              |
| ----------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Web / Tauri shell | Resizable rail, bottom utilities, header back, single location menu, direct single-route groups      | Same destinations, server authorization and checkout scope lock |
| Native shell      | Single location menu, header back, direct single-route groups, connectivity first in status strip    | Native navigation and storage                                   |
| Preferences       | Accent aliases cover selected navigation, rows and controls; Karla is the default for unset accounts | Explicit saved fonts and policy precedence remain intact        |
| Shared navigation | Platform admin overview, cashier POS, scoped business reports for others                             | Existing screens and backend query scopes                       |
| Collections       | Radix checkbox, keyboard list/grid tabs, clear icon, striped rows                                    | Loaded-record selection only; no bulk mutation                  |

Business administrators are owners or custom memberships granted `business.write`. Platform administrators use the existing server-provided capability. Managers, cashiers and viewers cannot open the switcher; their authorized location scope is still applied by the server. The menu selects one location or the whole authorized business, never multiple locations.

Sidebar width is temporary view state (208–384 px); drag its edge or focus the separator and use arrows/Home/End. Collapsing retains the chosen width. Native apps use their existing navigation instead of a desktop resizing control.

Karla was already bundled. It is now the default only where no saved font/policy overrides it. Existing explicit system or other fonts are retained. Accent changes tint navigation/selected surfaces without changing warning/error semantics. Native uses equivalent sRGB blends.

The existing showcase renders the actual checkbox and list/grid tabs through RecordCollection. No business data is used. No API schema, migration, authorization rule, financial calculation or inventory mutation changes are required.

Validation evidence: [report](../qa/sidebar-refinement/report.md).

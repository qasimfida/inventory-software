# Interaction refinement impact map

| Layer                | Planned changes and safeguards                                                                                                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source facts         | Catalog pricing remains authoritative; suggestions show an explicitly indicative price, checkout still re-quotes. Platform aggregates read registration/state facts only.                          |
| Authorization        | Existing membership/location checks and platform-admin guard; no business member receives platform analytics. Store switch limits the visible authorized locations, never grants scope.            |
| Contracts            | Optional validated POS currency/category filters and nullable indicative price; palette/font preference choices extend existing settings. Existing saved settings remain valid.                    |
| Settings/persistence | Existing account settings and policy precedence. No second settings system. Font discovery only on user action, no uploaded font list.                                                             |
| Web/Tauri            | Shared Radix select, one content back action, compact striped tables/action menus, unified POS lookup, sticky cart, workspace selector, profile/theme/notifications menus and grouped preferences. |
| Native               | Native modal selection, unified lookup/camera suggestions, native workspace/profile/theme/notification panels and equivalent preferences. No DOM imports.                                          |
| Validation           | Input/form/keyboard/select tests, SKU price/currency/barcode API checks, admin denied-access integration, UI/theme/responsive walkthroughs, supported builds.                                      |

No stock, payment, checkout submission, authentication or offline-grant permission bypass. A different view is not a different authorization tier. Unavailable native installed-font enumeration must be reported rather than fabricated.

## Implemented data and platform rules

- POS name/SKU/barcode lookup is a single field. Enter requests suggestions, selection adds the
  chosen SKU. Native camera results populate that same field; hardware keyboard scanners can
  type there. Category, availability and account currency filter the bounded server page.
- Suggestion prices are the current public base-unit price applicable to the selected warehouse's
  store. Customer prices, tax, promotions and unit conversions are calculated by the existing
  checkout quote. Missing prices are explicit; no exchange-rate conversion was introduced.
- Sidebar workspace selection lists actual memberships and their visible stores. Active carts,
  busy checkout and unresolved checkout prevent switching. A store view filters operational
  location choices and adds a backend-validated store filter to overview reports. Business-wide
  catalog/settings remain business-wide. Switching never creates membership or grants permission.
- `GET /api/v1/auth/security/platform/overview` is guarded by active platform administrator status.
  It returns bounded registration history, application entity counts and paginated businesses;
  it does not expose account emails, credentials, transaction amounts or impersonation controls.
- Table rows have no inter-row spacing; padding is inside cells, with theme-aware zebra stripes.
  Inventory row actions reuse the existing detail/adjustment workflows and permission rules.
- Web/Tauri cart scrolling is independent on wide windows. The native shell provides a persistent
  cart action and native scrollable cart panel, preserving one cart model and its confirmation flow.
- Notifications preview the last authorized inbox response. Opening a preview does not mark an
  alert read or confer permission. View all opens the existing notification page.

## Preferences and dependencies

Five validated accent choices: blue/default, teal, violet, rose and amber. Status colors retain
semantic meaning. Preferences are grouped into appearance, typography and layout/behavior using
existing account persistence and policy precedence. Theme is a labeled profile-menu action with
system/light/dark selection. No saved preference is reset.

System, Karla, Lora, generic serif and monospace are supported. Karla (92 KiB) and Lora (207 KiB)
are bundled from the Google Fonts repository under their included SIL OFL licenses in
`packages/design-tokens/fonts`; there are no runtime font CDN requests. Web loads the chosen font
through `font-display: swap`. Expo loads the bundled assets through its matching `expo-font` module.
A selected system/device font always has a system fallback. Technical monospace content retains
its dedicated family.

Installed-font discovery uses [Local Font Access](https://developer.mozilla.org/en-US/docs/Web/API/Window/queryLocalFonts)
only after pressing **Find installed fonts** in a supporting secure browser. Only the selected
validated family name is saved; neither font bytes nor the installed-font inventory is uploaded.
Native mobile and macOS WKWebView have no installed-font enumeration adapter; their bundled/system
choices work and web-specific families fall back. This is a documented platform limitation, not a
claim that every OS font is discoverable. `@radix-ui/react-select` extends the existing Radix/shadcn
stack; it is not a second UI library. No database migration or transaction mutation was added.

Verification evidence and device limitations: [interaction QA](../qa/interaction-refinement/report.md).

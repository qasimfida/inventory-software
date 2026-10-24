# Navigation and workflow presentation refinement

## Impact map

| Layer            | Changes and safeguards                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Owning sources   | Organization membership/location scope; settings policy company profile; existing catalog/customer/stock commands                                            |
| Server/contracts | Validated company branding in versioned business policy; authorized multi-location report and stock reads; customer state/currency filters before pagination |
| Persistence      | Existing policy JSON and account preferences; no second settings store or migration; no offline financial command changes                                    |
| Web/Tauri        | Sidebar team switcher, collapsible sections, theme popovers, top settings navigation, searchable command selection, sheets, selection and customer list/grid |
| Native           | Native selection/sheets, accordion sections, equivalent settings/company/customer/scope capabilities, no DOM imports                                         |
| Validation       | Scope/branding/filter regression tests, keyboard/selection/sheet tests, browser and available native checks, builds                                          |

Multiple locations always belong to one selected business. An empty selection means all authorized
locations. Mutations still require one explicit location. Workspace changes remain blocked by an
active or uncertain cart. Company display information does not replace legal/transaction identity;
business name retains its existing authorized editor. Branding uses the existing business policy
version, permissions and audit trail. No ledger or checkout calculation changes are intended.

The shell follows the existing Radix-based shadcn composition, including its
[sidebar team-switcher pattern](https://ui.shadcn.com/docs/components/radix/sidebar).
Installed components are extended, not replaced by a second UI framework. Real loading may use
indeterminate progress; no invented completion percentage is shown.

## Behavior and limits

- Header keeps breadcrumbs, navigation controls and status; the profile menu lives only at the
  bottom of the sidebar. Page titles remain in content. Desktop sidebar sections collapse with
  keyboard-operable chevrons; mobile uses its own disclosure navigation.
- Settings routes remain unchanged, with a top horizontally scrollable navigation row. Preferences
  are grouped as appearance, typography, layout/controls, regional and accessibility/performance.
  Theme popovers offer Light/Dark/System and the existing five semantic accent palettes; enforced
  policy still wins over personal choices.
- `/settings/company` adds business contact/display details and a validated PNG/JPEG/WebP logo
  (60 KB file limit). It uses the existing business policy, version conflicts, business.write
  authorization and settings audit events. The first palette color sets the business default;
  personal overrides remain. Logo data stays in the policy; no external image URL is fetched.
- Workspace selection combines authorized stores/warehouses within one business. Dashboard and
  stock overview sum selected warehouses; transactions still choose one location. Other location
  pickers are restricted to the selected set. Different businesses are never combined. Query
  lists are bounded to 100 warehouse IDs. Views above that bound require a narrower selection.
- Customer filters run before server pagination. Customers have list/grid views and local loaded
  record selection; catalog/inventory also support local selection. No bulk financial action was added.
- POS category/availability filters live beside search; customer search offers Add customer only
  with customers.write. Existing validated create command runs in a sheet, then selects the result.
- Radix accordion/popover/progress and cmdk reuse the established React stack. expo-image-picker
  supplies native logo selection. No new frontend framework or database migration was introduced.

### Validation scope

Database tests use isolated retained databases, never the user's records. Browser and Android
interaction checks use development fixtures, so they do not prove production authentication,
real payment posting or native release signing. Actual database tests separately exercise the
new settings, filter and aggregation boundaries. See `docs/qa/navigation-refinement/report.md`
for exact final results and device limitations.

# Common component API and usage

## Discover the library

Open `/#/design-system` (the existing hash route also works in Tauri). The Settings link remains development-only; the existing direct route remains available in packaged builds and contains no business data. A section index focuses and scrolls to actual examples without changing the hash route. Examples, including theme selection, use isolated local state; API diagnostics remain in Settings.

- [Complete web common-component props and usage](component-catalog.md)
- [Native equivalents, props and usage](native-component-catalog.md)
- [Showcase audit, contribution rules and validation](component-library.md)

All paths below are relative to `apps/web/src`. These are real exported APIs, demonstrated at `/#/design-system`. DOM components run in browsers and Tauri WebViews, never React Native. All colors follow semantic tokens. Props marked optional have `?`; other props are required. Native equivalents are documented below.

## Layout and navigation

- `components/common/Layout.tsx`: `Page(props: ComponentProps<'main'>)`, `Panel(props: ComponentProps<'section'>)`, `Stack`, `Cluster`, `Grid` (each `ComponentProps<'div'>`). `className`, children and ordinary element props are optional. Page owns the main landmark and skip link: use exactly once per route. Panel groups related content; avoid nested cards for each value. Stack is vertical, Cluster wraps actions, Grid is one column and two at the large breakpoint. No domain state or network requests.
- `components/layout/WorkspaceHeader.tsx`: `WorkspaceHeader()` supplies the application title, Appearance control and development-only showcase link. Use on the workspace route, not inside a feature.
- `components/layout/SectionNavigation.tsx`: `items: {name:string; label:string}[]`, `current:string`, `onSelect:(name:string)=>void`, `label?:string='Workspace sections'`, `sticky?:boolean=false`. Controlled navigation buttons use `aria-current`; Tab/Enter/Space activate them. These are section buttons, not ARIA tabs and not URL history. Wrap on small screens, vertical sidebar on large screens. Enable sticky only when placed beside content in the workspace grid; inline examples stay in document flow. Permission filtering remains the caller's responsibility; the backend is authoritative.

```tsx
<Page><WorkspaceHeader /><Grid><Panel><h2>Stock review</h2></Panel></Grid></Page>
<SectionNavigation items={[{name:'stock', label:'Stock'}]} current="stock" onSelect={setSection} />
```

## Forms and validation

- `components/common/FormField.tsx`: `FormField({id?:string, label:string, description?:string, error?:string, required?:boolean, children:(control)=>ReactNode})`. Generated id by default; required defaults false. `control` contains input `id`, `aria-invalid`, `aria-describedby`, `required`. Spread it onto the actual Input/Select/Textarea. Do not put labels on a decorative container instead. Errors remain descriptions; the summary announces the failed submission.
- Same file: `ErrorSummary({errors:{id:string;message:string}[], ...divProps})`. No errors renders nothing. Callers focus its ref after failed submission. Buttons focus the matching field; they do not change hash navigation. Use for multiple field errors, not transient success messages.
- `components/common/CommandForm.tsx`: `definition: CommandForm` and `run:(work:()=>Promise<unknown>)=>void`. Definition comes from `@inventory/api-client`: `title:string`, `fields:CommandField[]`, `submit:(values:FormValues)=>Promise<unknown>`. Field: `name:string`, `label:string`, optional `kind:'text'|'number'|'boolean'|'select'|'multiline'`, `options:{value:string;label:string}[]`, `value:string|number|boolean`, `required:boolean` (defaults true). Default kind is text. Decimal stock/money input stays string; only explicitly numeric fields are coerced. Existing model owns busy/error/retry/idempotency handling. Do not use it to execute unvalidated mutations or add client-side financial rules. Native constraint validation is retained; server schema validation remains required. Labels, token-sized controls, semantic textarea and stable defaults are shared by Stage 3 forms.

```tsx
<FormField label="Reference" description="Use the supplier document number" error={error} required>
  {(control) => <Input {...control} value={reference} onChange={e => setReference(e.target.value)} />}
</FormField>
<CommandForm definition={receiveForm} run={work => void resourceModel.run(work)} />
```

## Feedback and confirmation

- `components/common/AsyncState.tsx`: `LoadingState({message?:string='Loading…'})` announces polite status; `EmptyState({message:string,announce?:boolean=false,action?:{label:string,onClick:()=>void}})` is passive explanatory text unless the existing result flow needs a polite status announcement; `ErrorState({message:string,onRetry:()=>void})` announces a safe error and exposes a keyboard-operable Try again button. Use one announcement per transition; do not turn every ledger paragraph into a live region. Retry must preserve the existing operation key for uncertain writes.
- `components/common/ConfirmDialog.tsx`: `trigger:ReactElement`, `title:string`, `description:string`, `confirmLabel:string`, `onConfirm:()=>void`. No optional props. Uses installed Radix Dialog, labelled alertdialog, initial Cancel focus, focus containment, Escape cancellation, outside-click prevention and trigger focus restoration. Confirm is destructive. The callback is synchronous: schedule asynchronous work through the existing model, which owns pending and failure state. Do not pass a promise and assume this wrapper waits. Real business archiving now uses this wrapper; native has a corresponding confirmation. This is additional UI review, never a substitute for permission/version checks.

```tsx
<ErrorState message="Stock could not be loaded." onRetry={() => void model.run()} />
<ConfirmDialog trigger={<Button>Archive</Button>} title="Archive this business?"
  description="Archiving is permanent." confirmLabel="Confirm archive" onConfirm={scheduleArchive} />
```

## Data and actions

- `components/common/IconButton.tsx`: `label:string`, `icon:LucideIcon`, other Button props excluding children/aria-label/size/asChild. Default variant outline, fixed size icon (36px fine pointer, at least 44px coarse pointer), default type button. Label becomes accessible name and title; icon is decorative. Enter/Space behavior comes from Button. Prefer visible text for primary or consequential business actions. Import only named Lucide icons; no dynamic whole-library loader.
- `components/common/Pagination.tsx`: `label:string`, `offset:number`, `hasMore:boolean`, `onChange:(offset:number)=>void`, `pageSize?:number=25`, `busy?:boolean=false`. Offset is nonnegative and pageSize positive, supplied by trusted app state. No page count is invented. Previous/Next disabled at known boundaries and while busy; current page derives from offset. Wraps at small widths. Use the API's pagination, never download all rows to paginate locally. Supplier invoice and event history use this component.
- `components/common/DataValue.tsx`: `MoneyValue({amount:string,currency:string})` delegates to exact `formatMinorUnits` (integer minor-unit strings); `BusinessDate({value:string,timeZone?:string='UTC'})` delegates to `businessTime` and renders a semantic time element. Use validated values and the business IANA time zone. Never parse exact financial strings with Number to display them. Invalid domain input is not silently repaired. Quantities continue using the domain's six-decimal strings; do not relabel them as money. POS total uses MoneyValue. Long formatted values wrap at narrow widths or enlarged text instead of overflowing or truncating digits; the existing exact-money showcase exercises this at 200% text.
- `components/ui/StatusBadge.tsx`: `children:ReactNode`, `tone?:'neutral'|'success'|'warning'|'error'|'info'='neutral'`. Passive inline text, not a live region. Always include meaningful text. Muted surface and semantic foreground follow both palettes. No click behavior.
- `components/ui/Skeleton.tsx`: `label?:string='Loading content'`. Static loading placeholder with one accessible status; decorative bars are hidden. No forced shimmer or motion.

```tsx
<IconButton label="Refresh inventory" icon={RefreshCw} onClick={refresh} />
<Pagination label="invoices" offset={offset} hasMore={page.hasMore} onChange={setOffset} />
<MoneyValue amount="1250" currency="USD" />
<BusinessDate value="2026-10-20T12:00:00Z" timeZone="Asia/Karachi" />
<StatusBadge tone="warning">Awaiting receipt</StatusBadge>
```

## Offline/warehouse composition helpers

`components/common/WorkspaceControls.tsx` is retained for existing warehouse and offline consumers:

- `Box({children:ReactNode})`: related section with spacing and a border.
- `Txt({children:ReactNode})`: passive paragraph. Add a dedicated LoadingState/status only for an actual transition.
- `Act({label:string,onPress:()=>void,disabled?:boolean=false})`: ordinary primary Button.
- `F({label:string,value:string,onChange:(s:string)=>void})`: controlled labelled Input.
- `Secret({value:string,onChange:(s:string)=>void})`: controlled password Input labelled “Separate offline passphrase (15–128 characters)”, autocomplete off. Use once in a page (stable id); do not pass account credentials as an example.
- `Pick({label:string,value:string,onChange:(s:string)=>void,options:{value:string;label:string}[]})`: native labelled Select.

These helpers are compatible wrappers, not a second primitive library. New general-purpose forms should prefer FormField and standard controls. All helpers are DOM-only, responsive and themed; their native equivalents use native controls.

```tsx
<Box>
  <Txt>Review the selected warehouse.</Txt>
  <F label="Reference" value={value} onChange={setValue} />
  <Pick label="Example location" value={location} onChange={setLocation} options={options} />
  <Act label="Refresh" disabled={busy} onPress={refresh} />
</Box>
```

## Primitive foundation

`components/ui/Button.tsx` retains the shadcn-style Button API: native button props plus variant (default, destructive, outline, secondary, ghost, link), size (default, xs, sm, lg, icon, icon-xs, icon-sm, icon-lg), asChild optional false. Default type button; submit must be explicit. Default controls are 40px (36px compact), small controls 32px, large controls 48px, icon controls 36px. Coarse pointers retain a 44px minimum. Text buttons wrap long labels and grow vertically instead of clipping at large text sizes. Disabled colors remain readable; disabled state is semantic.

`FormControls.tsx` Input, Select, Textarea forward their corresponding native element props. Checkbox forwards input props except type, sets type checkbox, and needs a visible label with a touch target. Native selection controls retain platform keyboard/picker behavior. `Dialog.tsx`, `Menu.tsx` retain the documented scoped Radix composition; use accessible titles/descriptions and explicit close controls. `Table.tsx` forwards table props: provide caption and th scope. Do not use tables for layout; put wide data inside a labelled overflow region or provide a mobile alternative. Components that have no current usage (sheets, tooltips, radio library, virtualization) were not installed speculatively.

## Native equivalents and limits

`apps/mobile/src/ui/Themed.tsx` exports Text (TextProps plus optional tone default/error/muted/success/warning/info) and TextInput (TextInputProps); they apply semantic colors, allow font scaling and accept native style overrides. Text defaults to error tone for `accessibilityRole="alert"` and default tone otherwise; an explicit tone overrides this choice. TextInput defaults to a 48-unit target and readable placeholder; `editable={false}` applies disabled colors. `ui/Controls.tsx` owns Action, Field and Choice; organization/Controls is only a compatibility export. Action(label,onPress,disabled=false,loading=false,variant=default), implemented in `ui/Action.tsx` and re-exported from Controls; Field(label,value,onChange,disabled=false,maxLength=254,multiline=false,readOnly=false,description?,error?); Choice(label,value,options,onChange,disabled=false,inline=false). Choice options can be individually disabled. Choice exposes radio checked/disabled states and visible selection. These are native controls, not imported DOM widgets.

`ui/ConfirmAction.tsx`: label/description/confirmLabel/onConfirm required, disabled optional false. Native Modal handles presentation and back dismissal, Cancel and explicit Confirm archive; the caller schedules the mutation. Real VoiceOver/TalkBack focus and native modal behavior still require device qualification. `ui/AppearanceControl.tsx` uses native radio controls. `ui/NativeShowcase.tsx` is available under Components / Design system in development only. Existing printing/barcode artwork intentionally retains black/white physical contrast and is not a theme surface.

## Appearance and contribution rule

Web AppearanceProvider/AppearanceControl and native ThemeProvider/useTheme adapt the existing Command 25A settings model. Guest appearance is temporary and defaults to system. Authenticated preferences persist through the API and respect platform/business policy; the adapters do not create a competing browser-storage preference. The current font contract permits system fonts only.

When adding a common component, update its real showcase example, this props/defaults/usage entry, and applicable keyboard/accessibility tests in the same change. Use existing primitives before adding dependencies. In-app examples and lightweight tests currently satisfy isolated development; Storybook is deferred until its maintenance and bundle/tooling costs have a concrete benefit.

## Persisted presentation preferences

Command 25A connects the existing appearance providers to a shared settings model after authentication. LoadingState uses the existing Skeleton for enhanced presentation; EmptyState uses a bordered treatment. Their existing showcase examples reflect the effective settings without adding component libraries. Account settings choose motion, spacing, size and accent; OS reduced motion and minimum interaction targets remain mandatory. Native Themed text/input retain OS scaling, and the native showcase reflects effective colors/text size. See [settings precedence and adapters](command-25a.md).

## Foundation presentation refinements

- `Page`/`Panel`: unchanged props/landmarks, reduced outer and surface padding with the existing density-aware spacing unit. The foundation route exercises both.
- `Button`: unchanged props/default type/variants; `text-control` follows the 14px semantic control token. Text labels wrap, including `sm`/`xs`; icon target dimensions remain enforced. ComponentsDemo includes a long-label small outline button.
- `Input`/`Select`/`Textarea`: unchanged native props and validation semantics; the same control typography, with a coarse-pointer 16px floor. FormDemo retains labelled inputs, validation and error focus.
- `Table`: headers, rows, hover and optional static `data-selected="true"` row treatments use semantic table tokens. ReferencePanel demonstrates selected text; the attribute alone adds no selection behavior or permission.
- `SectionNavigation`: unchanged items/current/onSelect API; selected and hovered states use navigation tokens, retain `aria-current="page"`, and wrap labels. ComponentsDemo remains the keyboard-operable example.
- Native `Text`: unchanged props and tone; automatic line height follows custom font size unless explicitly supplied, then scales with the existing text-size preference. NativeShowcase exercises a token-sized heading. Native action shadows reference the canonical shadow color and retain the effects toggle. Field/Choice gaps and control padding follow compact density without reducing touch targets. The native App shell sets status-bar icon contrast and Android top inset from the resolved theme/platform.

Font size, spacing, accent, effects and motion continue to use resolved settings. Disabled animation and OS reduced motion override component rules, including pseudo-elements. Use semantic colors and the existing system font; introduce new font choices only with an explicit future contract change.

## Workspace navigation and catalog presentation

`SectionNavigation` supports an optional `rail` presentation and per-item Lucide `Icon`.
Names remain accessible, `aria-current` identifies the current page, and labels are visible
at narrow widths; desktop icons have hover/title labels. See **Example icon rail** in the
component showcase. Permissions still determine the supplied navigation items; presentation
never grants access. Visited web and native sections remain mounted to preserve local drafts,
and unvisited sections do not initiate data requests.

Web/Tauri authentication uses a constrained `SignInLayout`. Account session controls are
under **Account & sessions**. Business policy is under **Business & access**; category administration is under **Manage categories**. Catalog
filters, cards and details are feature-owned components, not shared business logic. They
show stored product metadata and actual image URLs with a missing-image fallback. Prices
remain in Variants & pricing, and stock remains in Inventory; cards do not invent totals.
Native uses the same neutral/blue tokens with touch-sized section buttons, and keeps
connection/appearance tools in Settings. It does not consume DOM components.

## Core interaction states (Prompt 2)

See [the control contract and audit](core-components.md) for dimensions, interaction states, migration scope and validation. Web `ControlStatesDemo` and native `NativeShowcase` contain live examples. No business command runs from either demo.

`Button loading={pending}` and `Action loading={pending}` preserve their label footprint, expose busy/disabled state and suppress activation. Keep the label stable while pending. Owners still manage operation state and retries. Button loading is deliberately unavailable with `asChild`; preserve link semantics. Disabled/reduced motion overrides spinner animation. The default Button type remains button; submit is explicit.

```tsx
<Button type="submit" loading={pending}>Save changes</Button>
<FormField label="Reference" description="Supplied by the document">
  {control => <Input {...control} readOnly value={reference} />}
</FormField>
```

FormField renders a visual required marker without changing its accessible label; native `required` supplies the semantic state. Errors and hints reference the actual control. CommandForm now composes FormField while retaining names, limits, defaults and coercion. Input/Textarea forward `readOnly`; disabled fields remain omitted from native form data. Read-only fields remain included. Menu content portals outside clipping ancestors and scrolls within available viewport space; native Select options and keyboard behavior are unchanged.

## Complex presentation (Prompt 3)

`components/ui/Table.tsx`: Table forwards native table props, including caption, scope, aria-sort and existing selection attributes; it does not own sorting or fetch data. Headers are 40px, standard rows 44px, compact rows 34px with a 36px header; wrapped content grows. Cells use 12px horizontal padding (compact 10px). Put `data-numeric` on both a numeric header and its cells to get right alignment, tabular figures and no truncation. Values/units remain caller-owned strings. No formatting, rounding or currency conversion happens here.

The same module exports `TableScroll({label:string,...divProps})`, a named, focusable overflow region with a restrained border. Use it around tables that may overflow. Keep pagination outside the scroll region and retain server offsets/limits; do not download additional rows for presentation. Reports and warehouse child locations now use these primitives.

```tsx
<TableScroll label="Report table">
  <Table>
    <caption>Confirmed values</caption>
    <thead>
      <tr>
        <th scope="col">Measure</th>
        <th scope="col" data-numeric>
          Value
        </th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <th scope="row">Quantity</th>
        <td data-numeric>{exactQuantity}</td>
      </tr>
    </tbody>
  </Table>
</TableScroll>
```

`DialogContent` adds `size?:'default'|'compact'` (default 512px, compact 448px); ConfirmDialog uses compact. Maximum height, scrolling, accessible title/description, initial Cancel focus, outside-click protection, Escape and explicit confirmation remain intact. Panel uses the shared 20px padding/12px radius (compact padding 16px). StatusBadge remains passive and now uses compact 12px text. MenuSeparator forwards the installed Radix separator props; ReferencePanel demonstrates grouping without changing menu actions.

Native `ui/DataRow({label:string,value:string,unit:string})` shows exact report strings with tabular figures and wrapping rather than truncation. `ui/DisclosureTrigger({label:string,expanded:boolean,onPress:()=>void,disabled?:boolean=false})` announces controlled expansion and renders a 48-unit header with a plus/minus indicator. It never mounts children, changes expansion state or starts loading itself. Existing native panel owners retain their state, effects and actions. NativeShowcase demonstrates both. ConfirmAction uses a bounded native ScrollView and the same theme metrics; action and dismissal callbacks are unchanged.

Native HTML details/summary remains the web disclosure mechanism; shared CSS standardizes its header while preserving open/default state and nested forms. Rail labels appear on pointer hover or keyboard focus and Escape dismisses the label without changing navigation. Existing routes, visibility rules and visited-panel retention remain owned by the workspace.

The browser owns date-picker calendars and localization; native report fields retain YYYY-MM-DD UTC text input. There is no custom calendar, chart, ARIA tab, breadcrumb, drawer or timed toast system to migrate. Do not introduce a visually similar replacement that changes semantics. Offline labels and persistent errors retain their existing data sources and lifetime. See [complex component audit](complex-components.md) for verification and limits.

## Reference screen compositions

`MetricCard` in web `components/common/MetricCard.tsx` takes `label`, `value` (ReactNode), `unit` and optional `primary=false`. It is a passive, wrapping KPI surface; it never calculates values. The native equivalent in `ui/MetricCard.tsx` accepts exact string values with the same label/unit/primary contract. Native `Surface` composes themed padded groups with optional `muted=false`. Both have real examples in DataPresentationDemo / NativeShowcase. Native Action's `contrast` variant uses foreground/background tokens for sign-in; unavailable/focus/loading behavior is unchanged.

Web screen composition is in `theme/workspace.css`: two-column POS/cart at 1100px, two product columns on phones (one below 380px), wrapping metrics and a collapsed navigation menu below 1024px. Native cards use available width and OS font scale. Appearance is edited only in Settings (or the separate development showcase); account/business policies still resolve all values. See [reference screen redesign](reference-screens.md) for scope, source data and validation.

Native Action also accepts optional `accessibilityLabel` (defaults to `label`), so repeated “Add to cart” controls announce the specific product without duplicating its full name visually.

## Screen composition and transaction detail

`components/common/ScreenHeader.tsx` exports `ScreenHeader({title:ReactNode, description?:ReactNode, actions?:ReactNode, level?:2|3})`. Title is required; level defaults to 2, description/actions default absent. Use once at the top of a workspace module or an independently headed subsection (level 3). Avoid nested headers for every field. Actions remain caller-owned, with their original handlers and permission checks. The heading has native semantics; action keyboard behavior comes from the supplied controls. It wraps at narrow widths and uses semantic typography, border and muted tokens in both themes. It has no navigation, loading, network or domain dependencies beyond React.

`components/common/RecordDetails.tsx` exports `RecordDetails({label:string, items:{label:string;value:ReactNode}[]})`. All properties are required; no defaults or variants. Use for a selected transaction or a paginated event's exact, labelled facts; use Table for comparing many stock rows. It renders a labelled definition list, preserves full values and wraps long identifiers. One column on phones and two on wider screens. It never rounds, sorts, truncates or announces passive values as a live region. Format money/dates with DataValue or existing domain formatters at the caller; quantities and minor-unit amounts must retain their units. Dependencies: React and semantic global screen styles. Empty items render an empty list; the owning screen retains its existing empty/loading/error behavior.

```tsx
<ScreenHeader title="Purchase order" description="Review receipts and supplier returns."
  actions={<Button variant="outline" disabled={busy} onClick={refresh}>Refresh</Button>} />
<RecordDetails label="Purchase line" items={[
  {label: 'SKU', value: line.sku},
  {label: 'Received quantity', value: line.receivedQuantity},
]} />
```

Native equivalents are `apps/mobile/src/ui/ScreenHeader.tsx` (`title:string`, optional `description:ReactNode`, no actions or heading-level prop) and `ui/RecordDetails.tsx` (same required props, but each `value:string`). Native uses themed Text/View with an accessible header/record label and stacked facts, never DOM primitives. `ScreenBody({children:ReactNode})`, exported alongside the native header, supplies consistent vertical gaps without scrolling or disclosure state; use within the existing screen ScrollView. All three honor account text scale, theme and native font scaling. No new keyboard interaction is introduced. Web and native live examples appear in their existing component showcases. See [screen refinement audit](screen-refinement.md) for adopted consumers and validation.

## Appearance and performance preferences

See [the preference audit and verification](appearance-preferences.md) for supported options, platform behavior and intentional exceptions. Native `ui/AsyncState.tsx` supplies the corresponding LoadingState and EmptyState; see the native catalog for their complete contracts.

## Responsive viewport and focus (Prompt 7)

Native `apps/mobile/src/ui/AppViewport.tsx` exports `AppViewport({children:ReactNode})`: children is required; no variants, persistence or business state. Use for auth/showcase screens inside the root SafeAreaProvider and ThemeProvider, not inside another ScrollView. The routed NativeShell owns its own safe-area, keyboard and scroll layout for authenticated screens. It owns the native safe-area view, status-bar contrast and one scrolling surface with handled keyboard taps, drag dismissal and iOS automatic keyboard insets. The entire NativeShowcase runs inside this same application viewport. Android relies on the existing window resize policy. OS insets protect every edge in portrait/landscape; browser-native inset bridges and iOS behavior still need target-device qualification.

```tsx
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { ThemeProvider } from './theme';
import { AppViewport } from './ui/AppViewport';
<SafeAreaProvider initialMetrics={initialWindowMetrics}>
  <ThemeProvider>
    <AppViewport>{screen}</AppViewport>
  </ThemeProvider>
</SafeAreaProvider>;
```

Native Action now accepts optional `ref: React.Ref<React.ComponentRef<typeof View>>` for controlled focus management; ordinary callers do not need it. ConfirmAction uses this ref to request Cancel focus after presentation and trigger focus after cancellation/back dismissal. React Native Web keyboard behavior is regression-tested; native screen-reader focus needs TalkBack/VoiceOver qualification. A modal-local SafeAreaProvider protects its bounded content. Its existing local showcase demonstrates both outcomes without business writes. Themed.Text defaults alerts to assertive live announcements while retaining explicitly supplied live-region props. See [responsive verification](responsive-accessibility.md) for platform evidence and limits.

### Preference controls

`Switch` (`apps/web/src/components/ui/Switch.tsx`) is a controlled boolean setting. Required props are `label: string`, `checked: boolean`, and `onCheckedChange: (checked: boolean) => void`; optional `description: string` and `disabled: boolean` default to absent/false. Use for actual on/off settings, not inherited policy values or multiple selections. It uses a labelled `role="switch"` button, Space/Enter activation, a described hint, semantic tokens and a touch target independent of its visual track. Persistence and errors belong to its caller.

```tsx
<Switch
  label="Visual effects"
  description="Optional decoration"
  checked={effects}
  disabled={saving}
  onCheckedChange={setEffects}
/>
```

`Segmented` (`apps/web/src/components/ui/Segmented.tsx`) groups a small set of mutually exclusive string values. Required props: `label: string`, `value: string`, `options: readonly string[]`, `onChange: (value: string) => void`; optional `disabled: boolean`. Native radios provide keyboard arrow navigation and a fieldset/legend names the group. Options wrap at narrow widths and preserve focus in both themes. Use Select for long lists; do not use it for boolean settings.

```tsx
<Segmented
  label="Density"
  value={density}
  options={['compact', 'comfortable']}
  onChange={setDensity}
/>
```

`SettingSwitch` (`apps/mobile/src/ui/SettingSwitch.tsx`) is the React Native equivalent, using native `Switch`. Props are `label: string`, `value: boolean`, `onChange: (value: boolean) => void`, optional `description` and `disabled`. Labels wrap, native accessibility names/hints are retained, and semantic colors follow the theme. Native `Choice` remains the radio equivalent. Web examples are live in `/design-system`; `NativeShowcase` includes the native disabled state. These controls have no domain, network or storage dependencies.

## Inventory interaction controls

The executable local demo is `InventoryControlsDemo` on `/design-system`; native examples are in `ui/NativeShowcase`. These examples do not write business data.

### SearchControl

Named export from `apps/web/src/components/common/SearchControl.tsx`; native equivalent `apps/mobile/src/ui/SearchControl.tsx`. Use for a bounded, authorized live search owned by a feature. Do not use it to fetch all records or bypass a server filter.

Required props: `label: string`, `value: string`, `onChange: (value: string) => void`. Optional `suggestions: { value: string; label: string }[] = []`, `busy: boolean = false`, `disabled: boolean = false`. Both support `onSelect?: (value: string) => void` (defaults to onChange); web additionally supports `emptyMessage?: string`. At most eight suggestions render. Parent callers own debounce/cancellation and errors.

```tsx
<SearchControl
  label="Search inventory products"
  value={search}
  onChange={setSearch}
  busy={state.busy}
  suggestions={items.map((item) => ({ value: item.sku, label: item.name }))}
/>
```

Web uses a permanently visible labelled combobox, Arrow Up/Down selection, Enter acceptance and Escape dismissal. Native uses a permanent search field and touch actions with accessibility labels. No-match guidance stays visible. Semantic colors and global motion/font settings apply. Dropdown width is viewport-bounded. Web depends on existing Button/Input/lucide; native uses existing themed controls.

### QuantityControl

Named export from web `components/common/QuantityControl.tsx` and native `ui/QuantityControl.tsx`. Use for positive exact decimal quantities. Do not use for currency, stock adjustments or commands that permit negative values.

Required props: `label: string`, `value: string`, `onChange: (value: string) => void`; web also requires `id: string`. Optional `disabled: boolean = false`. No implicit value or rounding default. Minus/plus use shared `stepQuantity` (one selected unit), and invalid/overflowing steps are disabled. Manual fractional entry is preserved.

```tsx
<QuantityControl
  id="line-quantity"
  label="Quantity"
  value={quantity}
  onChange={setQuantity}
  disabled={submitting}
/>
```

Label/input associations, keyboard-editable input and accessible icon names are retained. Native touch targets follow native design tokens. Text scales with preferences. The parent owns validation, cart state and persistence.

Native additionally accepts `compact?: boolean = false`: this hides the visible label and removes extra spacing without removing the accessible input name or shrinking touch targets. Use it within labelled cart rows; standalone quantities should retain their visible label.

### WarehouseSelect

Named export from web `components/common/WarehouseSelect.tsx` and native `ui/WarehouseSelect.tsx`. Use for page-level warehouse context in POS, inventory, purchasing, reports and warehouse workflows. Do not replace destination fields or hierarchical stock-location editors with this control.

Web props are `ComponentProps<typeof Select> & { label: string }`. Supply a controlled `value`, `onChange` and direct `<option value="…">` children. Optional `disabled` and `id` are forwarded. Native accepts the existing `Choice` props: required `label`, `value`, `options: { value: string; label: string }[]`, `onChange`; optional `disabled` defaults to false. No warehouse is implicitly selected. Parents retain authorization, fallback selection, transaction locks and scope resets.

```tsx
<WarehouseSelect
  label="Inventory warehouse"
  value={warehouseId}
  onChange={(event) => setWarehouseId(event.target.value)}
>
  {warehouses.map((warehouse) => (
    <option key={warehouse.id} value={warehouse.id}>
      {warehouse.name}
    </option>
  ))}
</WarehouseSelect>
```

The web trigger opens the existing keyboard-accessible Popover and searchable Select; native opens SidePanel with Choice and closes on selection. Accessible labels identify the context; shared tokens and viewport-bounded overlays support themes, text scaling and narrow screens. Dependencies are existing Button/Popover/Select/lucide on web and Action/SidePanel/Choice on native. This is presentation only: it does not fetch warehouses or change permissions. The component showcase's workspace controls section provides a safe local-state example.

### Pagination

Named export from web `components/common/Pagination.tsx` and native `ui/Pagination.tsx`. Required: `label: string`, `offset: number`, `hasMore: boolean`, `onChange: (offset: number) => void`. Optional: `pageSize: number = 25`, `total?: number`, `busy: boolean = false`. Supply total only when the server provides it. Do not invent last-page numbers for cursor APIs.

```tsx
<Pagination
  label="products"
  offset={offset}
  pageSize={25}
  total={page.total}
  hasMore={page.hasMore}
  busy={loading}
  onChange={setOffset}
/>
```

First/adjacent/final pages and ellipses use shared `paginationPages`. Web uses a labelled navigation region and `aria-current`; native current-page labels announce selection. Controls wrap at narrow widths, use semantic theme tokens and remain keyboard/touch accessible.

### Native IconAction

Named export `apps/mobile/src/ui/IconAction.tsx`: required `label: string`, `icon: string`, `onPress: () => void`; optional `disabled: boolean = false`. Uses local `NativeIcon` geometry for search/user/bell/wifi and native glyphs for arithmetic/navigation. Use for recognizable actions with a meaningful label, never for a destructive action without its existing confirmation. Labels are available to assistive technology and on long press; focus is visible. Native icon geometry has no DOM, icon-font or external library dependency.

The web Button's existing icon sizes now supply a title hint from `aria-label` unless explicitly overridden. Callers must still provide an accessible name.

### Native StatusBadge and metric surfaces

`StatusBadge` is exported from `apps/mobile/src/ui/StatusBadge.tsx`. Use it for short textual statuses, not actions or long errors. Required `label: string`; optional `tone: 'neutral' | 'success' | 'warning' | 'error' | 'info' = 'neutral'`. It uses the native theme and text scaling, wraps within its parent, and conveys status through text as well as semantic color. It has no keyboard interaction, network access or DOM dependency. NativeShowcase demonstrates success, warning and error states.

```tsx
<StatusBadge label="Low stock" tone="warning" />
```

`MetricCard` in `apps/mobile/src/ui/MetricCard.tsx` retains required `label`, `value`, `unit` strings and optional `primary = false`. Optional `contained = false` removes the wrapping-row flex basis when the card fills an interactive parent. Optional `tone: 'success' | 'warning' | 'destructive'` tints the existing semantic surface; `primary` takes precedence. The card itself is static; its owner supplies navigation and accessible selected state. InventoryOverview demonstrates contained status metrics.

## List loading and control shape refinement

`SearchControl` is now a permanently visible search field. The leading symbol is decorative; the trailing clear control appears only for nonempty text and preserves focus. Web retains its combobox Arrow Up/Down, Enter and Escape behavior; native accepts optional `onSelect?: (value: string) => void`, defaulting to `onChange`. Callers still own queries, validation, debounce and cancellation. See the updated InventoryControlsDemo and NativeShowcase.

`Pagination` now reads the existing resolved `pagination` preference. It renders nothing for one page, retains bounded numeric navigation in `pages` mode, and delegates to `LoadMore` in `scroll` mode. A consumer must also use `usePageCollection` to retain rows; hiding buttons alone is insufficient. There is no new store. Radius follows the resolved `radius` preference through the semantic control radius; multiline and large surfaces retain usable corners.

### LoadMore and CursorPagination

Named exports in `apps/web/src/components/common/LoadMore.tsx` and `CursorPagination.tsx`; native equivalents in `apps/mobile/src/ui/`. `LoadMore` requires `label: string`, `hasMore: boolean`, `onLoad: () => void`; optional `busy: boolean = false`. It is for bounded read pagination, never mutations. It observes visibility/scroll, admits one pending request, and keeps a labeled keyboard/touch fallback. Owners disable it after failure until their explicit retry completes. It renders nothing when exhausted. Examples use local batches in both showcases.

`CursorPagination` requires `label`, `hasMore`, `onNext`; optional `previous = false`, `busy = false`, `onReset?: () => void`. It preserves cursor navigation in page mode and uses the same automatic sentinel in scroll mode. It must not invent a numbered last page for a cursor-only API. Already-cumulative audit/security models should keep their existing accumulation.

```tsx
<Pagination label="products" offset={offset} pageSize={25} total={total}
  hasMore={offset + 25 < total} busy={busy || Boolean(error)} onChange={setOffset} />
<CursorPagination label="audit events" hasMore={Boolean(nextCursor)}
  busy={busy} onNext={() => void model.audit(true)} />
```

`usePageCollection<T>(state: ResourceState<T>, scope: unknown[], page: unknown, paths: string[], onReset: () => void)` is exported from the matching common/ui folder. It is a presentation hook, not a transport or financial projection. Supply every tenant/warehouse/filter context in `scope`, the current offset/cursor (or tuple) as `page`, explicit collection paths such as `['page.items']`, and a callback resetting only those query positions. It retains visited pages in memory in scroll mode, deduplicates by identity, preserves latest response metadata and resets on scope/mode changes. Raw errors remain errors and pause automatic advancement. Both platforms delegate merging to the portable `mergePageCollections` function. No permissions, persistence or totals are derived from the cache.

### Native SidePanel

Named export from `apps/mobile/src/ui/SidePanel.tsx`. Required `title: string`, `open: boolean`, `onClose: () => void`, `children: ReactNode`; optional `menu = false`. Uses native Modal, safe areas, a scroll owner, a labeled close action and Android back dismissal. `menu` selects the profile-menu width token; otherwise the drawer-width token applies. Both are constrained to the viewport. It follows theme tokens without decorative motion. Keep consequential confirmation rules in the owning feature; do not use this panel to silently submit a command.

```tsx
<SidePanel title="Product details" open={selected !== null} onClose={() => setSelected(null)}>
  <Text>{selected?.sku}</Text>
</SidePanel>
```

Web inventory details compose the existing Radix Dialog primitive with a right-edge class, retaining focus trapping, Escape dismissal and focus restoration. `InventoryProducts` is feature-local on each platform, not a second common library.

### Interaction refinement: shared Select and RowActions

`Select` is exported from `apps/web/src/components/ui/FormControls.tsx` and implemented in
`components/ui/Select.tsx`. It retains `ComponentProps<'select'>` at existing call sites, including
`value`/`defaultValue`, `name`, `required`, `disabled`, `<option>` children and the original change
handler. A Radix Select trigger/listbox provides consistent sizing, portal positioning, type-ahead,
arrow navigation, disabled-option skipping and Escape/focus restoration. The hidden native adapter
retains form values and required validation; validation focuses the visible trigger. Use it for
single-choice fields. Use `Menu` for commands and `SearchControl` for suggestions. Multi-selects
are not supported by this adapter; existing permission checkboxes remain checkboxes.

```tsx
<label htmlFor="warehouse">Warehouse</label>
<Select id="warehouse" name="warehouseId" value={warehouseId}
  onChange={(event) => setWarehouseId(event.target.value)} required>
  <option value="">Choose a warehouse</option>
  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
</Select>
```

`RowActions` (`apps/web/src/components/common/RowActions.tsx`) is a presentation-only vertical-dots
menu. Required props: `label: string` and `actions: readonly { label: string;
onSelect: () => void; icon?: ReactNode; disabled?: boolean }[]`. Empty actions render nothing.
It has no business-permission inference: callers supply authorized actions, and backend checks
remain authoritative. Use for row commands; avoid adding meaningless menus to read-only summaries.
Native inventory uses its native product side panel with a permission-gated adjustment entry.

```tsx
<RowActions
  label={item.sku}
  actions={[
    { label: 'View details', onSelect: () => setSelected(item) },
    ...(canAdjust ? [{ label: 'Adjust stock', onSelect: () => openAdjustment(item.sku) }] : []),
  ]}
/>
```

Both controls inherit current theme, density, text scale and shape tokens. Menus escape table
clipping through portals. See the local **Inventory controls** section of `/#/design-system`
(alias `/#/dev/components`) for real Select/RowActions examples, including a disabled action.
`SearchControl.onSubmit?: () => void` optionally flushes a scanner/keyboard lookup when Enter is
pressed without a selected suggestion; selecting a suggestion preserves the existing `onSelect`.
Owners retain cancellation and query debounce. Native `Choice` uses `SelectChoice.tsx` and a
`SidePanel` when `inline` is false; short explicit inline groups retain radio controls.

## Navigation refinement: command controls and sheets

All web exports below are named exports at their stated paths. Tauri reuses them;
React Native equivalents live in `apps/mobile/src/ui` or `components` and do not import DOM code.

- `components/ui/Accordion.tsx`: `AccordionSection({title: ReactNode, children: ReactNode, open?: boolean, onOpenChange?: (open:boolean)=>void, defaultOpen?: boolean=false, className?:string, id?:string})`. Use for expandable sections, not route navigation. Radix handles Enter/Space and chevrons; closed content stays mounted and CSS-hidden to retain local form drafts. Controlled owners must update `open` in their callback.
- `components/ui/Popover.tsx`: Radix `Popover`, `PopoverTrigger`, `PopoverContent` exports forward the upstream component props. Content is portaled, collision-aware and viewport-constrained. Use for filters and compact choices; use a dialog for long forms. Escape dismisses and restores trigger focus. Native uses `SidePanel` instead.
- `components/ui/CommandSelect.tsx`: internal searchable select adapter. `items: {value:string;label:ReactNode;disabled:boolean}[]`, `selected:string`, `onSelect:(value:string)=>void`, `triggerRef:Ref<HTMLButtonElement>` are required; normal accessible name/description/invalid/required/disabled/id/className/title props are optional. Consumers should use existing `Select` from `FormControls`, which defaults `searchable=true` and preserves names, required validation, disabled fields, change events, defaults and form reset. Set `searchable=false` for a static Radix select. Search filters loaded options only; it never fetches whole datasets. Arrow keys, Enter and Escape use cmdk/Radix behavior. Native `SelectChoice` searches the same supplied options in a panel.
- `components/ui/Progress.tsx`: `Progress({value?:number|null,label:string,className?:string})`; omitted/null values are indeterminate with no `aria-valuenow`. Measured values clamp to 0–100. The static indicator supports reduced motion and never invents completion. Native `LoadingState` uses an equivalent unmeasured status bar.
- `components/common/FormSheet.tsx`: `FormSheet({title:string,open:boolean,onOpenChange:(open:boolean)=>void,children:ReactNode,description?:string})`. Description defaults to “Review the details before saving.” Use for add/edit forms; retain drafts and mutation/error ownership in the caller. Right-aligned fixed token width, constrained on narrow screens, internal overflow, accessible dialog title, focus trapping, Escape/close focus return. Depends on existing Radix Dialog and Button; no business behavior. Native equivalent: `SidePanel`.
- `components/common/CommandForm.tsx` adds optional `inline:boolean=false`. Default presentation is a trigger plus FormSheet; existing definitions, coercion and `run` ownership are unchanged. Use `inline` when the caller already owns the checkout confirmation surface. Resource models may unmount the command while submitting and then expose their existing busy/error state in the underlying page.
- `components/common/RecordCollection.tsx`: required `items:CollectionRecord[]`, `label:string`, `onOpen:(id:string)=>void`. Record fields: `id,title,subtitle,detail,status:string`, `tone:'success'|'warning'|'neutral'`. List is default; grid is local state. Selection controls are omitted because this navigation component has no bulk command. Features must not expose selection without an authorized action consuming the selected IDs. Named buttons open records; statuses remain textual. Uses Button/Table/TableScroll/StatusBadge and semantic tokens. Wide tables retain horizontal scrolling. Native equivalent: `ui/RecordCollection` with native cards.

```tsx
<AccordionSection title="Stock operations" defaultOpen>
  <CommandForm definition={receiveForm} run={work => void model.run(work)} />
</AccordionSection>
<FormSheet title="Add customer" open={open} onOpenChange={setOpen}>
  <CustomerForm />
</FormSheet>
<Progress label="Loading inventory" />
<RecordCollection label="customers" items={records} onOpen={setCustomerId} />
```

`SearchControl` also accepts optional `action:{label:string,onSelect:()=>void}`. The action is
keyboard selectable below suggestions, including an empty result. Permission checks belong to
the caller; it does not grant permission or create a record itself. POS uses it for Add customer.
The `/dev/components` showcase contains actual local-state accordion, popover, sheet, selection
and measured/unmeasured progress examples. Existing light/dark previews and native showcase
remain the platform references. Dynamic API suggestion cancellation remains owned by existing
resource models.

### Selection refinements

`Checkbox` is exported by `components/ui/Checkbox.tsx` and the existing `FormControls` barrel. It wraps Radix Checkbox with semantic tokens and `checked: boolean | 'indeterminate'`, `defaultChecked`, `onCheckedChange`, `disabled`, `required`, `name`, `value`, and standard accessible naming props. No props are required, but a label is mandatory at usage sites. Uncontrolled defaults are unchecked/enabled. Space toggles; disabled controls cannot toggle. Native form participation is provided by Radix. Use for record/permission selection; use Switch for immediate boolean preferences. Native equivalent: `apps/mobile/src/ui/Checkbox.tsx` (`label`, `value`, `onChange`, optional `disabled=false`), with a 44px minimum touch area.

```tsx
<Checkbox id="record-selected" checked={selected} onCheckedChange={(value) => setSelected(value === true)} />
<label htmlFor="record-selected">Select record</label>
```

`ViewTabs` (`components/common/ViewTabs.tsx`) switches local list/grid presentation. Required props: `value: 'list' | 'grid'`, `onChange: (value: 'list' | 'grid') => void`, and `panelId: string` identifying the rendered content region. Optional `label: string` defaults to `View`. It uses Radix tabs for arrow-key navigation, focus, and selection, with icon tooltips. Both tabs control the same changing presentation region. It fetches no data and must not be used to bypass route authorization. Native equivalent: `ui/ViewTabs.tsx`, props `grid: boolean`, `onChange: (grid: boolean) => void`, `label?: string`.

```tsx
<ViewTabs label="Products" value={view} onChange={setView} panelId={panelId} />
<div id={panelId} role="tabpanel" aria-label={`Products ${view} view`} tabIndex={0}>{content}</div>
```

Both components inherit themes/accent, support text scaling, and are demonstrated in `NavigationControlsDemo` through the actual `RecordCollection`. Selection belongs only to features with authorized bulk actions. Radix behavior references: [checkbox](https://www.radix-ui.com/primitives/docs/components/checkbox), [tabs](https://www.radix-ui.com/primitives/docs/components/tabs).

### Navigation audit follow-up

The application shell groups all authorized links into accordion sections, including Settings. Expanded content uses token spacing; collapsed content remains hidden and unfocusable through the existing accordion contract. Collapse/expand is above the workspace selector; connectivity is in the header. Native More follows the same section hierarchy with native disclosure controls. See [feature/role audit evidence](../qa/feature-audit/report.md) for workflow fixes and platform verification.

### Selection eligibility

Catalog, inventory and generic record collections omit decorative multi-selection: their current actions operate on one record. Do not show a count or checkbox unless an authorized bulk command consumes it. Permission-assignment checkboxes and stock-count scope selection remain functional and unchanged.

### Contextual empty-state actions

`EmptyState` accepts optional `action: {label:string,onClick:()=>void}` on web, or `{label:string,onPress:()=>void}` on native. The existing `states` preference controls presentation: `enhanced` shows the optional action; `simple` retains explanatory text without the extra shortcut. Essential create/search controls remain outside this presentation setting. The caller checks permissions and owns the action; never pass an unauthorized mutation. Default action is absent. The button inherits keyboard/touch, responsive, theme and disabled-motion behavior from existing primitives. No new dependency or persistence key is added.

```tsx
<EmptyState
  message="No matching products"
  action={
    canCreate
      ? {
          label: 'Add product',
          onClick: () => setCreating(true),
        }
      : undefined
  }
/>
```

The feedback showcase demonstrates a safe local-state action. Catalog uses the existing add-product drawer; POS clears local search/filter state. No new server mutation is introduced.

### Tooltips, overflowing tabs and drawers (shell follow-up)

- `Hint` (`components/ui/Tooltip.tsx`) requires `label: string` and one ref-capable `children: ReactElement`. It composes the [shadcn/Radix Tooltip](https://ui.shadcn.com/docs/components/radix/tooltip), portals above overlays, supports hover/focus and Escape, and uses semantic theme tokens. Keep the trigger's accessible name. `Button` automatically uses it for explicit `title` and icon-button `aria-label`; these no longer produce browser-native title bubbles. Do not put essential instructions only in a tooltip. Touch users retain the accessible label; disabled controls cannot receive focus.
- `OverflowTabs` (`components/common/OverflowTabs.tsx`) requires `children: ReactNode` containing one actual Radix tablist. It measures overflow, provides labelled end chevrons, hides scrollbars and fades overflowing edges. It does not own selection, routes or fetching. Keyboard arrows remain Radix's responsibility; resize and content changes recalculate controls. Use for long horizontal tab groups, not ordinary page scrolling. Example: `<Tabs.Root defaultValue="profile"><OverflowTabs><Tabs.List className="settings-tabs"><Tabs.Trigger value="profile">Profile</Tabs.Trigger></Tabs.List></OverflowTabs><Tabs.Content value="profile">…</Tabs.Content></Tabs.Root>`.
- `Drawer`, `DrawerContent`, `DrawerTitle`, `DrawerDescription`, `DrawerTrigger` and `DrawerClose` (`components/ui/Drawer.tsx`) compose the [shadcn/Vaul Drawer](https://ui.shadcn.com/docs/components/radix/drawer). Props use the corresponding Vaul `ComponentProps`; direction defaults to `right`, background scaling is disabled. Content is portalled, viewport bounded and scrollable. Modal focus starts at the first eligible field or labelled content container, avoiding an automatically opened close-button tooltip intercepting Escape. Existing controlled `open/onOpenChange` guards retain mutation/draft ownership. Reduced-motion and disabled-animation rules apply to Vaul transitions too.
- `FormSheet` keeps its existing export/props for compatibility but now renders this drawer, including labelled close control and focus restoration. Required props: `title: string`, `open: boolean`, `onOpenChange: (open: boolean) => void`, `children: ReactNode`; optional `description` defaults to “Review the details before saving.” Example: `<FormSheet title="Add business" open={open} onOpenChange={setOpen}><BusinessForm /></FormSheet>`. Use for operational forms/details; compact confirmations and preferences remain dialogs. Drag/Escape/overlay dismissal go through the same controlled callback; callers can refuse while saving.

Live local-only examples are in **Navigation, drawers and record selection** at `/#/design-system` (including tooltip and overflowing tabs). Desktop shares these web components. Native `ui/ScrollableTabs` takes `children: ReactNode`, uses horizontal scrolling and accessible end chevrons; native does not use DOM portals or CSS masks. Native `SidePanel` preserves safe areas and keyboard scrolling: `wide?: boolean` selects the 800px preferences maximum, `footer?: ReactNode` stays outside its scroll region, and `revealEndKey?: string` reveals a newly rendered checkout review after its native layout completes. Existing required `title/open/onClose/children` and optional `menu` are unchanged. Native transitions use the resolved motion preference. Native workspace/profile identities share `ProfileIdentity` sizing, with optional `displayName` and `logo` for a workspace.

The sidebar collapse control now straddles the desktop sidebar boundary; narrow screens use the navigation drawer. Header icons share `--shell-icon-size`, separated by semantic border rules. Workspace/profile triggers share avatar dimensions, typography, spacing and the selected shape preference. Settings tabs use the existing secondary surface. Preferences are bounded by `--preferences-width` and viewport padding.

### Icon size variants and page titles

Lucide icons use the three canonical `--icon-small`, `--icon-medium`, and `--icon-large` tokens (16/20/24px). The existing `iconSize` account preference selects the default; use `data-icon-size="small"` or `"large"` only for a deliberate variant. Do not resize chart SVGs through icon rules. `ShowcaseIndex` demonstrates all three with accessible names and tooltips. Native `NativeIcon` reads the same preference and token sizes; geometry and touch targets remain independent.

`ScreenHeader` consumes `PageTitleContext` from the shell. An exact match to the current header title omits the duplicate heading while retaining descriptions and actions. Standalone panels and subsection titles retain their headings. This is presentation-only and has no effect on navigation or permissions.

The native `ui/ScreenHeader.tsx` has an equivalent `PageTitleContext` for shell-owned headings. `ui/Action.tsx` accepts an optional `icon?: string` rendered by `NativeIcon`; POS uses `icon="cart"`. Icons inherit action foreground and the account icon-size preference. Touch targets remain independent of glyph size. `useHeaderHeight` measures wrapped web headers for sticky tabs; `useCartHeight` fits initial and sticky POS cart positions without changing checkout state.

### Compact preference controls

Settings and the navigation showcase reuse `OverflowTabs` with
`settings-navigation settings-tabs view-tabs` on the Radix tablist. Its wrapper
sizes to content up to the available width; compact labels, spacing and chevrons
retain keyboard navigation and overflow fades. `Segmented` preference controls
use content-sized options and the existing `--control-radius`, so rounded/circle
applies to both the wrapper and selected option. Neither component changes
preference persistence, selection or route behavior. Coarse-pointer targets remain
at least the design-system touch target. Native `ScrollableTabs` uses smaller gaps
and label typography while preserving native touch targets and control radius.

### Grouped management forms

- Native `FormSection` (`apps/mobile/src/ui/FormSection.tsx`, named export) groups related form fields. Props: required `title: string` and `children: ReactNode`; optional `defaultOpen?: boolean` (default `false`). Use for long metadata/permission forms, not navigation or unrelated business workflows. Example: `<FormSection title="Product basics" defaultOpen><Field label="Name" value={name} onChange={setName} /></FormSection>`.
- Its existing `DisclosureTrigger` announces expanded state and supports keyboard/touch activation. Collapsed children stay mounted to preserve drafts, but are hidden from layout and accessibility. It follows native theme spacing and scales with text; it owns no validation, persistence or animation. The native showcase includes a live example. Web equivalent: existing `AccordionSection`, whose force-mounted content retains form values.
- Web `RecordCollection` additionally accepts optional `columns?: readonly [string, string, string]`, defaulting to `['Name', 'Reference', 'Contact / currency']`. Example: `<RecordCollection label="receipts" columns={['Sale date', 'Receipt ID', 'Total']} items={items} onOpen={openReceipt} />`. This changes column headings only; pagination, server data, selection and opening behavior remain caller-owned. Native uses its stacked row presentation with the same record fields.

### Native RecordTable

`RecordTable` (`apps/mobile/src/ui/RecordTable.tsx`) is the native equivalent of the web `Table`/`TableScroll` primitives. Use for audit/notification records requiring comparable columns; use `DataRow` for a short label/value summary. Required props are `label: string`, `columns: string[]`, and `rows: { id: string; cells: ReactNode[] }[]`. Supply the same number of cells as columns and stable IDs. Strings render as themed text; React elements retain their own accessible names. There are no sorting, selection, pagination or data-fetching defaults. Owners retain those behaviors. Horizontal touch scrolling preserves complete values at narrow widths; headers are announced as headings. Theme and typography follow `useTheme`. The native showcase renders a safe local example.

```tsx
<RecordTable
  label="Notifications"
  columns={['Event', 'Status']}
  rows={[{ id: 'preview', cells: ['Stock alert', 'Unread'] }]}
/>
```

Web `RecordCollection` now puts select-all in the table header in list mode. In grid mode it remains in the selection toolbar. Selection continues to apply only to loaded records, without any implied bulk mutation.

`RecordCollection` (web and native) accepts optional `toolbar?: ReactNode` for existing controlled search, filter and refresh controls. The toolbar sits beside the list/grid tabs and wraps on narrow screens; it does not own fetching/filtering or change handlers. Put a web search inside `.collection-search` (native: a flexible `View`). Selection remains below the tools, and select-all is inside the web table header. Omit the prop for a simple list without search. The navigation-controls showcase demonstrates local search and the native showcase demonstrates a local refresh action. Changing list/grid does not remount the toolbar or clear its input.

```tsx
<RecordCollection
  label="customers"
  items={records}
  onOpen={openCustomer}
  toolbar={
    <div className="collection-search">
      <SearchControl label="Search customers" value={query} onChange={setQuery} />
    </div>
  }
/>
```

### Small choices and live records

`Select` (`apps/web/src/components/ui/Select.tsx`) and native `SelectChoice` (`apps/mobile/src/ui/SelectChoice.tsx`) now omit search for up to seven options by default. `searchable={false}` explicitly keeps static sets direct; `searchable` enables a command search for a genuinely larger/dynamic set. Values, disabled options, native form serialization and keyboard selection remain unchanged. `/dev/components` → Control interaction states demonstrates both yes/no and an eight-location list using local state.

`ResourceModel.refresh()` retains loaded presentation data while refreshing, and coalesces live hints behind an in-flight command. Use it for authorized background invalidations so open editor fields do not disappear; keep `run(command)` for explicit actions. It does not mutate or retry business commands. `useCatalogLive` owns app subscriptions; see [live pricing](live-ui-refinement.md).

Table selection columns share fixed checkbox padding. Row-title buttons use `product-card-title` to avoid a second horizontal inset beyond the table cell. Notification and audit details use existing `FormSheet` / native `SidePanel` drawers, preserving focus and platform navigation behavior.

### Compact cart icons

Native `IconAction` accepts optional `smallIcon?: boolean` (default false), which selects smaller visual geometry while retaining its existing touch target and accessibility label. `NativeIcon.small?: boolean` defaults false. Compact `QuantityControl` uses this geometry, demonstrated in NativeShowcase. Account icon-size preference still scales the icons. Web cart styling applies the same smaller geometry locally; discount retains its labelled popover and tooltip, with an icon-only trigger before inline price/unit.

### Enhanced feedback and applied filters

`EmptyState` (`apps/web/src/components/common/AsyncState.tsx`, native `apps/mobile/src/ui/AsyncState.tsx`) now uses the existing `states` preference: enhanced shows an icon, title (`message`), description and an optional authorized action; simple keeps the original message. `description?: string` defaults to “There are no records to display here yet.” `announce?: boolean` defaults false. `action?: {label: string; onClick: () => void}` (native `onPress`) is optional. Parents must omit creation for read-only users and filtered empty results; no permission checks are inferred by the primitive. API failures use `ErrorState({message,onRetry})`, whose retry remains available in both modes. Use these for collection feedback, not transaction success or uncertain payment outcomes. Theme tokens and normal document flow support narrow layouts and text scaling; no artificial auto-dismissal.

```tsx
<EmptyState message="No matching products"
  description="Try another search or clear your filters." />
<ErrorState message={state.error} onRetry={() => void model.run()} />
```

`FilterButton` is exported from `apps/web/src/components/common/FilterButton.tsx` (native equivalent `apps/mobile/src/ui/FilterButton.tsx`). It accepts required `active: string[]` containing **applied**, human-readable filters, plus web `Button` props or native required `onPress: () => void`. Its default is an outline button; a nonzero count is a badge. Web hover/focus uses the existing Radix tooltip; native exposes the summary as accessible text. It owns no filtering, requests or popover state. Use as a `PopoverTrigger asChild` or to open a native `SidePanel`. Keep the existing search and refresh in the collection toolbar. Avoid passing pending form edits or secret values.

```tsx
<PopoverTrigger asChild>
  <FilterButton active={status ? [`Status: ${status}`] : []} />
</PopoverTrigger>
```

Live local sync activity is ephemeral and cleared when its register locks/unmounts; it is distinct from the durable business notification inbox. `SyncStatus` in each platform's offline feature owns real confirmation progress, completion/attention feedback and a result drawer. The header notification menu mirrors the active task and opens that same drawer. Native feedback uses an accessible in-flow notification instead of an overlay obscuring checkout. The web completion toast is dismissible and has View result. No percentage is invented while a batch request is in flight. StateDemo and NativeShowcase include real applied-filter examples; the catalog/feedback tests cover empty permissions and retry behavior.

### Table title affordance

Clickable record titles in table row headers and `product-card-title` controls underline on hover; row-header buttons also underline on keyboard focus. Static titles and action-menu icons retain their existing presentation. `NavigationControlsDemo` renders the actual RecordCollection example. SearchControl only renders its clear X when its input has a value; empty searches do not offer a meaningless clear action. Native controls retain their accessible button semantics without requiring hover.

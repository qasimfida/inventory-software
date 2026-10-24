# Native common component API catalog

Native shared presentation belongs to `apps/mobile/src/ui/`, not the DOM `components/common` folder. Named imports below are relative to that UI directory; feature files use `../ui/...`. Web and Tauri share the DOM catalog; React Native never imports DOM/shadcn components. Canonical tokens come from `@inventory/design-tokens`, with native preferences resolved by `ThemeProvider` in `src/theme.tsx`.

All components use current light/dark/system tokens and respect OS text scaling; wrapping content can grow beyond minimum targets. No component performs business authorization, fetching or financial calculations. Touch targets are at least48 units. Native focus, announcement and hardware-keyboard behavior require actual platform/assistive-technology qualification; browser-native rendering alone is insufficient. Props below are required unless `?` or a default is stated. `React.ComponentProps<typeof Component>` exposes the exact inferred TypeScript contract.

## Themed.tsx — Text and TextInput

`Text`: all React Native `TextProps`, plus `tone?:'default'|'error'|'muted'|'success'|'warning'|'info'`. Default tone is error when accessibilityRole=alert, otherwise default. Style overrides are accepted, then account text scaling applies; line height derives from font size unless specified. Use for all app text, not decorative interaction. `TextInput`: native `TextInputProps` plus `invalid?:boolean=false`; sets themed placeholder, border, target, focus/invalid/read-only/disabled styles. Use as primitive; prefer Field for label/hint/error. Caller owns value and selection/keyboard configuration. Both depend on native primitives, metrics and useTheme; no storage.

```tsx
import { Text, TextInput } from './Themed';
<Text accessibilityRole="header">Preview</Text>
<Text tone="warning">Saved locally; waiting to sync.</Text>
<TextInput accessibilityLabel="Local note" value={note} onChangeText={setNote} />
```

## Action.tsx — Action (also exported by Controls.tsx)

Required `label:string`, `onPress:()=>void`; optional `accessibilityLabel:string=label`, `disabled=false`, `loading=false`, `variant:'default'|'contrast'|'secondary'|'outline'|'ghost'|'link'|'destructive'='default'`. Use for actions; not static badges or navigation links needing external URL semantics. Label footprint stays stable when loading. Native Pressable exposes role=button and disabled/busy states, focus outline and pressed color; disabled/loading suppress activation. Contrast uses foreground/background tokens for sign-in. Depends on ActivityIndicator, Text, theme/metrics. No async lifetime/retry ownership.

```tsx
import { Action } from './Controls';
<Action label="Add to cart" accessibilityLabel="Add example item to cart"
  onPress={() => setCount(count + 1)} />
<Action label="Saving preview" loading onPress={() => {}} />
```

## Controls.tsx — Field and Choice

`Field`: required `label:string`, `value:string`, `onChange:(value:string)=>void`; optional `disabled=false`, `maxLength=254`, `multiline=false`, `readOnly=false`, `description?:string`, `error?:string`. Controlled native text with visible label, accessibilityLabel/hint, error alert and web ARIA associations. No custom validation. Use for ordinary text entry; specialized password/scanner controls remain feature-owned. Read-only retains visible/selectable value; disabled prevents editing. Depends on Themed.TextInput/Text and theme. Long labels/errors wrap; multiline grows.

`Choice`: required `label:string`, `value:string`, `options:{value:string;label:string;disabled?:boolean}[]`, `onChange:(value:string)=>void`; optional `disabled=false`, `inline=false`. Use for small explicit option sets, not huge/searchable datasets. Pressable options announce radio checked/disabled state; keyboard focus styles are native, not a DOM roving-tabindex implementation. Inline options wrap; vertical is default. No auto-selection or changes to unavailable options. Depends on theme, native Pressable and Text. `choices(values:string[])` is the existing label/value mapping helper, not a UI component.

```tsx
import { Field, Choice } from './Controls';
<Field label="Reference" value={reference} onChange={setReference}
  description="Local example only" />
<Choice label="Density example" value={density} onChange={setDensity} inline
  options={[{ value: 'comfortable', label: 'Comfortable' },
    { value: 'compact', label: 'Compact', disabled: true }]} />
```

## ConfirmAction.tsx — ConfirmAction

Required `label:string`, `description:string`, `confirmLabel:string`, `onConfirm:()=>void`; optional `disabled=false`. Use for explicit confirmation; not a progress modal or arbitrary drawer. Trigger opens Modal, Cancel/back dismiss without callback, confirm closes then calls owner. No Promise waiting, business error UI or timed disappearance. Bounded ScrollView, themed overlay and compact-width surface work on narrow/large screens. accessibilityViewIsModal signals modal context; full VoiceOver/TalkBack focus restoration is not claimed. Dependencies: native Modal/View/ScrollView, Action, Text, theme.

```tsx
import { ConfirmAction } from './ConfirmAction';
<ConfirmAction
  label="Reset preview"
  description="Only this example changes."
  confirmLabel="Reset"
  onConfirm={() => setReference('')}
/>;
```

## Surface.tsx — Surface

Required `children:ReactNode`; optional `muted=false`. Passive themed padded View with token border/radius/gap. Use for grouped information, not clickable cards or every nested field. No custom style/press/heading prop; supply meaningful Text. Children wrap within parent; scroll ownership stays outside. Depends on native View/theme.

```tsx
import { Surface } from './Surface';
<Surface muted>
  <Text>Local component preview</Text>
</Surface>;
```

## MetricCard.tsx — MetricCard

Required `label:string`, `value:string`, `unit:string`; optional `primary=false`. Equivalent to web MetricCard but accepts exact strings, not ReactNode. Use for known measures, not derived partial-page totals. Passive wrapping card, tabular figures and primary semantic colors; flex-basis220 with growth, enclosing layout decides columns. No press/loading/formatting state. Dependencies: View, Text, theme.

```tsx
import { MetricCard } from './MetricCard';
<MetricCard label="Quantity example" value="12.500000" unit="each" primary />;
```

## DataRow.tsx — DataRow

Required `label:string`, `value:string`, `unit:string`; no optional props/defaults. Use exact report strings with units instead of shrinking a DOM table onto native. No numeric conversion/truncation; values wrap with tabular figures. Not a selectable row, sorting layer or grid. Passive accessibility text, themed divider/muted metadata; depends on View, Text/theme.

```tsx
import { DataRow } from './DataRow';
<DataRow label="Exact amount" value="9007199254740993" unit="USD minor units" />;
```

## DisclosureTrigger.tsx — DisclosureTrigger

Required `label:string`, `expanded:boolean`, `onPress:()=>void`; optional `disabled=false`. Controlled expansion trigger with plus/minus indicator and expanded/disabled accessibility state. Does not mount/unmount children or fetch; owner chooses preservation behavior. Use for sections, not ambiguous destructive actions.48-unit minimum, wraps title, token focus/pressed styling. Depends on Pressable, Text, metrics/theme.

```tsx
import { DisclosureTrigger } from './DisclosureTrigger';
<DisclosureTrigger label="Preview details" expanded={open} onPress={() => setOpen(!open)} />;
{
  open && <Text>Local content</Text>;
}
```

## AppearanceControl.tsx and preview infrastructure

`AppearanceControl()` has no props; renders Choice for system/light/dark from useTheme and obeys locked/busy policy. Use only Settings or the isolated showcase. Normal provider behavior persists authenticated preferences; do not use it as a casual display toggle in feature pages.

`ThemeProvider({children:ReactNode,preview?:boolean=false})` in `src/theme.tsx`: normal behavior is unchanged. `preview=true` uses local guest preference state, ignores account appearance policy only within the demonstration subtree and never saves settings. It is for developer examples only, never production workflow authorization/policy overrides. OS reduced motion remains enforced. It does not mutate the outer native theme or status bar.

`NativeShowcase()` is a feature-like development example in the existing UI folder; no props. It owns disclosure, example values, appearance preview and local confirmations. Access through Settings → Components / Design system in development. Not a business form or a public navigation destination. It includes actual Action/Field/Choice/Surface/MetricCard/DataRow/DisclosureTrigger/ConfirmAction/Text components. The surrounding Settings connectivity diagnostic remains an independent real read-only health check; showcase interactions issue no requests.

```tsx
import { ThemeProvider } from '../theme';
import { AppearanceControl } from './AppearanceControl';
<ThemeProvider preview>
  <AppearanceControl />
  <Surface>
    <Text>Local theme</Text>
  </Surface>
</ThemeProvider>;
```

No native drawer, chart engine, toast queue or DOM data grid has been introduced. Field equivalents and native action/confirmation semantics are deliberately preserved. The existing native command adapter remains in `components/CommandForm.tsx`; its API is documented below.

## components/CommandForm.tsx — native CommandForm

Path: `apps/mobile/src/components/CommandForm.tsx`. Required `definition:CommandForm` and `run:(work:()=>Promise<unknown>)=>void`, using the same API-client types documented in the web catalog. Definition requires title, fields and submit; field kind defaults to text, explicit value wins, otherwise select initializes to its first option, boolean to false and text to empty. Fields use controlled local state initialized once; new definition props do not reset existing values. Number kind coerces on submit; exact decimal quantities must stay text. Text limits are500, multiline2500. Native does not apply HTML required validation; backend validation remains authoritative. Use for existing simple commands, not complex forms or validation frameworks. Caller owns errors, pending and permissions.

Dependencies are native View, Themed.Text and the existing organization/Controls compatibility export of Action/Choice/Field; API-client is a type-only import. Field/Choice provide labels, keyboard/touch behavior and theme/scaling; parent owns scrolling. It performs no transport call by itself. NativeShowcase includes a local example:

```tsx
import { CommandForm } from '../components/CommandForm';
<CommandForm
  definition={{
    title: 'Preview native command',
    fields: [{ name: 'quantity', label: 'Native exact quantity', value: '1.250000' }],
    submit: (values) => {
      setMessage(String(values.quantity));
      return Promise.resolve();
    },
  }}
  run={(work) => {
    void work();
  }}
/>;
```

## AsyncState.tsx — LoadingState and EmptyState

`LoadingState({message?:string='Loading…'})` renders a polite, muted loading message. Enhanced states add two static decorative bars hidden from assistive technology. `EmptyState({message:string,announce?:boolean=false})` renders passive muted text by default; use announce only when the existing result transition requires a polite announcement. Enhanced states add token-based border, padding and surface. Use after a successful empty result, never to hide a request error. These components do not fetch, retry, dismiss or change data; the caller retains visibility and messages.

Both wrap, follow light/dark/system, text scaling, accent and density through ThemeProvider, and depend only on native View, Themed.Text and useTheme. No keyboard interaction or animation; motion-disabled users retain status feedback. NativeShowcase renders both using safe local messages. OS announcement behavior still needs device/assistive-technology qualification.

```tsx
import { LoadingState, EmptyState } from '../ui/AsyncState';
<LoadingState message="Loading records…" />
<EmptyState message="No records." />
<EmptyState message="No security events." announce />
```

## Responsive viewport and focus (Prompt 7)

Native `apps/mobile/src/ui/AppViewport.tsx` exports `AppViewport({children:ReactNode})`: children is required; no variants, persistence or business state. Use once inside the root SafeAreaProvider and ThemeProvider, not inside another ScrollView. It owns the native safe-area view, status-bar contrast and one scrolling surface with handled keyboard taps, drag dismissal and iOS automatic keyboard insets. The entire NativeShowcase runs inside this same application viewport. Android relies on the existing window resize policy. OS insets protect every edge in portrait/landscape; browser-native inset bridges and iOS behavior still need target-device qualification.

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

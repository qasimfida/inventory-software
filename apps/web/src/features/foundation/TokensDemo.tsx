import { palettes } from '@inventory/design-tokens';
import type { Token } from '@inventory/design-tokens';
import { Panel } from '@/components/common/Layout';
const samples: Token[] = [
  'background',
  'card',
  'elevated',
  'primary',
  'secondary',
  'muted',
  'destructive',
  'success',
  'warning',
  'info',
  'sidebar',
  'selected',
  'table-header',
  'table-hover',
  'table-selected',
  'navigation-selected',
];
export function TokensDemo() {
  return (
    <Panel id="showcase-tokens" tabIndex={-1} aria-label="Design tokens" className="space-y-4">
      <h2>Tokens and appearance</h2>
      <p className="text-sm text-muted-foreground">
        Semantic CSS variables drive both previews and the generated native palette. Change
        Appearance to inspect the whole page.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {(['light', 'dark'] as const).map((mode) => (
          <section
            key={mode}
            data-theme={mode}
            className="min-w-0 rounded-md border bg-background p-4 text-foreground"
            aria-label={`${mode} token preview`}
          >
            <h3>{mode === 'light' ? 'Light' : 'Dark'}</h3>
            <ul className="mt-3 grid gap-2">
              {samples.map((name) => (
                <li key={name} className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
                  <span
                    aria-hidden="true"
                    className="size-6 shrink-0 rounded border"
                    style={{ backgroundColor: `var(--${name})` }}
                  />
                  <code className="min-w-0 [overflow-wrap:anywhere]">{name}</code>
                  <span className="ml-auto font-mono text-xs">{palettes[mode][name]}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <h3>Typography and spacing</h3>
      <p className="text-sm text-muted-foreground">
        System fonts · 12 / 13 / 14 / 16 / 20 / 28px · 4px spacing unit · 40px desktop, 44px touch
        and 48-unit native targets. Text size scales the hierarchy; compact density preserves
        minimum targets.
      </p>
      <ul className="flex flex-wrap items-end gap-4" aria-label="Spacing scale">
        {[1, 2, 3, 4, 6, 8].map((step) => (
          <li key={step} className="space-y-2 text-xs">
            <div
              aria-hidden="true"
              className="rounded bg-primary"
              style={{
                width: `calc(var(--spacing) * ${step})`,
                height: `calc(var(--spacing) * ${step})`,
              }}
            />
            {step} × spacing unit
          </li>
        ))}
      </ul>
      <h3>Card heading</h3>
      <p className="text-sm">Label and table text</p>
      <p className="text-xs text-muted-foreground">Supporting text</p>
      <p>
        Readable body copy and <span className="font-mono tabular-nums">1,250.00</span> numeric
        values.
      </p>
    </Panel>
  );
}

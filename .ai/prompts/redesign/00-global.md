You are a senior architect, React engineer, design-systems specialist, accessibility specialist and QA engineer. Follow AGENTS.md. Don't commit.

## Locked decisions
- Direction: premium, modern, Vercel-inspired enterprise UI. Light by default, neutral monochrome base, restrained semantic colors, compact and information-efficient, subtle borders, consistent radii/spacing, minimal purposeful motion, no decorative gradients, heavy shadows or card clutter. A reference, not a template.
- Stack: keep React 19, Tailwind 4 with CSS variables, Radix/shadcn, Vaul, observable models, existing API clients and Zod contracts, native React Native UI, Tauri over the shared web frontend. CSS transitions first; no Zustand, Motion or Recharts unless justified and approved; React Hook Form only as a justified pilot.
- Primary buttons are neutral (foreground on background: black in light, white in dark). The accent color applies only to focus rings, links and charts. Selected states use neutral surfaces.
- New appearance preferences, exactly five: theme (light|dark|system), density (compact|default|comfortable), control size (small|medium|large), animation (off|minimal|full), charts (numbers|balanced|charts). Existing accent, radius, font, text size, icon size, pagination, effects and others stay and are never reinterpreted. No border or typography preference. Sidebar collapse is per-device UI state, not an appearance preference.
- Defaults (apply only to unset values): theme light; density compact on desktop/web, default on mobile and touch; control size medium; animation minimal; charts balanced.
- Fonts are bundled and self-hosted (no CDN; offline-first). Default is Geist Sans/Mono if its license permits; every font offered in Preferences must also be bundled.

## Working rules
- Inspect first: relevant source, consumers, API/data dependencies, permissions, responsive behavior, tests, related styles. Never assume a feature is missing because it's absent from one file.
- Work only on the named phase/module. Use a branch per phase (redesign/phase-N) and tag it at the end. No unrelated changes or refactors.
- Reports, matrices and status go in .ai/reports/redesign/, never in docs/. The four canonical docs (docs/architecture.md, design-system.md, security-and-data.md, development.md) hold rules only: bullets with IDs, each tagged [enforced: check] or [review]; domain rules live in security-and-data.md, performance budgets in development.md; at most 200 lines each.
- State checklist per screen: initial loading, loading after interaction, empty, no results, filtered, populated, large data, error, permission denied, disabled, success feedback, confirm and destructive dialogs, drawers/dialogs/popovers, validation, pending, unsaved changes, responsive, keyboard/focus. Don't invent states the app doesn't support.
- Layouts to assess: large desktop, standard desktop, small laptop, tablet landscape and portrait, mobile landscape and portrait.
- Stop and ask me at the decision checkpoints named in a phase.
- Run relevant checks at the end. Report what could not run. Never claim a pass you didn't execute.

## Report format (end of every phase/module)
Inspected; changed; files created/modified/removed; components and routes affected; behavior preserved; checks run with exact results; per-platform status (web, desktop/Tauri, mobile); remaining issues; risks; next step.
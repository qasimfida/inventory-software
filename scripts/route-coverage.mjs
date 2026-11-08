import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { entries, parse, walk } from './parity-source.mjs';
import ts from 'typescript';
import { checkParity, sourcePaths } from './check-parity.mjs';
import { read, closure, imports, cell } from './redesign-source.mjs';
import { routeSources, extraEvidence, risks } from './redesign-routes.mjs';
export const output = '.ai/reports/redesign';
export function collectRoutes(reader = read, sources = routeSources) {
  const registry = entries(
    parse(reader(sourcePaths.registry), sourcePaths.registry),
    'workspaceRoutes',
  );
  const parity = checkParity(reader, JSON.parse(reader('scripts/parity-exceptions.json')));
  if (parity.mismatches.length || parity.errors.length)
    throw new Error([...parity.mismatches, ...parity.errors].join('\n'));
  for (const [path, [file, anchor]] of Object.entries(extraEvidence))
    if (!reader(file).includes(anchor)) throw new Error(`Unverified extra route ${path}: ${file}`);
  const routerPaths = [];
  walk(parse(reader('apps/web/src/app/router.tsx'), 'router.tsx'), (node) => {
    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText() === 'path' &&
      ts.isStringLiteral(node.initializer) &&
      node.initializer.text.startsWith('/')
    )
      routerPaths.push(node.initializer.text);
  });
  const paths = new Set([
    ...routerPaths,
    ...registry.map((r) => r.path),
    ...Object.keys(extraEvidence),
    ...parity.coverage.web.routes,
    ...parity.coverage.mobile.routes,
  ]);
  return [...paths].sort().map((path) => {
    if (!sources[path]?.length)
      throw new Error(`Registered/dispatched route has no reviewed row: ${path}`);
    const registered = registry.find((r) => r.path === path);
    const graph = closure(sources[path]);
    const shared = graph.filter((p) =>
      /components\/(ui|common|layout)\/|mobile\/src\/ui\//.test(p),
    );
    const data = [
      ...new Set(
        graph.flatMap((p) =>
          imports(p)
            .filter(
              (i) =>
                i.from === '@inventory/api-client' ||
                /client|model|platform\/settings/.test(i.from),
            )
            .map((i) => `${i.from}: ${i.names}`),
        ),
      ),
    ].sort();
    const modules = graph.filter((p) => /\.tsx$/.test(p) && !shared.includes(p));
    return {
      path,
      module: registered?.group ?? 'Shell / compatibility',
      title: registered?.title ?? path,
      sources: sources[path],
      registered: !!registered,
      hidden: registered?.hidden ?? false,
      permissions:
        (path === '/inventory'
          ? 'products.read OR stock.read; active business'
          : path === '/categories'
            ? 'products.read AND products.write; business-wide only'
            : path === '/dashboard'
              ? 'Authenticated; reports.read for analytics; cashier redirects POS, platform admin redirects /admin'
              : path === '/logs'
                ? 'audit.read in business OR guarded platform-admin view'
                : registered?.permissions) ??
        (path.startsWith('/admin')
          ? 'canManagePlatform'
          : path === '/catalog/:id'
            ? 'products.read through /catalog'
            : 'Session/link/grant/alias guard; see evidence'),
      evidence: registered ? sourcePaths.registry : extraEvidence[path]?.[0],
      layout: path.startsWith('/auth')
        ? 'Auth / native AppViewport'
        : path === '/offline'
          ? 'Bounded offline recovery'
          : path === '/design-system'
            ? 'Standalone web showcase'
            : 'AppShell / NativeShell (Tauri reuses web)',
      platformNote:
        path === '/more'
          ? 'Native-only navigation; no web route'
          : path === '/design-system'
            ? 'Web route; native NativeShowcase exists without this URL'
            : path === '/auth/link'
              ? 'Web link error/landing; native Linking maps parsed links to invitation/reset, no literal /auth/link screen'
              : 'Web + native source; desktop shares web. Not runtime qualification.',
      responsive:
        'Baseline 390/1440 light/dark; additional 844/1024/1280/1920 in browser report. Native safe-area/keyboard and installed desktop require device evidence.',
      risks: risks(path),
      status: 'Inventoried; not redesigned',
      shared,
      data,
      modules,
    };
  });
}
export function renderRoutes(routes) {
  const lines = [
    '# Phase 1 route coverage',
    '',
    'Generated from the live shared registry, parity dispatch inspection and verified shell/detail exceptions. Run `npm run redesign:inventory`; check with `npm run check:redesign`.',
    '',
    'Source import closure is conservative: conditional imports are possible consumers, not proof every child renders on each route. Full closures/data symbols are in routes.json. Roles/scopes are additionally restricted by routeAllowed, screen guards and backend authorization. No workflow is certified by this inventory.',
    '',
    '| Route | Module / page sources | Layout / platform | Permission evidence | Shared patterns | Data / nested UI | Responsive / risks | Status |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const r of routes) {
    const keyShared = r.shared.filter((p) =>
      /common\/|ui\/(Record|Search|SidePanel|Async|Metric|Controls|ViewTabs)/.test(p),
    );
    const children = r.modules.filter((p) =>
      /Form|Editor|Details|Panel|Tabs|Drawer|Dialog|Cart|Receipt|Count/.test(p),
    );
    lines.push(
      `| \`${r.path}\` | ${cell(r.module)}; ${r.sources.map((p) => `\`${p}\``).join('<br>')} | ${cell(r.layout)}; ${cell(r.platformNote)} | ${cell(r.permissions)}; \`${r.evidence}\` | ${cell(
        keyShared
          .map((p) => p.split('/').at(-1))
          .filter((p, i, a) => a.indexOf(p) === i)
          .slice(0, 12)
          .join(', '),
      )}; ${r.shared.length} source files | ${cell(r.data.slice(0, 3).join('; '))}; nested: ${cell(
        children
          .map((p) => p.split('/').at(-1))
          .filter((p, i, a) => a.indexOf(p) === i)
          .slice(0, 12)
          .join(', '),
      )}; full graph in JSON | ${cell(r.responsive)} ${cell(r.risks)} | ${r.status} |`,
    );
  }
  lines.push(
    '',
    '## Compatibility and nested workflows',
    '',
    '- `/catalog` still renders the combined inventory workspace; `/warehouse-view` resolves to `/storage`; `/settings/staff` and `/settings/users` resolve to `/staff` and `/team`.',
    '- `/staff` currently means Expenses; staff records also appear in Team. Preserve routes rather than silently renaming.',
    '- Product tabs: overview, stock, pricing, history, channels. Inventory: Products & pricing / Stock & movements. Product setup: details, price/units, quantity, listing.',
    '- Storage includes location list/hierarchy, details/edit and balances drawers. Warehouse includes scan/count reconciliation. Purchasing embeds suppliers, orders, partial receipts and returns.',
    '- POS embeds cart, discounts, payment review, held carts and product details; sales embeds receipts, returns, void/exchange. Accounting and payables embed posting/settlement commands.',
    '- Online management embeds listing states, selection, picker, readiness issues, action results and setup sections. Do not infer a public guest checkout UI.',
    '- Settings/profile is inline shell content; device adds ConnectionPanel/ConnectionTools; security adds sessions and policy editor; Team adds OperationsPanel in staff mode.',
    '- Screenshot route coverage and runtime errors are separate evidence in before/browser-results.json. A captured permission/error screen is not a working-feature pass.',
    '',
  );
  return lines.join('\n');
}
export function checkRows(text, routes) {
  const missing = routes.filter((r) => !text.includes(`| \`${r.path}\` |`));
  if (missing.length)
    throw new Error(`Missing route rows: ${missing.map((r) => r.path).join(', ')}`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const routes = collectRoutes(),
      markdown = renderRoutes(routes),
      path = `${output}/routes.md`;
    if (process.argv.includes('--check')) {
      if (!existsSync(path)) throw new Error('Generate routes.md first');
      checkRows(read(path), routes);
      if (read(path) !== markdown)
        throw new Error('Route evidence is stale; run npm run redesign:inventory');
    } else {
      mkdirSync(output, { recursive: true });
      writeFileSync(path, markdown);
      writeFileSync(`${output}/routes.json`, JSON.stringify(routes, null, 2) + '\n');
    }
    console.log(`${routes.length} route rows verified against registry and dispatchers.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

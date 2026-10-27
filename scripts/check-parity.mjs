import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  entries,
  parse,
  renderedRoutes,
  rendersComponent,
  rendersPanels,
} from './parity-source.mjs';

export const sourcePaths = {
  registry: 'packages/api-client/src/workspace-navigation.ts',
  web: {
    dispatcher: 'apps/web/src/shell/WorkspaceScreens.tsx',
    settings: 'apps/web/src/shell/SettingsPage.tsx',
    panels: 'apps/web/src/features/organization/workflow-panels.ts',
    settingsComponent: 'SettingsPage',
  },
  mobile: {
    dispatcher: 'apps/mobile/src/shell/NativeScreens.tsx',
    settings: 'apps/mobile/src/shell/SettingsScreen.tsx',
    panels: 'apps/mobile/src/organization/ManagementWorkflows.tsx',
    settingsComponent: 'SettingsScreen',
  },
};
export function checkParity(read, exceptions = []) {
  const registry = entries(
    parse(read(sourcePaths.registry), sourcePaths.registry),
    'workspaceRoutes',
  );
  const coverage = {};
  for (const platform of ['web', 'mobile']) {
    const config = sourcePaths[platform];
    const dispatcher = parse(read(config.dispatcher), config.dispatcher);
    const settings = parse(read(config.settings), config.settings);
    const panels = entries(parse(read(config.panels), config.panels), 'panels');
    const routes = renderedRoutes(dispatcher);
    const settingsRoutes = renderedRoutes(settings);
    if (rendersComponent(dispatcher, config.settingsComponent))
      for (const path of settingsRoutes) routes.add(path);
    if (rendersPanels(dispatcher))
      for (const panel of panels)
        if (/^[A-Z][A-Za-z0-9_]*$/.test(panel.Component ?? '')) routes.add(`/${panel.name}`);
    coverage[platform] = { routes, settingsRoutes };
  }
  const paths = new Set([
    ...registry.map((route) => route.path),
    ...coverage.web.routes,
    ...coverage.mobile.routes,
    ...coverage.web.settingsRoutes,
    ...coverage.mobile.settingsRoutes,
  ]);
  const mismatches = [],
    accepted = [],
    errors = [],
    used = new Set();
  for (const exception of exceptions) {
    if (
      !exception.path?.startsWith('/') ||
      !['web', 'mobile'].includes(exception.missingOn) ||
      !exception.reason?.trim() ||
      !exception.followUp?.trim()
    )
      errors.push(`Invalid exception: ${JSON.stringify(exception)}`);
  }
  for (const path of [...paths].sort()) {
    for (const platform of ['web', 'mobile']) {
      const other = platform === 'web' ? 'mobile' : 'web';
      const registered = registry.some((route) => route.path === path);
      if (
        coverage[platform].routes.has(path) ||
        (!registered &&
          !coverage[other].routes.has(path) &&
          !coverage[other].settingsRoutes.has(path))
      )
        continue;
      const message = `${path}: missing ${platform} screen (${sourcePaths[platform].dispatcher}${path.startsWith('/settings/') ? ` → ${sourcePaths[platform].settings}` : ''})`;
      const exception = exceptions.find(
        (item) => item.path === path && item.missingOn === platform,
      );
      if (exception) {
        used.add(exception);
        accepted.push(`${message}; ${exception.reason}`);
      } else mismatches.push(message);
    }
  }
  for (const exception of exceptions)
    if (!used.has(exception))
      errors.push(`Stale or duplicate exception: ${exception.path} / ${exception.missingOn}`);
  return { registryCount: registry.length, coverage, mismatches, accepted, errors };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const root = fileURLToPath(new URL('../', import.meta.url));
    const read = (path) => readFileSync(resolve(root, path), 'utf8');
    const result = checkParity(read, JSON.parse(read('scripts/parity-exceptions.json')));
    console.log(
      `Parity: ${result.registryCount} shared routes; web ${result.coverage.web.routes.size}, mobile ${result.coverage.mobile.routes.size}; settings web ${result.coverage.web.settingsRoutes.size}, mobile ${result.coverage.mobile.settingsRoutes.size}.`,
    );
    for (const message of [...result.mismatches, ...result.errors])
      console.error(`FAIL ${message}`);
    for (const message of result.accepted) console.log(`EXCEPTION ${message}`);
    process.exitCode = result.mismatches.length || result.errors.length ? 1 : 0;
    console.log(
      process.exitCode ? 'Parity check failed.' : 'Parity check passed; no current mismatches.',
    );
  } catch (error) {
    console.error(`Parity check failed: ${error.message}`);
    process.exitCode = 1;
  }
}

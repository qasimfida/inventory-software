module.exports = {
  forbidden: [
    {
      name: 'spreadsheet-parsers-only-in-import-adapter',
      severity: 'error',
      from: {
        path: '^packages/',
        pathNot: '^packages/api-client/src/import-(file|xlsx)\\.ts$|\\.test\\.ts$',
      },
      to: { path: 'node_modules/(fflate|fast-xml-parser)(/|$)' },
    },
    {
      name: 'domain-and-server-no-design-dependencies',
      severity: 'error',
      from: { path: '^(apps/api/|packages/(contracts|domain|api-client)/)' },
      to: { path: '(packages/design-tokens/|node_modules/@inventory/design-tokens)' },
    },
    {
      name: 'api-runtime-no-development-fixtures',
      severity: 'error',
      from: { path: '^apps/api/src/', pathNot: '(^apps/api/src/development/|\\.test\\.ts$)' },
      to: { path: '^apps/api/src/development/' },
    },
    {
      name: 'api-no-ui-native-imports',
      severity: 'error',
      from: { path: '^apps/api/src/' },
      to: {
        path: 'node_modules/(react|react-dom|react-native|react-native-web|@react-native|expo[^/]*|@expo|@tauri-apps)(/|$)',
      },
    },
    {
      name: 'shared-only-approved-dependencies',
      severity: 'error',
      from: { path: '^packages/', pathNot: '\\.test\\.[cm]?[jt]sx?$' },
      to: {
        path: 'node_modules/',
        pathNot:
          'node_modules/(zod|fflate|fast-xml-parser|@noble/(ciphers|hashes)|@inventory/(contracts|api-client|domain|design-tokens))(/|$)',
      },
    },
    {
      name: 'portable-code-no-node-builtins',
      severity: 'error',
      from: {
        path: '^(packages/[^/]+/src/|apps/(web|mobile)/(src/|index\\.ts$))',
        pathNot: '\\.test\\.[cm]?[jt]sx?$',
      },
      to: { dependencyTypes: ['core'] },
    },
    {
      name: 'web-no-native-server-imports',
      severity: 'error',
      from: {
        path: '^apps/web/src/',
        pathNot: '^apps/web/src/platform/desktop-(storage|links)\\.ts$',
      },
      to: {
        path: '(node:|node_modules/(react-native|@react-native|expo[^/]*|@expo|@tauri-apps|@nestjs|pg)(/|$))',
      },
    },
    {
      name: 'mobile-no-dom-server-imports',
      severity: 'error',
      from: { path: '^apps/mobile/(src/|index\\.ts$)', pathNot: '\\.test\\.[cm]?[jt]sx?$' },
      to: { path: '(node:|node_modules/(react-dom|react-native-web|@tauri-apps|@nestjs|pg)(/|$))' },
    },
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
    { name: 'no-unresolved', severity: 'error', from: {}, to: { couldNotResolve: true } },
    {
      name: 'packages-cannot-import-apps',
      severity: 'error',
      from: { path: '^packages/' },
      to: { path: '^apps/' },
    },
    {
      name: 'contracts-are-independent',
      severity: 'error',
      from: { path: '^packages/contracts/' },
      to: { path: '^packages/(?!contracts/)' },
    },
    {
      name: 'shared-no-platform-runtime',
      severity: 'error',
      from: { path: '^packages/' },
      to: {
        path: '(node:|node_modules/(react|react-dom|react-native|react-native-web|@react-native|expo[^/]*|@expo|@nestjs|@tauri-apps|pg)(/|$))',
      },
    },
    ...['web', 'api', 'mobile', 'desktop'].map((app) => ({
      name: `${app}-no-cross-app-import`,
      severity: 'error',
      from: { path: `^apps/${app}/` },
      to: { path: `^apps/(?!${app}/)` },
    })),
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: {
      path: '^(apps|packages)/[^/]+/(dist|target|android|ios|\\.expo)/|/src-tauri/(target|gen)/',
    },
    tsConfig: { fileName: 'tsconfig.boundaries.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['types', 'import', 'default'],
    },
  },
};

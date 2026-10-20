import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import a11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '.local/**',
      'artifacts/**',
      'test-results/**',
      'playwright-report/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/target/**',
      '**/.expo/**',
      '**/coverage/**',
      'apps/mobile/ios/**',
      'apps/mobile/android/**',
    ],
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      parserOptions: {
        project: [
          'tsconfig.json',
          'apps/web/tsconfig.json',
          'apps/mobile/tsconfig.json',
          'apps/mobile/tsconfig.test.json',
          'packages/*/tsconfig.json',
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'variableLike', format: ['camelCase', 'PascalCase', 'UPPER_CASE'] },
        { selector: 'typeLike', format: ['PascalCase'] },
      ],
      '@typescript-eslint/no-unused-vars': 'error',
      'max-lines': ['warn', { max: 200, skipBlankLines: false, skipComments: false }],
    },
  },
  {
    files: ['apps/{web,mobile}/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': hooks },
    rules: hooks.configs.recommended.rules,
  },
  {
    files: ['apps/web/**/*.tsx'],
    plugins: { 'jsx-a11y': a11y },
    rules: a11y.configs.recommended.rules,
  },
);

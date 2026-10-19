import { defineConfig } from 'vitest/config';
import { nestTestTransform } from './scripts/nest-test-transform.ts';

export default defineConfig({
  plugins: [nestTestTransform()],
  test: { include: ['apps/**/*.integration.test.ts'], environment: 'node', testTimeout: 10000 },
});

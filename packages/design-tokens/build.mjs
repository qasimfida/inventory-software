import { readFile, mkdir, writeFile } from 'node:fs/promises';
const css = await readFile(new URL('./tokens.css', import.meta.url), 'utf8');
const blocks = [...css.matchAll(/\{([^}]+)\}/g)].map((match) =>
  Object.fromEntries([...match[1].matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]])),
);
const [light, overrides] = blocks;
if (!light || !overrides) throw new Error('Both token themes are required.');
for (const key of Object.keys(overrides)) {
  if (!(key in light)) throw new Error(`Unknown dark token: ${key}`);
}
for (const key of [
  'space-unit',
  'space-small',
  'space-medium',
  'space-large',
  'font-body',
  'font-native-body',
  'font-heading',
  'font-title',
  'radius',
  'border-width',
  'target-size',
  'native-target-size',
]) {
  if (!/^\d+(\.\d+)?px$/.test(light[key]))
    throw new Error(`Native dimensional token must use px: ${key}`);
}
if (!/^[1-9]00$/.test(light['weight-strong'])) throw new Error('Invalid native font weight.');
const palettes = { light, dark: { ...light, ...overrides } };
const keys = Object.keys(light)
  .map((key) => JSON.stringify(key))
  .join(' | ');
await mkdir(new URL('./dist', import.meta.url), { recursive: true });
await writeFile(
  new URL('./dist/index.js', import.meta.url),
  `// Generated from tokens.css; do not edit.\nexport const palettes = ${JSON.stringify(palettes)};\n`,
);
await writeFile(
  new URL('./dist/index.d.ts', import.meta.url),
  `export type Appearance = 'light' | 'dark' | 'system';\nexport type Token = ${keys};\nexport declare const palettes: ${JSON.stringify(palettes)};\n`,
);

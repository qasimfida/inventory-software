// Compare generated production artifacts with the recorded Phase 1 baseline, never rewrite it.
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
const out = process.env.REDESIGN_OUT ?? '.ai/reports/redesign/phase-9-validation';
const baseline = JSON.parse(
  await readFile('.ai/reports/redesign/before/bundle-sizes.json', 'utf8'),
);
async function files(dir) {
  const entries = await readdir(dir);
  return (
    await Promise.all(
      entries.map(async (name) => {
        const path = `${dir}/${name}`;
        return (await stat(path)).isDirectory() ? files(path) : [path];
      }),
    )
  ).flat();
}
const assets = await files('apps/web/dist');
const result = {
  method: 'All production chunks, not initial transfer; >10% raw growth requires review.',
  assets: [],
  violations: [],
};
for (const extension of ['.js', '.css']) {
  const buffers = await Promise.all(
    assets.filter((p) => p.endsWith(extension)).map((p) => readFile(p)),
  );
  const bytes = buffers.reduce((sum, b) => sum + b.length, 0);
  const growth = bytes / baseline.totals[extension] - 1;
  result.assets.push({
    extension,
    files: buffers.length,
    bytes,
    gzipBytes: buffers.reduce((sum, b) => sum + gzipSync(b).length, 0),
    baselineBytes: baseline.totals[extension],
    growth,
  });
  if (growth > 0.1) result.violations.push(`${extension} exceeds the 10% review threshold`);
}
await writeFile(`${out}/budget.json`, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
if (result.violations.length) process.exitCode = 1;

import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage']);
const requiredDocuments = [
  'AGENTS.md',
  'README.md',
  'docs/architecture/repository-inspection.md',
  'docs/architecture/overview.md',
  'docs/architecture/decisions.md',
  'docs/architecture/platforms.md',
  'docs/development/code-standards.md',
  'docs/development/feature-workflow.md',
  'docs/development/testing.md',
  'docs/development/roadmap.md',
  'docs/domain/inventory-and-finance.md',
  'docs/offline/synchronization.md',
  'docs/security/authorization.md',
  'docs/ai/feature-prompt-template.md',
  'docs/ai/architecture-map.md',
];
const sourcePattern = /\.(?:[cm]?[jt]sx?|rs|swift|kt|java|py|sql)$/;
const failures = [];

async function collectFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory() && !ignoredDirectories.has(entry.name)) {
      files.push(...(await collectFiles(absolutePath)));
    } else if (entry.isFile()) {
      files.push(path.relative(root, absolutePath).split(path.sep).join('/'));
    }
  }
  return files;
}

async function checkLinks(file, contents) {
  const withoutCodeBlocks = contents.replace(/```[^]*?```/g, '');
  for (const match of withoutCodeBlocks.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const destination = match[1].replace(/^<|>$/g, '');
    if (/^(?:[a-z][a-z\d+.-]*:|#)/i.test(destination)) continue;
    let target;
    try {
      target = decodeURIComponent(destination.split('#')[0]);
    } catch {
      failures.push(`${file}: invalid link encoding: ${destination}`);
      continue;
    }
    if (!target) continue;
    const resolved = path.resolve(root, path.dirname(file), target);
    const relative = path.relative(root, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      failures.push(`${file}: link leaves repository: ${destination}`);
      continue;
    }
    try {
      if (!(await stat(resolved)).isFile()) throw new Error('not a file');
    } catch {
      failures.push(`${file}: missing file link: ${destination}`);
    }
  }
}

const files = await collectFiles(root);
const exceptions = JSON.parse(
  await readFile(path.join(root, 'scripts/source-size-exceptions.json'), 'utf8'),
);
for (const required of requiredDocuments) {
  if (!files.includes(required)) failures.push(`Missing required document: ${required}`);
}
for (const [file, reason] of Object.entries(exceptions)) {
  if (!files.includes(file) || !sourcePattern.test(file)) {
    failures.push(`Stale or non-source exception: ${file}`);
  }
  if (typeof reason !== 'string' || reason.trim().length < 20) {
    failures.push(`Exception needs a meaningful rationale: ${file}`);
  }
}
let documentCount = 0;
let sourceCount = 0;
for (const file of files) {
  if (!file.endsWith('.md') && !sourcePattern.test(file)) continue;
  const contents = await readFile(path.join(root, file), 'utf8');
  if (file.endsWith('.md')) {
    documentCount += 1;
    await checkLinks(file, contents);
  } else {
    sourceCount += 1;
    const lineCount = contents === '' ? 0 : contents.replace(/\n$/, '').split('\n').length;
    if (lineCount > 200 && !Object.hasOwn(exceptions, file)) {
      failures.push(
        `${file}: ${lineCount} lines exceeds 200; split or register reviewed exception`,
      );
    }
  }
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Foundation checks passed: ${documentCount} documents, ${sourceCount} source files.`);
}

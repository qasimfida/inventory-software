import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
export const guides = ['architecture', 'design-system', 'security-and-data', 'development'];
const prefixes = ['ARC', 'DS', 'SEC', 'DEV'];
export function checkDocuments(
  documents,
  exists = existsSync,
  load = (p) => readFileSync(p, 'utf8'),
) {
  const errors = [],
    ids = new Set();
  for (const [index, name] of guides.entries()) {
    const path = `docs/${name}.md`,
      text = documents[path];
    if (typeof text !== 'string') {
      errors.push(`Missing ${path}`);
      continue;
    }
    const lines = text.trimEnd().split('\n');
    if (lines.length > 200) errors.push(`${path}: ${lines.length} lines exceeds 200`);
    for (const [n, line] of lines.entries()) {
      if (!line.trim() || /^#{1,4} /.test(line)) continue;
      const match = /^- \*\*([A-Z]+-\d{3})\*\* \[(review|enforced: [^\]]+)\] .+/.exec(line);
      if (!match) {
        errors.push(`${path}:${n + 1}: expected tagged rule bullet`);
        continue;
      }
      if (!match[1].startsWith(`${prefixes[index]}-`))
        errors.push(`${path}: wrong rule prefix ${match[1]}`);
      if (ids.has(match[1])) errors.push(`${path}: duplicate rule ${match[1]}`);
      ids.add(match[1]);
      if (match[2].startsWith('enforced: ')) {
        const command = match[2].slice(10);
        if (!/^npm run [\w:-]+$/.test(command))
          errors.push(`${path}: use an executable npm check tag`);
        else {
          const pkg = JSON.parse(load('package.json'));
          if (!pkg.scripts?.[command.slice(8)])
            errors.push(`${path}: unknown enforcement ${command}`);
        }
      }
    }
    for (const [, destination] of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      if (/^[a-z]+:/i.test(destination)) continue;
      let decoded;
      try {
        decoded = decodeURIComponent(destination);
      } catch {
        errors.push(`${path}: invalid link ${destination}`);
        continue;
      }
      const [file, anchor] = decoded.split('#');
      const target = file ? resolve(dirname(path), file) : resolve(path);
      if (relative(process.cwd(), target).startsWith('..') || !exists(target)) {
        errors.push(`${path}: missing/outside link ${destination}`);
        continue;
      }
      if (anchor && /\.md$/.test(target)) {
        const headings = [...load(target).matchAll(/^#{1,6} (.+)$/gm)].map((m) =>
          m[1]
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s-]/gu, '')
            .replace(/\s/g, '-'),
        );
        if (!headings.includes(anchor)) errors.push(`${path}: missing anchor ${destination}`);
      }
    }
  }
  return errors;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const documents = Object.fromEntries(
    guides.map((name) => {
      const path = `docs/${name}.md`;
      return [path, existsSync(path) ? readFileSync(path, 'utf8') : undefined];
    }),
  );
  const errors = checkDocuments(documents);
  if (readdirSync('docs').some((f) => !guides.some((g) => f === `${g}.md`)))
    errors.push('docs must contain only the four canonical guides');
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else
    console.log(
      'Four canonical guides verified: <=200 lines, unique IDs, rule tags, executable check tags and local links/anchors.',
    );
}

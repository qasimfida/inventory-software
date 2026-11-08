import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findings, compare } from './design-check.mjs';
test('detects raw controls outside primitives, ignores text and comments', () => {
  const source = '// <button />\nconst label = "<input />"; const view = <button>Save</button>';
  assert.equal(
    findings('apps/web/src/features/Example.tsx', source).filter((x) => x.kind === 'raw-control')
      .length,
    1,
  );
  assert.equal(findings('apps/web/src/components/ui/Example.tsx', source).length, 0);
});
test('checks native styles, CSS literals and arbitrary utilities but accepts tokens', () => {
  assert.equal(
    findings(
      'apps/mobile/src/ui/X.tsx',
      "const style={backgroundColor:'#fff',fontSize:14,borderRadius:tokens.radius};",
    ).length,
    2,
  );
  assert.equal(
    findings('x.css', '/* color:#fff; */ a {color:var(--foreground);border-radius:7px;}').length,
    1,
  );
  assert.equal(
    findings('x.tsx', 'const x=<div className="bg-[#fff] text-[var(--font-body)]" />').length,
    1,
  );
});
test('baseline survives line shifts but rejects duplicate and new violations', () => {
  const one = { path: 'x', kind: 'raw-control', value: 'input', line: 1 };
  assert.deepEqual(compare([{ ...one, line: 99 }], [one]), { added: [], fixed: [] });
  assert.equal(compare([one, one], [one]).added.length, 1);
  assert.equal(compare([], [one]).fixed.length, 1);
  assert.equal(compare([{ ...one, path: 'new' }], [one]).added.length, 1);
});

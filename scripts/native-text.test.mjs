import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';
// React Native rejects literal children in View even though React Native Web accepts them.
function invalidText(source, path) {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const failures = [];
  const textNames = new Set(['Text', 'NativeText', 'ThemedText']);
  for (const statement of file.statements) {
    if (ts.isImportDeclaration(statement)) {
      const bindings = statement.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings))
        for (const specifier of bindings.elements) {
          if ((specifier.propertyName?.text ?? specifier.name.text) === 'Text')
            textNames.add(specifier.name.text);
        }
    }
  }
  function walk(node) {
    const literal = ts.isJsxText(node)
      ? node.text.trim()
      : ts.isJsxExpression(node) && node.expression && ts.isStringLiteral(node.expression)
        ? node.expression.text
        : '';
    if (literal) {
      let parent = node.parent;
      while (parent && ts.isJsxFragment(parent)) parent = parent.parent;
      if (parent && ts.isJsxElement(parent)) {
        const tag = parent.openingElement.tagName.getText(file);
        if (!textNames.has(tag) && !/\.Text$/.test(tag))
          failures.push(`${path}:${file.getLineAndCharacterOfPosition(node.pos).line + 1}`);
      }
    }
    ts.forEachChild(node, walk);
  }
  walk(file);
  return failures;
}
test('native sources do not place literal text or explicit spaces outside Text', () => {
  assert.equal(invalidText("<View>{' '}</View>", 'fixture.tsx').length, 1);
  assert.equal(invalidText('<View><Text>Hello</Text></View>', 'fixture.tsx').length, 0);
  const root = 'apps/mobile/src/';
  const failures = readdirSync(root, { recursive: true })
    .filter((p) => p.endsWith('.tsx') && !p.includes('.test.'))
    .flatMap((p) => invalidText(readFileSync(root + p, 'utf8'), root + p));
  assert.deepEqual(failures, []);
});

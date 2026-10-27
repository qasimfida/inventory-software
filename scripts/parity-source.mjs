import ts from 'typescript';

export function parse(text, file) {
  const tree = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  if (tree.parseDiagnostics.length) throw new Error(`Cannot parse ${file}`);
  return tree;
}
export function walk(node, visit) {
  visit(node);
  ts.forEachChild(node, (child) => walk(child, visit));
}
export function entries(tree, variable) {
  let result;
  walk(tree, (node) => {
    if (!ts.isVariableDeclaration(node) || node.name.getText() !== variable) return;
    let value = node.initializer;
    while (value && (ts.isSatisfiesExpression(value) || ts.isAsExpression(value)))
      value = value.expression;
    if (!value || !ts.isArrayLiteralExpression(value))
      throw new Error(`Expected ${variable} array`);
    result = value.elements.map((item) => {
      if (!ts.isObjectLiteralExpression(item)) throw new Error(`Unsupported ${variable} entry`);
      return Object.fromEntries(
        item.properties
          .filter(ts.isPropertyAssignment)
          .map((property) => [
            property.name.getText(),
            ts.isStringLiteral(property.initializer)
              ? property.initializer.text
              : property.initializer.getText(),
          ]),
      );
    });
  });
  if (!result?.length) throw new Error(`Missing ${variable} entries`);
  return result;
}
function hasRender(node, seen = new Set()) {
  let found = false;
  walk(node, (child) => {
    if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) found = true;
    if (ts.isIdentifier(child) && !seen.has(child.text)) {
      let root = child;
      while (root.parent) root = root.parent;
      const next = new Set([...seen, child.text]);
      walk(root, (declaration) => {
        if (
          ts.isVariableDeclaration(declaration) &&
          declaration.name.getText() === child.text &&
          declaration.initializer &&
          hasRender(declaration.initializer, next)
        )
          found = true;
      });
    }
  });
  return found;
}
function guardedPaths(condition) {
  const paths = new Set();
  walk(condition, (node) => {
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken
    ) {
      for (const [key, value] of [
        [node.left, node.right],
        [node.right, node.left],
      ]) {
        if (!ts.isStringLiteral(value)) continue;
        if (key.getText() === 'path' && value.text.startsWith('/')) paths.add(value.text);
        if (key.getText() === 'section') paths.add(`/settings/${value.text}`);
      }
    }
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'includes'
    ) {
      const receiver = node.expression.expression;
      if (ts.isArrayLiteralExpression(receiver) && node.arguments[0]?.getText() === 'path') {
        for (const item of receiver.elements) if (ts.isStringLiteral(item)) paths.add(item.text);
      }
      if (
        receiver.getText() === 'visited' &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      )
        paths.add(node.arguments[0].text);
    }
  });
  return paths;
}
/** Only positive rendering guards count; links, labels and registry lookups do not. */
export function renderedRoutes(tree) {
  const routes = new Set();
  walk(tree, (node) => {
    let guard, body;
    if (ts.isIfStatement(node)) [guard, body] = [node.expression, node.thenStatement];
    if (ts.isConditionalExpression(node)) [guard, body] = [node.condition, node.whenTrue];
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
    )
      [guard, body] = [node.left, node.right];
    if (guard && hasRender(body)) for (const path of guardedPaths(guard)) routes.add(path);
  });
  return routes;
}
export function rendersComponent(tree, name) {
  let found = false;
  walk(tree, (node) => {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      node.tagName.getText() === name
    )
      found = true;
  });
  return found;
}
export function rendersPanels(tree) {
  let found = false;
  walk(tree, (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'map' &&
      node.expression.expression.getText().replace(/\s/g, '').startsWith('panels.') &&
      rendersComponent(node, 'Component')
    )
      found = true;
  });
  return found;
}

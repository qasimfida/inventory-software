import { Parser } from 'htmlparser2';
/** Version marker keeps existing plain text (including literal angle brackets) unchanged. */
export const richDescriptionPrefix = '<!--inventory-description:v1-->';
export type DescriptionNode = {
  tag: string;
  text?: string;
  href?: string;
  children: DescriptionNode[];
};
const tags = new Set(['p', 'br', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'a']);
const blocked = new Set(['script', 'style', 'iframe', 'svg', 'math', 'object', 'template']);
export function safeDescriptionLink(value: string): string | undefined {
  if (
    Array.from(value).some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  )
    return undefined;
  return /^(https?:\/\/|mailto:)[^\s<>"]+$/i.test(value) ? value : undefined;
}
export function parseDescription(value: string): DescriptionNode[] {
  if (!value.startsWith(richDescriptionPrefix))
    return [{ tag: '#text', text: value, children: [] }];
  const root: DescriptionNode = { tag: 'root', children: [] };
  const stack = [root];
  let suppressed = 0;
  const parser = new Parser(
    {
      onopentag(name, attributes) {
        if (suppressed || blocked.has(name)) {
          suppressed++;
          return;
        }
        const tag = name === 'b' ? 'strong' : name === 'i' ? 'em' : name;
        const node: DescriptionNode = { tag: tags.has(tag) ? tag : 'span', children: [] };
        if (tag === 'a') {
          const href = safeDescriptionLink(attributes.href ?? '');
          if (href) node.href = href;
        }
        stack.at(-1)!.children.push(node);
        stack.push(node);
      },
      ontext(text) {
        if (!suppressed) stack.at(-1)!.children.push({ tag: '#text', text, children: [] });
      },
      onclosetag() {
        if (suppressed) {
          suppressed--;
          return;
        }
        if (stack.length > 1) stack.pop();
      },
    },
    { decodeEntities: true },
  );
  parser.end(value.slice(richDescriptionPrefix.length));
  return root.children;
}
const escape = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
export function descriptionHtml(value: string): string {
  const render = (nodes: DescriptionNode[]): string =>
    nodes
      .map((node) => {
        if (node.tag === '#text') return escape(node.text ?? '').replaceAll('\n', '<br>');
        const children = render(node.children);
        if (!tags.has(node.tag)) return children;
        if (node.tag === 'br') return '<br>';
        if (node.tag === 'a')
          return node.href ? `<a href="${escape(node.href)}">${children}</a>` : children;
        return `<${node.tag}>${children}</${node.tag}>`;
      })
      .join('');
  return render(parseDescription(value));
}
export function descriptionText(value: string): string {
  const text = (nodes: DescriptionNode[]): string =>
    nodes
      .map((node) =>
        node.tag === '#text'
          ? node.text
          : `${text(node.children)}${['p', 'li', 'br'].includes(node.tag) ? '\n' : ''}`,
      )
      .join('');
  return text(parseDescription(value)).trim();
}
/** Only allowlisted markup is persisted; empty formatted documents remain empty descriptions. */
export function richDescription(html: string): string {
  const value = richDescriptionPrefix + html;
  return descriptionText(value) ? richDescriptionPrefix + descriptionHtml(value) : '';
}
export const normalizeDescription = (value: string) =>
  value.startsWith(richDescriptionPrefix)
    ? richDescription(value.slice(richDescriptionPrefix.length))
    : value;

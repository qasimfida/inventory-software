import './rich-text.css';
import { createElement, type ReactNode } from 'react';
import { parseDescription, type DescriptionNode } from '@inventory/domain';
/** Render only parser-allowlisted elements and safe links; never insert arbitrary HTML. */
export function RichDescription({ value }: { value: string }) {
  const render = (nodes: DescriptionNode[]): ReactNode =>
    nodes.map((node, key) =>
      node.tag === '#text'
        ? node.text
        : createElement(
            node.tag,
            {
              key,
              ...(node.href
                ? { href: node.href, target: '_blank', rel: 'noopener noreferrer' }
                : {}),
            },
            node.tag === 'br' ? undefined : render(node.children),
          ),
    );
  return (
    <div className="rich-description">
      {value ? render(parseDescription(value)) : 'No description added.'}
    </div>
  );
}

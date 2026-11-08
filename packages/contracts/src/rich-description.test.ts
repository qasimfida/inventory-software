import { describe, expect, it } from 'vitest';
import { createProductSchema } from './catalog';
import { onlineOverridesSchema } from './storefront-management';
import {
  descriptionHtml,
  descriptionText,
  parseDescription,
  richDescription,
  richDescriptionPrefix,
  normalizeDescription,
} from './rich-description';
describe('rich product descriptions', () => {
  it('preserves legacy plain text, symbols and literal markup', () => {
    expect(descriptionText('Use <b>literally</b> & 2 < 3')).toBe('Use <b>literally</b> & 2 < 3');
    expect(descriptionHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    );
  });
  it('round trips formatting, lists and safe links', () => {
    const value = richDescription(
      '<p><strong>Bold</strong> and <em>italic</em> <u>text</u></p><ol><li>One</li><li>Two</li></ol><p><a href="https://example.com">Details</a></p>',
    );
    expect(normalizeDescription(value)).toBe(value);
    expect(descriptionText(value)).toContain('Bold and italic text');
    expect(descriptionHtml(value)).toContain('<ol><li>One</li><li>Two</li></ol>');
    expect(parseDescription(value).length).toBe(3);
  });
  it('drops scripts, embeds, event handlers and unsafe links', () => {
    const value = richDescription(
      '<p onclick="alert(1)">Safe<img src=x onerror=alert(1)><script>alert(1)</script><svg onload=alert(1)>hidden</svg><a href="javascript:alert(1)">link</a></p>',
    );
    expect(descriptionHtml(value)).toBe('<p>Safelink</p>');
    expect(descriptionHtml(richDescription('<a href="java&#10;script:alert(1)">bad</a>'))).toBe(
      'bad',
    );
  });
  it('normalizes catalog and online override writes', () => {
    const description =
      richDescriptionPrefix +
      '<p onclick=evil()>Safe <strong>details</strong><script>evil()</script></p>';
    const expected = richDescriptionPrefix + '<p>Safe <strong>details</strong></p>';
    expect(createProductSchema.parse({ name: 'Mug', sku: 'MUG', description }).description).toBe(
      expected,
    );
    expect(
      onlineOverridesSchema.parse({
        title: null,
        description,
        images: null,
        price: null,
        visible: true,
      }).description,
    ).toBe(expected);
  });
  it('normalizes empty formatted content without bypassing readiness', () => {
    expect(richDescription('<p><br></p>')).toBe('');
    expect(descriptionText(richDescriptionPrefix + '<p><strong>x</strong></p>')).toBe('x');
  });
});

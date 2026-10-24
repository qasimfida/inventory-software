import { expect, it } from 'vitest';
import { palettes } from './dist/index.js';
function luminance(hex: string) {
  const rgb = hex
    .slice(1)
    .match(/../g)!
    .map((part) => {
      const n = parseInt(part, 16) / 255;
      return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
    });
  return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
}
function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0]! + 0.05) / (values[1]! + 0.05);
}
for (const mode of ['light', 'dark'] as const) {
  it(`${mode} semantic text, disabled controls and focus meet contrast targets`, () => {
    const p = palettes[mode];
    for (const surface of ['background', 'card', 'muted', 'elevated'] as const) {
      for (const text of [
        'foreground',
        'muted-foreground',
        'success',
        'warning',
        'info',
        'destructive',
      ] as const)
        expect(contrast(p[text], p[surface]), `${text} on ${surface}`).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(p['primary-teal'], p[surface]),
        `teal focus on ${surface}`,
      ).toBeGreaterThanOrEqual(3);
      expect(contrast(p.ring, p[surface]), `focus on ${surface}`).toBeGreaterThanOrEqual(3);
      expect(contrast(p.input, p[surface]), `input on ${surface}`).toBeGreaterThanOrEqual(3);
    }
    for (const [text, surface] of [
      ['primary-foreground', 'primary'],
      ['primary-foreground', 'primary-teal'],
      ['secondary-foreground', 'secondary'],
      ['destructive-foreground', 'destructive'],
      ['disabled-foreground', 'disabled'],
      ['selected-foreground', 'selected'],
      ['sidebar-foreground', 'sidebar'],
      ['sidebar-foreground', 'navigation-hover'],
      ['navigation-selected-foreground', 'navigation-selected'],
      ['foreground', 'table-header'],
      ['foreground', 'table-row'],
      ['foreground', 'table-hover'],
      ['table-selected-foreground', 'table-selected'],
    ] as const)
      expect(contrast(p[text], p[surface]), `${text} on ${surface}`).toBeGreaterThanOrEqual(4.5);
  });
}

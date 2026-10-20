import { expect, it } from 'vitest';
import { locationLabel } from './location-label.js';
it('encodes UUID labels with Code 39 framing, fixed quiet zones and 3 wide elements per symbol', () => {
  const result = locationLabel('abcdef01-2345-4678-9abc-def012345678');
  expect(result.value).toBe('ABCDEF01-2345-4678-9ABC-DEF012345678');
  expect(result.bars).toHaveLength(190);
  expect(result.width).toBe(513);
  expect(result.bars.slice(0, 5)).toEqual([
    { x: 10, width: 1 },
    { x: 13, width: 1 },
    { x: 15, width: 2 },
    { x: 18, width: 2 },
    { x: 21, width: 1 },
  ]);
  expect(() => locationLabel('bad input')).toThrow();
});

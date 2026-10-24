import { expect, it } from 'vitest';
import { cn } from './utils';

it('preserves semantic control typography alongside color and permits explicit size overrides', () => {
  expect(cn('text-control', 'text-primary-foreground')).toBe(
    'text-control text-primary-foreground',
  );
  expect(cn('text-control', 'text-foreground', 'text-xs')).toBe('text-foreground text-xs');
  expect(cn('text-xs', 'text-control', 'text-destructive')).toBe('text-control text-destructive');
});

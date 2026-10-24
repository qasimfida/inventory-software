import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Keep the semantic control size distinct from text color in class overrides.
const merge = extendTailwindMerge({
  extend: { classGroups: { 'font-size': [{ text: ['control'] }] } },
});

export function cn(...inputs: ClassValue[]) {
  return merge(clsx(inputs));
}

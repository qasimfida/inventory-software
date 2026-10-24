import { palettes } from '@inventory/design-tokens';
const tokens = palettes.light; // Metrics are identical in both generated palettes.
export const metrics = {
  unit: parseFloat(tokens['space-unit']),
  small: parseFloat(tokens['space-small']),
  medium: parseFloat(tokens['space-medium']),
  large: parseFloat(tokens['space-large']),
  body: parseFloat(tokens['font-native-body']),
  label: parseFloat(tokens['font-label']),
  heading: parseFloat(tokens['font-heading']),
  title: parseFloat(tokens['font-title']),
  lineHeight: parseFloat(tokens['font-native-body']) * parseFloat(tokens['line-body']),
  strong: tokens['weight-strong'],
  radius: parseFloat(tokens.radius),
  border: parseFloat(tokens['border-width']),
  target: parseFloat(tokens['native-target-size']),
  focusWidth: parseFloat(tokens['focus-width']),
  focusOffset: parseFloat(tokens['focus-offset']),
};

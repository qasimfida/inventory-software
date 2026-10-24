import { Choice } from './Controls';
import { useTheme } from '../theme';
export function AppearanceControl() {
  const theme = useTheme();
  return (
    <Choice
      label="Appearance"
      value={theme.appearance}
      inline
      options={['system', 'light', 'dark'].map((value) => ({ value, label: value }))}
      disabled={theme.locked}
      onChange={(value) => {
        if (value === 'system' || value === 'light' || value === 'dark') theme.setAppearance(value);
      }}
    />
  );
}

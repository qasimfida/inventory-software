import { StyleSheet } from 'react-native';
import { metrics } from '../ui/metrics';
import type { useTheme } from '../theme';
export const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      gap: theme.spacing.medium,
      padding: theme.spacing.medium,
      borderRadius: theme.radius,
      backgroundColor: theme.colors.card,
      borderWidth: metrics.border,
      borderColor: theme.colors.border,
    },
    heading: { fontSize: metrics.heading, fontWeight: metrics.strong },
    input: {
      borderWidth: metrics.border,
      borderColor: theme.colors.muted,
      borderRadius: theme.radius,
      minHeight: metrics.target,
      padding: metrics.unit * 3,
      color: theme.colors.foreground,
    },
    error: { color: theme.colors.error },
  });

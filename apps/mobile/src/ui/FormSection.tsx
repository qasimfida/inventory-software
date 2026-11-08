import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { DisclosureTrigger } from './DisclosureTrigger';
import { useTheme } from '../theme';
/** Keeps fields mounted so expanding/collapsing never discards form values. */
export function FormSection({
  title,
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [expanded, setOpen] = useState(defaultOpen);
  const open = controlledOpen ?? expanded;
  const theme = useTheme();
  return (
    <View>
      <DisclosureTrigger
        label={title}
        expanded={open}
        onPress={() => {
          if (controlledOpen === undefined) setOpen(!open);
          onOpenChange?.(!open);
        }}
      />
      <View
        style={{ display: open ? 'flex' : 'none', gap: theme.spacing.small }}
        accessibilityElementsHidden={!open}
        importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
      >
        {children}
      </View>
    </View>
  );
}

import { Action } from './Controls';
import { Text } from './Themed';
import { View } from 'react-native';
export function FilterButton({ active, onPress }: { active: string[]; onPress: () => void }) {
  return (
    <View>
      <Action
        variant="outline"
        icon="☷"
        label={`Filters${active.length ? ` (${active.length})` : ''}`}
        accessibilityLabel={`Filters. ${active.join(', ') || 'None selected'}`}
        onPress={onPress}
      />
      {active.length > 0 && <Text tone="muted">{active.join(' · ')}</Text>}
    </View>
  );
}

import { ScrollView, View, Text } from 'react-native';
import { locationLabel } from '@inventory/domain';
export function LocationLabel({ id, code }: { id: string; code: string }) {
  const label = locationLabel(id);
  return (
    <View>
      <Text>
        {code} · {label.value}
      </Text>
      <ScrollView horizontal>
        <View
          accessible
          accessibilityLabel={`Location barcode ${label.value}`}
          style={{ height: 60, width: label.width, backgroundColor: '#fff' }}
        >
          {label.bars.map((b) => (
            <View
              key={b.x}
              style={{
                position: 'absolute',
                left: b.x,
                width: b.width,
                top: 0,
                height: 60,
                backgroundColor: '#000',
              }}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

import type { ReactNode } from 'react';
import { Linking, View } from 'react-native';
import { parseDescription, type DescriptionNode } from '@inventory/domain';
import { Text } from './Themed';
import { useTheme } from '../theme';
/** Safe native text nodes; no arbitrary HTML or script execution in read-only descriptions. */
export function RichDescription({ value }: { value: string }) {
  const theme = useTheme();
  const render = (nodes: DescriptionNode[], ordered = false): ReactNode =>
    nodes.map((node, key) => {
      if (node.tag === '#text') return node.text;
      if (node.tag === 'br') return '\n';
      const block = ['p', 'li', 'ol', 'ul'].includes(node.tag);
      return (
        <Text
          key={key}
          accessibilityRole={node.href ? 'link' : undefined}
          onPress={
            node.href
              ? () => {
                  void Linking.openURL(node.href!);
                }
              : undefined
          }
          style={{
            fontWeight: node.tag === 'strong' ? '700' : undefined,
            fontStyle: node.tag === 'em' ? 'italic' : undefined,
            textDecorationLine:
              node.tag === 'u' || node.href
                ? 'underline'
                : node.tag === 's'
                  ? 'line-through'
                  : undefined,
            color: node.href ? theme.colors.primary : undefined,
          }}
        >
          {node.tag === 'li' ? (ordered ? `${key + 1}. ` : '• ') : ''}
          {render(node.children, node.tag === 'ol')}
          {block ? '\n' : ''}
        </Text>
      );
    });
  return (
    <View>
      <Text>{value ? render(parseDescription(value)) : 'No description added.'}</Text>
    </View>
  );
}

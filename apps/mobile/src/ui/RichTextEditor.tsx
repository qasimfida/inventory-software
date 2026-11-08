import { useEffect, useState, useRef } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { richDescription, descriptionHtml } from '@inventory/domain';
import { useTheme } from '../theme';
import { Text } from './Themed';
import { quillDocument } from './quill-document';
export type RichTextEditorProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
};
/** A local Quill document; navigation/network access and shared cookies are blocked. */
export function RichTextEditor({
  label,
  value,
  onChange,
  error,
  disabled = false,
}: RichTextEditorProps) {
  const theme = useTheme(),
    ref = useRef<WebView<object>>(null),
    last = useRef(value);
  const colors = {
    background: theme.colors.card,
    foreground: theme.tokens.foreground,
    border: theme.tokens.border,
    primary: theme.colors.primary,
    font: theme.fontFamily ?? 'sans-serif',
    size:
      parseFloat(theme.tokens['font-native-body']) *
      (theme.preferences.textSize === 'large'
        ? 1.2
        : theme.preferences.textSize === 'small'
          ? 0.9
          : 1),
  };
  const [html] = useState(() => quillDocument(value, label, colors, disabled));
  const appearance = JSON.stringify(colors);
  useEffect(() => {
    ref.current?.injectJavaScript(
      `window.updateAppearance && window.updateAppearance(${appearance},${disabled});true;`,
    );
  }, [appearance, disabled]);
  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      ref.current?.injectJavaScript(
        `window.setDescription && window.setDescription(${JSON.stringify(descriptionHtml(value))});true;`,
      );
    }
  }, [value]);
  function receive(data: string) {
    try {
      const message: unknown = JSON.parse(data);
      if (
        message &&
        typeof message === 'object' &&
        'type' in message &&
        message.type === 'description' &&
        'html' in message &&
        typeof message.html === 'string' &&
        message.html.length <= 32000
      ) {
        last.current = richDescription(message.html);
        onChange(last.current);
      }
    } catch {
      /* Ignore malformed bridge messages. */
    }
  }
  return (
    <View style={{ gap: theme.spacing.small }}>
      <Text>{label}</Text>
      <View style={{ height: 300, borderRadius: theme.radius, overflow: 'hidden' }}>
        <WebView<object>
          ref={ref}
          source={{ html }}
          originWhitelist={['*']}
          accessibilityLabel={label}
          javaScriptEnabled
          domStorageEnabled={false}
          sharedCookiesEnabled={false}
          thirdPartyCookiesEnabled={false}
          allowFileAccess={false}
          setSupportMultipleWindows={false}
          onShouldStartLoadWithRequest={(request) => request.url === 'about:blank'}
          onMessage={(event) => receive(event.nativeEvent.data)}
        />
      </View>
      <Text tone="muted">{value.length}/2000 characters including formatting</Text>
      {!!error && <Text accessibilityRole="alert">{error}</Text>}
    </View>
  );
}

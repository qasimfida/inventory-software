import { useEffect, useState, useRef } from 'react';
import { richDescription, descriptionHtml } from '@inventory/domain';
import { useTheme } from '../theme';
import { quillDocument } from './quill-document';
import type { RichTextEditorProps } from './RichTextEditor';
export function RichTextEditor({
  label,
  value,
  onChange,
  error,
  disabled = false,
}: RichTextEditorProps) {
  const theme = useTheme(),
    frame = useRef<HTMLIFrameElement>(null),
    change = useRef(onChange);
  useEffect(() => {
    change.current = onChange;
  }, [onChange]);
  const colors = {
    background: theme.colors.card,
    foreground: theme.tokens.foreground,
    border: theme.tokens.border,
    primary: theme.colors.primary,
    font: theme.fontFamily ?? 'sans-serif',
    size:
      parseFloat(theme.tokens['font-native-body']) *
      (theme.preferences.textSize === 'large'
        ? 1.15
        : theme.preferences.textSize === 'small'
          ? 0.9
          : 1),
  };
  const last = useRef(value);
  const [html] = useState(() => quillDocument(value, label, colors, disabled));
  const appearance = JSON.stringify(colors);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      try {
        const message = JSON.parse(String(event.data)) as { type?: unknown; html?: unknown };
        if (
          message.type === 'description' &&
          typeof message.html === 'string' &&
          message.html.length <= 32000
        ) {
          last.current = richDescription(message.html);
          change.current(last.current);
        }
      } catch {
        /* Ignore malformed bridge messages. */
      }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);
  useEffect(() => {
    frame.current?.contentWindow?.postMessage(
      { type: 'appearance', colors: JSON.parse(appearance), disabled },
      '*',
    );
  }, [appearance, disabled]);
  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      frame.current?.contentWindow?.postMessage(
        { type: 'value', html: descriptionHtml(value) },
        '*',
      );
    }
  }, [value]);
  return (
    <div>
      <p>{label}</p>
      <iframe
        ref={frame}
        title={label}
        sandbox="allow-scripts"
        srcDoc={html}
        style={{ width: '100%', height: 300, border: 0, borderRadius: theme.radius }}
      />
      <p>{value.length}/2000 characters including formatting</p>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

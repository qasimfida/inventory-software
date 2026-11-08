import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type Quill from 'quill';
import { descriptionHtml, richDescription } from '@inventory/domain';
import 'quill/dist/quill.snow.css';
import './rich-text.css';
/** Controlled, locally bundled Quill editor. Values retain the description's versioned safe HTML format. */
export function RichTextEditor({
  id,
  label,
  value,
  onChange,
  invalid = false,
  describedBy,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string | undefined;
  disabled?: boolean;
}) {
  const mount = useRef<HTMLDivElement>(null),
    toolbar = useRef<HTMLDivElement>(null),
    editor = useRef<Quill | null>(null);
  const current = useRef(value),
    change = useRef(onChange);
  useLayoutEffect(() => {
    current.current = value;
    change.current = onChange;
  }, [value, onChange]);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let disposed = false;
    const host = mount.current!;
    void import('quill')
      .then(({ default: QuillEditor }) => {
        if (disposed) return;
        const element = document.createElement('div');
        host.append(element);
        const quill = new QuillEditor(element, {
          theme: 'snow',
          formats: ['bold', 'italic', 'underline', 'list', 'link'],
          modules: { toolbar: toolbar.current, history: { userOnly: true } },
        });
        editor.current = quill;
        setReady(true);
        quill.root.id = id;
        quill.root.setAttribute('role', 'textbox');
        quill.root.setAttribute('aria-label', label);
        quill.root.setAttribute('aria-multiline', 'true');
        quill.root.setAttribute('aria-invalid', String(invalid));
        if (describedBy) quill.root.setAttribute('aria-describedby', describedBy);
        quill.enable(!disabled);
        quill.setContents(
          quill.clipboard.convert({ html: descriptionHtml(current.current) }),
          'silent',
        );
        quill.on('text-change', () => {
          const next = richDescription(quill.getSemanticHTML());
          current.current = next;
          change.current(next);
        });
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });
    return () => {
      disposed = true;
      editor.current = null;
      host.replaceChildren();
    };
    // Quill owns its DOM; changing field state must not recreate the editor or lose selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, label]);
  useEffect(() => {
    const quill = editor.current;
    if (!quill) return;
    quill.enable(!disabled);
    quill.root.setAttribute('aria-invalid', String(invalid));
    if (describedBy) quill.root.setAttribute('aria-describedby', describedBy);
    else quill.root.removeAttribute('aria-describedby');
    if (richDescription(quill.getSemanticHTML()) !== value)
      quill.setContents(quill.clipboard.convert({ html: descriptionHtml(value) }), 'silent');
  }, [value, invalid, describedBy, disabled, ready]);
  return (
    <div className="rich-text-field" aria-busy={!ready && !failed}>
      <div
        ref={toolbar}
        className="rich-text-toolbar"
        role="toolbar"
        aria-label={`${label} formatting`}
      >
        <button type="button" className="ql-bold" aria-label="Bold" title="Bold" />
        <button type="button" className="ql-italic" aria-label="Italic" title="Italic" />
        <button type="button" className="ql-underline" aria-label="Underline" title="Underline" />
        <button
          type="button"
          className="ql-list"
          value="ordered"
          aria-label="Numbered list"
          title="Numbered list"
        />
        <button
          type="button"
          className="ql-list"
          value="bullet"
          aria-label="Bulleted list"
          title="Bulleted list"
        />
        <button type="button" className="ql-link" aria-label="Insert link" title="Insert link" />
        <button
          type="button"
          className="ql-clean"
          aria-label="Clear formatting"
          title="Clear formatting"
        />
      </div>
      <div ref={mount} />
      {failed && (
        <p role="alert">
          The description editor could not load. Reopen the form to retry. Your saved description
          has not changed.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {value.length}/2000 characters including formatting
      </p>
    </div>
  );
}

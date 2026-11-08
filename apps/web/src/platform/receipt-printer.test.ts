// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { printReceipt } from './receipt-printer';
it('prints literal receipt text with readable print CSS and removes the temporary frame', async () => {
  const append = document.body.append.bind(document.body);
  let rendered = '';
  const print = vi.fn();
  vi.spyOn(document.body, 'append').mockImplementation((...nodes) => {
    append(...nodes);
    const frame = nodes[0] as HTMLIFrameElement;
    if (frame.tagName === 'IFRAME') {
      frame.contentWindow!.focus = vi.fn();
      frame.contentWindow!.print = () => {
        rendered = frame.contentDocument!.body.innerHTML;
        expect(frame.contentDocument!.head.textContent).toContain('@page');
        print();
      };
    }
  });
  try {
    await printReceipt('Receipt <script>unsafe</script>\nTotal $12.00');
    expect(print).toHaveBeenCalledTimes(1);
    expect(rendered).toContain('&lt;script&gt;unsafe&lt;/script&gt;');
    expect(document.querySelector('iframe')).toBeNull();
  } finally {
    vi.restoreAllMocks();
  }
});

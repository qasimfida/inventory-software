// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { printReceipt } from './receipt-printer';
afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
it('prints receipt text without executing embedded markup and removes the transient preview', async () => {
  vi.useFakeTimers();
  const create = document.createElement.bind(document),
    print = vi.fn();
  let printedText: string | null = null,
    images = -1;
  vi.spyOn(document, 'createElement').mockImplementation((tag, options) => {
    const element = create(tag, options);
    if (tag === 'iframe') {
      const append = document.body.append.bind(document.body);
      vi.spyOn(document.body, 'append').mockImplementation((...nodes) => {
        append(...nodes);
        if (element instanceof HTMLIFrameElement) {
          element.contentWindow!.print = () => {
            printedText = element.contentDocument!.body.textContent;
            images = element.contentDocument!.querySelectorAll('img').length;
            print();
          };
          element.contentWindow!.focus = vi.fn();
        }
      });
    }
    return element;
  });
  await printReceipt('<img src=x onerror=alert(1)>\nUSD 12.50');
  expect(images).toBe(0);
  expect(printedText).toContain('<img');
  expect(print).toHaveBeenCalledOnce();
  vi.runAllTimers();
  expect(document.querySelector('iframe')).toBeNull();
});

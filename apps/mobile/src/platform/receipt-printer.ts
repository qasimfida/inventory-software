import { printAsync } from 'expo-print';
export async function printReceipt(text: string) {
  const safe = text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
  await printAsync({
    html: `<!doctype html><html><head><meta charset="utf-8"><title>Sale receipt</title></head><body><pre style="white-space:pre-wrap">${safe}</pre></body></html>`,
  });
}

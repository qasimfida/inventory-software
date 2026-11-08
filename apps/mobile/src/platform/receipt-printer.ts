import { printAsync } from 'expo-print';
export async function printReceipt(text: string) {
  const safe = text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
  await printAsync({
    html: `<!doctype html><html><head><meta charset="utf-8"><title>Sale receipt</title><style>@page{margin:12mm}body{margin:0;color:#000;background:#fff}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:10pt/1.4 monospace}</style></head><body><pre style="white-space:pre-wrap">${safe}</pre></body></html>`,
  });
}

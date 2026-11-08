export async function printReceipt(text: string) {
  // Browser and Tauri WebView use the operating-system print dialog; never mark hardware delivery successful.
  const frame = document.createElement('iframe');
  frame.title = 'Receipt print preview';
  frame.style.cssText = 'position:fixed;width:1px;height:1px;left:-10000px';
  document.body.append(frame);
  const doc = frame.contentDocument,
    win = frame.contentWindow;
  if (!doc || !win) {
    frame.remove();
    throw new Error('Print preview unavailable.');
  }
  const style = doc.createElement('style');
  // Physical print dimensions intentionally do not inherit dark theme or screen density.
  style.textContent =
    '@page{margin:12mm}body{margin:0;color:#000;background:#fff}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:10pt/1.4 monospace}';
  doc.head.append(style);
  const pre = doc.createElement('pre');
  pre.textContent = text;
  doc.body.append(pre);
  doc.title = 'Sale receipt';
  try {
    win.focus();
    win.print();
  } finally {
    frame.remove();
  }
}

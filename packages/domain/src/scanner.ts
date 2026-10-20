/** Keyboard wedges finish with CR/LF/tab. Scanning selects an item; it never posts stock. */
export function parseScan(raw: string) {
  const code = raw.replace(/[\r\n\t]+$/, '').trim();
  if (
    !code ||
    code.length > 120 ||
    [...code].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  )
    throw new Error('Invalid scan. Enter one barcode or location code.');
  return code;
}
export class ScanGate {
  private last = '';
  private at = 0;
  accept(raw: string, now = Date.now()) {
    const code = parseScan(raw);
    if (code === this.last && now - this.at < 1000) return null;
    this.last = code;
    this.at = now;
    return code;
  }
}

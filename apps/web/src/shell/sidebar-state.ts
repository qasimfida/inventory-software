import { palettes } from '@inventory/design-tokens';
/** Device-local layout only: never stores account, workspace or transaction data. */
const defaultWidth = parseFloat(palettes.light['sidebar-width']);
const key = 'inventory.sidebar.layout';
export function readSidebarLayout() {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      return {
        collapsed: record.collapsed === true,
        width:
          typeof record.width === 'number' && Number.isFinite(record.width)
            ? Math.max(208, Math.min(384, record.width))
            : defaultWidth,
      };
    }
  } catch {
    /* Restricted browser storage leaves navigation usable. */
  }
  return { collapsed: false, width: defaultWidth };
}
export function saveSidebarLayout(collapsed: boolean, width: number) {
  try {
    localStorage.setItem(key, JSON.stringify({ collapsed, width }));
  } catch {
    /* Device layout is optional; never block navigation. */
  }
}

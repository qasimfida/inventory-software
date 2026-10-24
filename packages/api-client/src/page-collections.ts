/** Presentation-only page merging. Metadata comes from the newest response, never summed. */
export function mergePageCollections<T>(pages: readonly T[], paths: readonly string[]): T {
  const latest = pages.at(-1)!;
  function get(value: unknown, path: string[]): unknown {
    return path.reduce<unknown>(
      (v, key) => (v && typeof v === 'object' ? (v as Record<string, unknown>)[key] : undefined),
      value,
    );
  }
  function replace(value: unknown, path: string[], items: unknown[]): unknown {
    if (!path.length) return items;
    if (!value || typeof value !== 'object') return value;
    const [key, ...rest] = path;
    const object = value as Record<string, unknown>;
    return { ...object, [key!]: replace(object[key!], rest, items) };
  }
  let result: unknown = latest;
  for (const field of paths) {
    const path = field ? field.split('.') : [];
    if (!Array.isArray(get(latest, path))) continue;
    const rows = new Map<string, unknown>();
    for (const page of pages) {
      const items = get(page, path);
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        const record = item as Record<string, unknown> | null;
        const identity =
          record && typeof record === 'object'
            ? (record.id ??
              record.key ??
              (record.variantId ? [record.variantId, record.warehouseId, record.locationId] : item))
            : item;
        rows.set(JSON.stringify(identity), item);
      }
    }
    result = replace(result, path, [...rows.values()]);
  }
  return result as T;
}

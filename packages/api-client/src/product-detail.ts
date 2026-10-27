export const productDetailTabs = ['Overview', 'Stock', 'Pricing', 'History', 'Channels'] as const;
export type ProductDetailTab = (typeof productDetailTabs)[number];
export function productDetailId(path: string): string | null {
  const match = /^\/catalog\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(
    path,
  );
  return match?.[1] ?? null;
}

export interface StockEntry {
  variantId: string;
  warehouseId: string;
  locationId: string | null;
  quantityDelta: string;
  reservedDelta?: string;
  damagedDelta?: string;
  transitDelta?: string;
  type: string;
  sourceKind: string;
  sourceId: string;
  commandId: string;
  reason: string;
  reasonCode?: string | null;
  reasonLabel?: string | null;
  reversalOf?: string;
}

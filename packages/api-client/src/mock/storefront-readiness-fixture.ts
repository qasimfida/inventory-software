import type { ListingIssue, ReadinessInput } from '@inventory/contracts';
/** Faults belong only to untouched demo fixtures; real catalog edits replace them. */
export function applyReadinessFixture(input: ReadinessInput, issues: ListingIssue[]) {
  for (const { code } of issues) {
    const variant = input.variants[0];
    switch (code) {
      case 'TITLE_MISSING':
        input.title = '';
        break;
      case 'TITLE_TOO_SHORT':
        input.title = 'A';
        break;
      case 'DESCRIPTION_MISSING':
        input.description = '';
        break;
      case 'DESCRIPTION_TOO_SHORT':
        input.description = 'Short';
        break;
      case 'NO_IMAGE':
        input.images = [];
        break;
      case 'IMAGE_URL_INVALID':
        input.images = ['http://images.example.com/a.png'];
        break;
      case 'IMAGE_HOST_NOT_ALLOWED':
        input.images = ['https://removed.example.com/a.png'];
        break;
      case 'CATEGORY_MISSING':
        input.category = false;
        break;
      case 'NO_STOCK_SOURCE':
        input.hasStockSource = false;
        break;
      case 'PRODUCT_NOT_FOUND':
        input.exists = false;
        break;
      case 'PRODUCT_INACTIVE':
        input.state = 'inactive';
        break;
      case 'PRODUCT_ARCHIVED':
        input.state = 'archived';
        break;
      case 'LOW_STOCK':
        input.lowStock = true;
        break;
      case 'PRICE_MISSING':
        if (variant) variant.priceMinor = null;
        break;
      case 'PRICE_NOT_POSITIVE':
        if (variant) variant.priceMinor = '0';
        break;
      case 'PRICE_CURRENCY_MISMATCH':
        if (variant) variant.currency = input.currency === 'USD' ? 'EUR' : 'USD';
        break;
      case 'SKU_MISSING':
        if (variant) variant.sku = '';
        break;
      case 'UNIT_MISSING':
        if (variant) variant.unit = '';
        break;
      case 'VARIANT_INCOMPLETE':
        if (variant) variant.complete = false;
        break;
    }
  }
}

import {
  productSchema,
  categorySchema,
  unitSchema,
  variantSchema,
  priceSchema,
  movementSchema,
  storageLocationSchema,
} from '@inventory/contracts';
import { demoDate, demoId } from './identity.js';
export function catalogSeed(id: (n: number) => string, currency: string) {
  const categories = ['Living', 'Workspace', 'Kitchen', 'Lighting'].map((name, i) =>
    categorySchema.parse({ id: id(30 + i), name, version: 1 }),
  );
  const units = [unitSchema.parse({ id: id(10), name: 'Each', code: 'EA', dimension: 'count' })];
  const names = [
    'Oak dining chair',
    'Linen lounge cushion',
    'Ceramic serving bowl',
    'Adjustable desk lamp',
    'Walnut side table',
    'Woven storage basket',
    'Natural cotton throw',
    'Modular shelving with adjustable compartments and protective backing',
  ];
  const products = [...Array.from({ length: 36 }).keys()].map((i) =>
    productSchema.parse({
      id: id(100 + i),
      name: `${names[i % names.length]} · ${['Natural', 'Slate', 'Sand', 'Forest'][Math.floor(i / names.length) % 4]} ${i + 1}`,
      sku: `HP-${String(i + 1).padStart(3, '0')}`,
      images: [`https://images.example.com/demo/product-${i + 1}.png`],
      barcodes: [`8900000${String(i + 1).padStart(6, '0')}`],
      categoryId: categories[i % categories.length]!.id,
      description:
        'Durable everyday essentials, responsibly sourced for busy homes and workspaces.',
      version: 1,
      createdAt: demoDate(20),
    }),
  );
  const variants = products.map((p) =>
    variantSchema.parse({
      id: p.id,
      productId: p.id,
      name: p.name,
      sku: p.sku,
      barcodes: p.barcodes,
      baseUnitId: id(10),
      version: 1,
      isDefault: true,
      cost: '18.00',
      costCurrency: currency,
    }),
  );
  const prices = products.map((p, i) =>
    priceSchema.parse({
      id: id(200 + i),
      variantId: p.id,
      storeId: null,
      unitPrice: String(25 + i * 5),
      currency,
      taxBasisPoints: 0,
      taxInclusive: false,
      startsAt: demoDate(30),
      endsAt: null,
    }),
  );
  const locations = [
    'Main warehouse',
    'Living zone',
    'North aisle',
    'Rack A',
    'Shelf A1',
    'Bin A1-01',
  ].map((name, i) =>
    storageLocationSchema.parse({
      id: id(20 + i),
      warehouseId: id(3),
      parentId: i ? id(19 + i) : null,
      name,
      code: ['ROOT', 'LIVING', 'NORTH', 'RACK-A', 'SHELF-A1', 'BIN-A1-01'][i],
      type: ['warehouse', 'zone', 'aisle', 'rack', 'shelf', 'bin'][i],
      state: 'active',
      notes: '',
      photos: [],
      capacity: i === 5 ? '100' : null,
      capacityUnit: i === 5 ? 'EA' : '',
      version: 1,
    }),
  );
  const balances = products.map((p, i) => ({
    variantId: p.id,
    sku: p.sku,
    locationId: id(20),
    locationName: 'Main warehouse',
    onHand: String(i % 9 === 0 ? 0 : i % 5 === 0 ? 2 : 20 + i),
    reserved: '0',
    damaged: '0',
    inTransit: '0',
    available: String(i % 9 === 0 ? 0 : i % 5 === 0 ? 2 : 20 + i),
    version: 1,
  }));
  const movements = balances.map((b, i) =>
    movementSchema.parse({
      id: id(300 + i),
      variantId: b.variantId,
      warehouseId: id(3),
      locationId: b.locationId,
      quantityDelta: b.onHand,
      reservedDelta: '0',
      damagedDelta: '0',
      transitDelta: '0',
      type: 'opening',
      sourceKind: 'demo-opening',
      sourceId: id(300 + i),
      actorId: demoId(900),
      reason: 'Demonstration opening balance',
      createdAt: demoDate(20),
      reversalOf: null,
    }),
  );
  return { categories, units, products, variants, prices, storage: locations, balances, movements };
}

import type { stockFixture } from './stock-fixture.js';
export type ReturnTypeOfStock = ReturnType<ReturnType<typeof stockFixture>>;

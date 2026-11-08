import { movementInputSchema } from '@inventory/contracts';
import type { Location } from '@inventory/contracts';
import type { CommandForm } from './forms.js';
import type { createInventoryClient } from './inventory.js';
import type { createPricingClient } from './pricing.js';
type Pricing = Awaited<ReturnType<ReturnType<typeof createPricingClient>['load']>>;
/** Base-unit changes only. Existing stock commands own authorization and retry identity. */
export function productQuantityForm(
  client: ReturnType<typeof createInventoryClient>,
  data: Pricing,
  locations: Location[],
  opening: boolean,
): CommandForm {
  const warehouses = locations.filter((l) => l.kind === 'warehouses' && l.state === 'active');
  const variants = data.variants.filter((v) => v.state === 'active');
  return {
    title: opening ? 'Save opening quantity' : 'Save quantity change',
    fields: [
      {
        name: 'warehouseId',
        label: 'Warehouse',
        kind: 'select',
        options: warehouses.map((l) => ({ value: l.id, label: l.name })),
        value: warehouses[0]?.id ?? '',
      },
      {
        name: 'variantId',
        label: 'Product / stock unit',
        kind: 'select',
        options: variants.map((v) => ({
          value: v.id,
          label: `${v.name} · ${v.sku} · ${data.units.find((u) => u.id === v.baseUnitId)?.name ?? 'Base unit'}`,
        })),
        value: variants[0]?.id ?? '',
      },
      ...(!opening
        ? [
            {
              name: 'direction',
              label: 'Quantity change',
              kind: 'select' as const,
              options: [
                { value: 'adjustment_in', label: 'Add stock' },
                { value: 'adjustment_out', label: 'Remove stock' },
              ],
              value: 'adjustment_in',
            },
          ]
        : []),
      {
        name: 'quantity',
        label: opening ? 'Opening quantity (base units)' : 'Quantity to add or remove (base units)',
        value: '',
      },
      { name: 'reason', label: 'Reason', value: opening ? 'Opening stock for new product' : '' },
    ],
    submit: (values) => {
      const variant = variants.find((v) => v.id === values.variantId);
      if (!variant || !warehouses.some((l) => l.id === values.warehouseId))
        throw new Error('Select an available product and warehouse.');
      if (!opening && !['adjustment_in', 'adjustment_out'].includes(String(values.direction)))
        throw new Error('Choose Add stock or Remove stock.');
      const { idempotencyKey, ...input } = movementInputSchema.parse({
        warehouseId: values.warehouseId,
        variantId: variant.id,
        unitId: variant.baseUnitId,
        locationId: null,
        quantity: values.quantity,
        reason: values.reason,
        type: opening ? 'opening' : values.direction,
        reasonCode: opening ? 'opening_balance' : 'other',
        idempotencyKey: '00000000-0000-4000-8000-000000000000',
      });
      void idempotencyKey;
      return client.post(input);
    },
  };
}
/** One immediate selling-price form; scheduled pricing remains in advanced tools. */
export function immediatePriceForm(
  form: CommandForm,
  variantId: string,
  prices: Pricing['prices'] = [],
): CommandForm {
  const storeId = String(form.fields.find((f) => f.name === 'storeId')?.value ?? '');
  const currency = String(form.fields.find((f) => f.name === 'currency')?.value ?? 'USD');
  const now = Date.now();
  const current = prices
    .filter(
      (p) =>
        p.variantId === variantId &&
        (p.storeId ?? '') === storeId &&
        p.currency === currency &&
        Date.parse(p.startsAt) <= now &&
        (!p.endsAt || Date.parse(p.endsAt) > now),
    )
    .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt))[0];
  return {
    ...form,
    title: 'Save selling price',
    fields: form.fields
      .filter((f) => !['variantId', 'startsAt', 'endsAt'].includes(f.name))
      .map((f) =>
        current && f.name === 'unitPrice'
          ? { ...f, value: current.unitPrice }
          : current && f.name === 'taxBasisPoints'
            ? { ...f, value: String(current.taxBasisPoints / 100) }
            : current && f.name === 'taxInclusive'
              ? { ...f, value: current.taxInclusive }
              : f,
      ),
    submit: (values) =>
      form.submit({ ...values, variantId, startsAt: new Date().toISOString(), endsAt: '' }),
  };
}

import { percentageBasisPoints } from '@inventory/domain';
import { priceInputSchema, promotionInputSchema, quoteInputSchema } from '@inventory/contracts';
import type { Location, Business, CompanyProfile } from '@inventory/contracts';
import type { createPricingClient } from './pricing.js';
import type { CommandForm, CommandField } from './forms.js';
type Client = ReturnType<typeof createPricingClient>;
type Data = Awaited<ReturnType<Client['load']>>;
export function priceForms(
  client: Client,
  data: Data,
  business: Business,
  locations: Location[],
  selectedId: string,
  defaults?: CompanyProfile | undefined,
): CommandForm[] {
  const variants = data.variants
    .filter((v) => v.state === 'active')
    .map((v) => ({ value: v.id, label: v.sku }));
  const stores = locations
    .filter((l) => l.kind === 'stores' && l.state === 'active')
    .map((l) => ({ value: l.id, label: l.name }));
  const target: CommandField[] = [
    {
      name: 'variantId',
      label: 'Price variant',
      kind: 'select',
      options: variants,
      value: selectedId,
    },
    {
      name: 'storeId',
      label: 'Price scope',
      kind: 'select',
      options: [
        ...(!business.scope?.storeId ? [{ value: '', label: 'Entire business' }] : []),
        ...stores,
      ],
      value: business.scope?.storeId ?? '',
      required: false,
    },
  ];
  const period: CommandField[] = [
    { name: 'startsAt', label: 'Effective from (UTC ISO)', value: new Date().toISOString() },
    { name: 'endsAt', label: 'Effective until (UTC ISO, optional)', required: false },
  ];
  return [
    {
      title: 'Withdraw promotion',
      fields: [
        {
          name: 'id',
          label: 'Promotion to withdraw',
          kind: 'select',
          options: data.promotions
            .filter((p) => !p.withdrawn)
            .map((p) => ({ value: p.id, label: p.name })),
        },
      ],
      submit: (v) => client.withdraw(String(v.id)),
    },
    {
      title: 'Publish price',
      fields: [
        ...target,
        { name: 'unitPrice', label: 'Base-unit selling price' },
        {
          name: 'currency',
          label: 'Selling currency',
          kind: 'select',
          options: ['USD', 'EUR', 'GBP', 'PKR', 'JPY', 'KWD', 'CLF'].map((c) => ({
            value: c,
            label: c,
          })),
          value: defaults?.transactionCurrency ?? 'USD',
        },
        {
          name: 'taxBasisPoints',
          label: 'Tax rate (%)',
          kind: 'text',
          value: String((defaults?.taxBasisPoints ?? 0) / 100),
        },
        {
          name: 'taxInclusive',
          label: 'Price includes tax',
          kind: 'boolean',
          value: defaults?.taxInclusive ?? false,
        },
        ...period,
      ],
      submit: (v) =>
        client.price(
          priceInputSchema.parse({
            ...v,
            taxBasisPoints: percentageBasisPoints(String(v.taxBasisPoints)),
            storeId: v.storeId || null,
            endsAt: v.endsAt || null,
          }),
        ),
    },
    {
      title: 'Publish promotion',
      fields: [
        { name: 'name', label: 'Promotion name' },
        ...target,
        {
          name: 'discountBasisPoints',
          label: 'Discount (%)',
          kind: 'text',
          value: '10',
        },
        { name: 'minimumQuantity', label: 'Minimum base-unit quantity', value: '1' },
        { name: 'priority', label: 'Promotion priority (higher wins)', kind: 'number', value: 0 },
        ...period,
      ],
      submit: (v) =>
        client.promotion(
          promotionInputSchema.parse({
            ...v,
            discountBasisPoints: percentageBasisPoints(String(v.discountBasisPoints)),
            storeId: v.storeId || null,
            endsAt: v.endsAt || null,
          }),
        ),
    },
  ];
}
export function quoteForm(
  client: Client,
  data: Data,
  locations: Location[],
  selectedId: string,
  onQuote: (value: Awaited<ReturnType<Client['quote']>>) => void,
): CommandForm {
  return {
    title: 'Calculate server price',
    fields: [
      {
        name: 'variantId',
        label: 'Quote variant',
        kind: 'select',
        options: data.variants
          .filter((v) => v.state === 'active')
          .map((v) => ({ value: v.id, label: v.sku })),
        value: selectedId,
      },
      {
        name: 'storeId',
        label: 'Quote store',
        kind: 'select',
        options: locations
          .filter((l) => l.kind === 'stores' && l.state === 'active')
          .map((l) => ({ value: l.id, label: l.name })),
      },
      {
        name: 'unitId',
        label: 'Quote unit',
        kind: 'select',
        options: data.units.map((u) => ({ value: u.id, label: u.name })),
      },
      { name: 'quantity', label: 'Quote quantity', value: '1' },
      {
        name: 'manualDiscountBasisPoints',
        label: 'Manual discount (%) — manager permission required',
        kind: 'text',
        value: 0,
      },
    ],
    submit: async (v) => {
      const quote = await client.quote(
        quoteInputSchema.parse({
          ...v,
          manualDiscountBasisPoints: percentageBasisPoints(String(v.manualDiscountBasisPoints)),
        }),
      );
      onQuote(quote);
      return quote;
    },
  };
}

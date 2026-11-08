import { z } from 'zod';
import { percentageBasisPoints } from '@inventory/domain';
import { priceInputSchema, promotionInputSchema, quoteInputSchema } from '@inventory/contracts';
import type { Location, Business, CompanyProfile } from '@inventory/contracts';
import type { createPricingClient } from './pricing.js';
import type { CommandForm, CommandField } from './forms.js';
const percentage = z
  .string()
  .trim()
  .regex(/^\d+(?:\.\d{1,2})?$/, 'Enter a percentage with at most two decimals')
  .refine((v) => Number(v) <= 100, 'Percentage must be between 0 and 100');
const toBasisPoints = (value: unknown) => percentageBasisPoints(percentage.parse(String(value)));
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
            .filter((p) => p.variantId === selectedId && !p.withdrawn)
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
          required: false,
          label: 'Tax rate (%) — optional; blank uses business default, or 0% if unset',
          kind: 'text',
          value: '',
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
            taxBasisPoints:
              String(v.taxBasisPoints ?? '').trim() === ''
                ? (defaults?.taxBasisPoints ?? 0)
                : toBasisPoints(v.taxBasisPoints),
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
            discountBasisPoints: toBasisPoints(v.discountBasisPoints),
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
          .filter((v) => v.id === selectedId && v.state === 'active')
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
        options: data.units
          .filter(
            (u) =>
              u.id === data.variants.find((v) => v.id === selectedId)?.baseUnitId ||
              data.conversions.some((c) => c.variantId === selectedId && c.unitId === u.id),
          )
          .map((u) => ({ value: u.id, label: u.name })),
        value:
          data.variants.find((v) => v.id === selectedId)?.saleUnitId ??
          data.variants.find((v) => v.id === selectedId)?.baseUnitId ??
          '',
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
          manualDiscountBasisPoints: toBasisPoints(v.manualDiscountBasisPoints),
        }),
      );
      onQuote(quote);
      return quote;
    },
  };
}

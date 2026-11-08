import {
  unitInputSchema,
  variantInputSchema,
  variantEditSchema,
  conversionSchema,
} from '@inventory/contracts';
import type { createPricingClient } from './pricing.js';
import type { CommandForm, CommandField } from './forms.js';
import { formText } from './forms.js';
type Client = ReturnType<typeof createPricingClient>;
type Data = Awaited<ReturnType<Client['load']>>;
export function variantForms(
  client: Client,
  data: Data,
  selectedId: string,
  editing = false,
  dimension?: 'count' | 'mass' | 'volume' | 'length',
): CommandForm[] {
  const variant = editing ? data.variants.find((v) => v.id === selectedId) : undefined;
  const selected = data.variants.find((v) => v.id === selectedId);
  const base = data.units.find((u) => u.id === selected?.baseUnitId);
  const units = data.units.map((u) => ({
    value: u.id,
    label: `${u.name} (${u.code}) · ${u.dimension}`,
  }));
  const available = new Set([
    selected?.baseUnitId,
    ...data.conversions.filter((c) => c.variantId === selectedId).map((c) => c.unitId),
  ]);
  const defaultUnit = (name: string, label: string, value?: string | null): CommandField => ({
    name,
    label,
    kind: 'select',
    required: false,
    value: value ?? '',
    options: [
      { value: '', label: 'Use base stock unit' },
      ...units.filter((u) => available.has(u.value)),
    ],
  });
  const unitField = (name: string, label: string, value?: string | null): CommandField => ({
    name,
    label,
    kind: 'select',
    options: units,
    value: value ?? units[0]?.value ?? '',
  });
  const fields: CommandField[] = [
    { name: 'name', label: 'Variant name', value: variant?.name ?? '' },
    { name: 'sku', label: 'Variant SKU', value: variant?.sku ?? '' },
    ...['size', 'color', 'model', 'packaging', 'weight', 'volume'].map((key) => ({
      name: key,
      label: `Attribute: ${key}`,
      value: variant?.attributes[key] ?? '',
      required: false,
    })),
    { name: 'attributeName', label: 'Additional attribute name', required: false },
    { name: 'attributeValue', label: 'Additional attribute value', required: false },
    {
      name: 'barcodes',
      label: 'Variant barcodes (one per line)',
      kind: 'multiline',
      value: variant?.barcodes.join('\n') ?? '',
      required: false,
    },
    {
      ...unitField(
        'baseUnitId',
        variant ? 'Base stock unit (fixed after creation)' : 'Base stock unit',
        variant?.baseUnitId,
      ),
      options: units.filter((u) =>
        variant
          ? u.value === variant.baseUnitId
          : !dimension || data.units.find((item) => item.id === u.value)?.dimension === dimension,
      ),
      value:
        variant?.baseUnitId ??
        data.units.find((u) => !dimension || u.dimension === dimension)?.id ??
        '',
    },
    { name: 'cost', label: 'Unit cost (optional)', value: variant?.cost ?? '', required: false },
    {
      name: 'costCurrency',
      label: 'Cost currency',
      kind: 'select',
      options: ['USD', 'EUR', 'GBP', 'PKR', 'JPY', 'KWD', 'CLF'].map((c) => ({
        value: c,
        label: c,
      })),
      value: variant?.costCurrency ?? 'USD',
    },
  ];
  if (variant)
    fields.push(
      defaultUnit('purchaseUnitId', 'Default purchase unit', variant.purchaseUnitId),
      defaultUnit('saleUnitId', 'Default selling unit', variant.saleUnitId),
      defaultUnit('countUnitId', 'Default stock-count unit', variant.countUnitId),
      {
        name: 'state',
        label: 'Variant status',
        kind: 'select',
        options: ['active', 'inactive', 'archived'].map((s) => ({ value: s, label: s })),
        value: variant.state,
      },
    );
  return [
    {
      title: 'Create unit',
      fields: [
        { name: 'name', label: 'Unit name' },
        { name: 'code', label: 'Unit code' },
        {
          name: 'dimension',
          label: 'Unit dimension',
          kind: 'select',
          options: ['count', 'mass', 'volume', 'length'].map((d) => ({ value: d, label: d })),
          value: dimension ?? base?.dimension ?? 'count',
        },
      ],
      submit: (v) => client.unit(unitInputSchema.parse(v)),
    },
    {
      title: variant ? 'Save variant' : 'Create variant',
      fields: variant?.isDefault
        ? fields.filter((f) => f.name !== 'sku' && f.name !== 'barcodes')
        : fields,
      submit: (v) => {
        const attributes = { ...variant?.attributes };
        for (const key of ['size', 'color', 'model', 'packaging', 'weight', 'volume']) {
          const value = formText(v, key);
          if (value) attributes[key] = value;
          else delete attributes[key];
        }
        if (formText(v, 'attributeName'))
          attributes[formText(v, 'attributeName')] = formText(v, 'attributeValue');
        const input = {
          name: v.name,
          sku: variant?.isDefault ? variant.sku : v.sku,
          attributes,
          barcodes: variant?.isDefault
            ? variant.barcodes
            : formText(v, 'barcodes')
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean),
          baseUnitId: v.baseUnitId,
          cost: v.cost || null,
          costCurrency: v.costCurrency,
          state: variant ? v.state : 'active',
          purchaseUnitId: variant ? v.purchaseUnitId || null : null,
          saleUnitId: variant ? v.saleUnitId || null : null,
          countUnitId: variant ? v.countUnitId || null : null,
        };
        return variant
          ? client.editVariant(
              variant.id,
              variantEditSchema.parse({ ...input, version: variant.version }),
            )
          : client.variant(variantInputSchema.parse(input));
      },
    },
    {
      title: 'Add unit conversion',
      fields: [
        {
          name: 'variantId',
          label: 'Conversion variant',
          kind: 'select',
          options: data.variants
            .filter((v) => v.id === selectedId)
            .map((v) => ({ value: v.id, label: v.sku })),
          value: selectedId,
        },
        {
          ...unitField('unitId', 'Package / selling unit to add'),
          options: units.filter(
            (u) =>
              !available.has(u.value) &&
              data.units.find((item) => item.id === u.value)?.dimension === base?.dimension,
          ),
          value:
            data.units.find((u) => !available.has(u.id) && u.dimension === base?.dimension)?.id ??
            '',
        },
        {
          name: 'numerator',
          label: `1 selected unit = numerator / denominator ${base?.code ?? 'base units'} — numerator`,
          value: '1',
        },
        { name: 'denominator', label: 'Conversion denominator (positive; never zero)', value: '1' },
      ],
      submit: (v) =>
        client.conversion(
          formText(v, 'variantId'),
          conversionSchema.parse({
            unitId: v.unitId,
            numerator: v.numerator,
            denominator: v.denominator,
          }),
        ),
    },
  ];
}

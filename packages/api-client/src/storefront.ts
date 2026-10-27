import { RetryableCommands } from './retryable-commands.js';
import {
  storefrontWorkspaceSchema,
  storefrontSettingsSchema,
  listingInputSchema,
  listingCommandSchema,
} from '@inventory/contracts';
import type {
  StorefrontSettings,
  ListingInput,
  StorefrontWorkspace,
  Location,
} from '@inventory/contracts';
import type { OrganizationTransport } from './organization.js';
import type { CommandForm } from './forms.js';
import { formText } from './forms.js';
export function createStorefrontClient(
  request: OrganizationTransport,
  businessId: string,
  newKey?: () => string,
) {
  const path = `/${encodeURIComponent(businessId)}/storefront`;
  const commands = newKey
    ? new RetryableCommands(
        (target, method, body) =>
          request(target, target === path || target === `${path}/listings` ? 'PUT' : method, body),
        newKey,
      )
    : null;
  const write = (target: string, method: 'PUT' | 'POST', input: object) =>
    commands ? commands.run(target, input, (value) => value) : request(target, method, input);
  return {
    load: async () => storefrontWorkspaceSchema.parse(await request(path)),
    save: (input: StorefrontSettings) => write(path, 'PUT', storefrontSettingsSchema.parse(input)),
    select: (input: ListingInput) =>
      write(`${path}/listings`, 'PUT', listingInputSchema.parse(input)),
    command: (id: string, version: number, action: 'publish' | 'pause' | 'remove') =>
      write(
        `${path}/listings/${encodeURIComponent(id)}`,
        'POST',
        listingCommandSchema.parse({ version, action }),
      ),
  };
}
export function storefrontForms(
  client: ReturnType<typeof createStorefrontClient>,
  data: StorefrontWorkspace,
  locations: Location[],
): CommandForm[] {
  const s = data.settings;
  const defaults = data.defaults;
  const forms: CommandForm[] = [
    {
      title: 'Configure online store',
      fields: [
        { name: 'name', label: 'Public store name', value: s?.name ?? defaults?.name ?? '' },
        { name: 'slug', label: 'Public URL slug', value: s?.slug ?? defaults?.slug ?? '' },
        {
          name: 'storeId',
          label: 'Default pricing and stock store',
          kind: 'select',
          value: s?.storeId ?? defaults?.storeId ?? '',
          options: locations
            .filter((l) => l.kind === 'stores' && l.state === 'active')
            .map((l) => ({ value: l.id, label: l.name })),
        },
        {
          name: 'currency',
          label: 'Currency code',
          value: s?.currency ?? defaults?.currency ?? 'USD',
        },
        {
          name: 'contact',
          label: 'Public contact information',
          value: s?.contact ?? defaults?.contact ?? '',
        },
        {
          name: 'fulfillment',
          label: 'Fulfillment policy',
          kind: 'select',
          value: s?.fulfillment ?? 'pickup',
          options: ['pickup', 'delivery', 'both'].map((value) => ({ value, label: value })),
        },
        {
          name: 'returnPolicy',
          label: 'Public return policy',
          kind: 'multiline',
          value: s?.returnPolicy ?? '',
        },
        {
          name: 'shippingPolicy',
          label: 'Public shipping policy (delivery)',
          kind: 'multiline',
          required: false,
          value: s?.shippingPolicy ?? '',
        },
        {
          name: 'hideSoldOut',
          label: 'Hide sold-out listings',
          kind: 'boolean',
          value: s?.hideSoldOut ?? false,
        },
        {
          name: 'enabled',
          label: 'Enable published read API (checkout unavailable)',
          kind: 'boolean',
          value: s?.enabled ?? false,
        },
      ],
      submit: (values) =>
        client.save(storefrontSettingsSchema.parse({ ...values, version: s?.version ?? 0 })),
    },
  ];
  if (s)
    forms.push({
      title: 'Select catalog product',
      fields: [{ name: 'productId', label: 'Catalog product ID' }],
      submit: (values) =>
        client.select(
          listingInputSchema.parse({ productId: formText(values, 'productId'), version: 0 }),
        ),
    });
  return forms;
}
export function listingForm(
  client: ReturnType<typeof createStorefrontClient>,
  listing: StorefrontWorkspace['listings'][number],
): CommandForm {
  return {
    title: 'Edit listing overrides',
    fields: [
      {
        name: 'title',
        label: 'Public title (blank inherits catalog)',
        required: false,
        value: listing.title,
      },
      {
        name: 'description',
        label: 'Public description (blank inherits catalog)',
        kind: 'multiline',
        required: false,
        value: listing.description,
      },
      {
        name: 'images',
        label: 'Trusted HTTPS image URLs, one per line (blank inherits catalog)',
        kind: 'multiline',
        required: false,
        value: listing.images.join('\n'),
      },
      {
        name: 'weightGrams',
        label: 'Shipping weight in grams',
        kind: 'number',
        required: false,
        value: listing.weightGrams ?? '',
      },
    ],
    submit: (values) =>
      client.select(
        listingInputSchema.parse({
          productId: listing.productId,
          version: listing.version,
          ...values,
          images: formText(values, 'images')
            .split('\n')
            .map((v) => v.trim())
            .filter(Boolean),
          weightGrams: formText(values, 'weightGrams') ? Number(values.weightGrams) : null,
        }),
      ),
  };
}

import { companyProfileSchema } from './company-profile.js';
import { z } from 'zod';
import { industryProfileSchema } from './industry.js';
import { currencySchema } from './conventions.js';

export const preferenceSchema = z
  .object({
    appearance: z.enum(['light', 'dark', 'system']),
    accent: z.enum(['default', 'teal', 'violet', 'rose', 'amber']),
    motion: z.enum(['enabled', 'reduced', 'disabled']),
    density: z.enum(['compact', 'default', 'comfortable']),
    controlSize: z.enum(['small', 'medium', 'large']).optional(),
    animation: z.enum(['off', 'minimal', 'full']).optional(),
    charts: z.enum(['numbers', 'balanced', 'charts']).optional(),
    textSize: z.enum(['small', 'medium', 'large']),
    iconSize: z.enum(['small', 'medium', 'large']),
    font: z.union([
      z.enum(['Geist', 'GeistMono', 'system', 'Karla', 'Lora', 'serif', 'monospace']),
      z
        .string()
        .max(128)
        .regex(/^local:[\p{L}\p{N} ._()-]+$/u),
    ]),
    states: z.enum(['simple', 'enhanced']),
    effects: z.boolean(),
    visualizations: z.enum(['simple', 'enhanced']),
    pagination: z.enum(['pages', 'scroll']),
    radius: z.enum(['rounded', 'circle']),
    currency: currencySchema,
  })
  .strict();
export type Preferences = z.infer<typeof preferenceSchema>;
export const preferencePatchSchema = preferenceSchema.partial();
export type PreferencePatch = z.infer<typeof preferencePatchSchema>;
export const defaultPreferences: Preferences = {
  appearance: 'light',
  accent: 'default',
  motion: 'enabled',
  density: 'compact',
  controlSize: 'medium',
  animation: 'minimal',
  charts: 'balanced',
  textSize: 'medium',
  iconSize: 'medium',
  font: 'Geist',
  states: 'simple',
  effects: false,
  visualizations: 'simple',
  pagination: 'pages',
  radius: 'rounded',
  currency: 'USD',
};
export const notificationPolicySchema = z
  .object({
    notifyUser: z.boolean().optional(),
    notifyBusinessAdmins: z.boolean().optional(),
    notifyPlatformAdmins: z.boolean().optional(),
  })
  .strict();
export const settingsPolicySchema = z
  .object({
    defaults: preferencePatchSchema.default({}),
    enforced: preferencePatchSchema.default({}),
    notifications: notificationPolicySchema.default({}),
    industry: industryProfileSchema.optional(),
    company: companyProfileSchema.optional(),
  })
  .strict();
export type SettingsPolicy = z.infer<typeof settingsPolicySchema>;
export const preferenceRecordSchema = z
  .object({
    version: z.number().int().nonnegative().max(2147483647),
    values: preferencePatchSchema,
  })
  .strict();
export const policyRecordSchema = z
  .object({
    version: z.number().int().nonnegative().max(2147483647),
    values: settingsPolicySchema,
  })
  .strict();
export const settingsSnapshotSchema = z
  .object({
    preferences: preferenceRecordSchema,
    platform: policyRecordSchema,
    canManagePlatform: z.boolean(),
    connectivity: z
      .object({
        online: z.literal(true),
        offlineCash: z.literal('bounded-grant'),
        localNetwork: z.literal('deployment-required'),
      })
      .strict(),
  })
  .strict();
export type SettingsSnapshot = z.infer<typeof settingsSnapshotSchema>;
export type PolicyRecord = z.infer<typeof policyRecordSchema>;
export interface DevicePreferences {
  reducedMotion?: boolean;
  lowPower?: boolean;
  touch?: boolean;
}

// Inputs from stored JSON may be stale/corrupt. Invalid fields revert individually.
export function safePreferences(input: unknown): z.infer<typeof preferencePatchSchema> {
  if (!input || typeof input !== 'object') return {};
  const result: Record<string, unknown> = {};
  for (const [key, schema] of Object.entries(preferenceSchema.shape)) {
    const parsed = schema.safeParse((input as Record<string, unknown>)[key]);
    if (parsed.success && parsed.data !== undefined) result[key] = parsed.data;
  }
  return preferencePatchSchema.parse(result);
}
export function safePolicy(input: unknown): SettingsPolicy {
  const parsed = settingsPolicySchema.safeParse(input);
  return parsed.success
    ? {
        defaults: safePreferences(parsed.data.defaults),
        enforced: safePreferences(parsed.data.enforced),
        notifications: parsed.data.notifications,
        ...(parsed.data.company ? { company: parsed.data.company } : {}),
        ...(parsed.data.industry ? { industry: parsed.data.industry } : {}),
      }
    : { defaults: {}, enforced: {}, notifications: {} };
}
export function resolveSettings(
  preferences: unknown,
  platformInput: unknown = {},
  businessInput: unknown = {},
  device: DevicePreferences = {},
): Preferences {
  const platform = safePolicy(platformInput),
    business = safePolicy(businessInput);
  const user = safePreferences(preferences);
  // Cosmetic policy migration: retained policy JSON is historical, not an account override.
  const resolved = {
    ...defaultPreferences,
    ...(device.touch ? { density: 'default' as const } : {}),
    ...platform.defaults,
    ...Object.fromEntries(
      Object.entries(business.defaults).filter(([key]) => !isCosmeticPreference(key)),
    ),
    ...user,
    ...Object.fromEntries(
      Object.entries(business.enforced).filter(([key]) => !isCosmeticPreference(key)),
    ),
    ...Object.fromEntries(
      Object.entries(platform.enforced).filter(([key]) => !isCosmeticPreference(key)),
    ),
  };
  // Legacy choices remain exact until a user explicitly selects the corresponding new axis.
  const source = { ...platform.defaults, ...user };
  if (
    (user.animation === undefined && user.motion !== undefined) ||
    (source.animation === undefined && source.motion !== undefined)
  ) {
    resolved.animation = source.motion === 'enabled' ? 'full' : 'off';
    resolved.motion = source.motion;
  } else {
    resolved.motion = resolved.animation === 'off' ? 'disabled' : 'enabled';
  }
  if (
    (user.charts === undefined && user.visualizations !== undefined) ||
    (source.charts === undefined && source.visualizations !== undefined)
  ) {
    resolved.charts = 'balanced';
    resolved.visualizations = source.visualizations;
  } else resolved.visualizations = resolved.charts === 'charts' ? 'enhanced' : 'simple';
  if (device.reducedMotion) {
    resolved.animation = 'off';
    if (resolved.motion !== 'disabled') resolved.motion = 'reduced';
  }
  if (device.lowPower) {
    resolved.effects = false;
    resolved.visualizations = 'simple';
    resolved.charts = 'numbers';
  }
  return preferenceSchema.parse(resolved);
}
export function notificationPolicy(platformInput: unknown, businessInput: unknown = {}) {
  const upper = safePolicy(platformInput).notifications;
  const lower = safePolicy(businessInput).notifications;
  return {
    notifyUser: upper.notifyUser ?? true,
    notifyBusinessAdmins: upper.notifyBusinessAdmins ?? lower.notifyBusinessAdmins ?? true,
    notifyPlatformAdmins: upper.notifyPlatformAdmins ?? true,
  };
}

/** Account appearance is independent of business and enforced cosmetic policies. */
export function isCosmeticPreference(key: string): boolean {
  return !['currency', 'pagination'].includes(key) && key in preferenceSchema.shape;
}

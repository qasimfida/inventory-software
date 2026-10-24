import { expect, it } from 'vitest';
import {
  defaultPreferences,
  notificationPolicy,
  preferencePatchSchema,
  resolveSettings,
  safePreferences,
  settingsPolicySchema,
} from './settings.js';
it('resolves default, platform, business, user, enforcement and device precedence', () => {
  const platform = {
    defaults: { appearance: 'dark', density: 'compact' },
    enforced: { appearance: 'light', motion: 'enabled', effects: true },
  };
  const business = {
    defaults: { textSize: 'large' },
    enforced: { appearance: 'dark', textSize: 'small' },
  };
  const result = resolveSettings(
    { appearance: 'system', density: 'comfortable', textSize: 'medium' },
    platform,
    business,
    { reducedMotion: true, lowPower: true },
  );
  expect(result).toMatchObject({
    appearance: 'light',
    density: 'comfortable',
    textSize: 'small',
    motion: 'reduced',
    effects: false,
    visualizations: 'simple',
  });
  expect(
    resolveSettings({}, {}, { enforced: { motion: 'disabled' } }, { reducedMotion: true }).motion,
  ).toBe('disabled');
});
it('recovers invalid persisted preferences without accepting unknown security switches', () => {
  expect(
    safePreferences({ appearance: 'invalid', density: 'compact', allowAnonymous: true }),
  ).toEqual({ density: 'compact' });
  expect(resolveSettings(null)).toEqual(defaultPreferences);
  expect(resolveSettings({}, { enforced: { appearance: undefined } })).toEqual(defaultPreferences);
  expect(preferencePatchSchema.safeParse({ sessionHours: 999 }).success).toBe(false);
  expect(settingsPolicySchema.safeParse({ enforced: { font: 'downloaded-font' } }).success).toBe(
    false,
  );
});
it('prevents business notification preferences overriding explicit platform policy', () => {
  expect(
    notificationPolicy(
      { notifications: { notifyBusinessAdmins: true } },
      { notifications: { notifyBusinessAdmins: false } },
    ).notifyBusinessAdmins,
  ).toBe(true);
  expect(
    notificationPolicy({}, { notifications: { notifyBusinessAdmins: false } }).notifyBusinessAdmins,
  ).toBe(false);
  expect(notificationPolicy({})).toEqual({
    notifyUser: true,
    notifyPlatformAdmins: true,
    notifyBusinessAdmins: true,
  });
});

it('defaults legacy accounts safely and enforces shape and loading policy', () => {
  expect(resolveSettings({ appearance: 'dark' })).toMatchObject({
    pagination: 'pages',
    radius: 'rounded',
  });
  expect(
    resolveSettings(
      { pagination: 'scroll', radius: 'circle' },
      { enforced: { pagination: 'pages' } },
    ),
  ).toMatchObject({ pagination: 'pages', radius: 'circle' });
  expect(preferencePatchSchema.safeParse({ radius: 'oval' }).success).toBe(false);
});

it('defaults currency to USD and validates account and policy currency choices', () => {
  expect(resolveSettings({}).currency).toBe('USD');
  expect(resolveSettings({ currency: 'PKR' }).currency).toBe('PKR');
  expect(resolveSettings({ currency: 'PKR' }, { enforced: { currency: 'JPY' } }).currency).toBe(
    'JPY',
  );
  expect(preferencePatchSchema.safeParse({ currency: 'INVALID' }).success).toBe(false);
});

it('keeps supported palette and font preferences under the existing policy precedence', () => {
  expect(resolveSettings({ font: 'Karla', accent: 'violet' })).toMatchObject({
    font: 'Karla',
    accent: 'violet',
  });
  expect(resolveSettings({ font: 'Lora' }, { enforced: { font: 'system' } }).font).toBe('system');
  expect(preferencePatchSchema.safeParse({ font: 'local:Arial Unicode MS' }).success).toBe(true);
  expect(preferencePatchSchema.safeParse({ font: 'local:"; color:red' }).success).toBe(false);
  expect(preferencePatchSchema.safeParse({ font: 'https://example.test/font.ttf' }).success).toBe(
    false,
  );
});
it('keeps existing preference values while defaulting and validating icon sizes', () => {
  expect(resolveSettings({ font: 'Lora', textSize: 'large' })).toMatchObject({
    font: 'Lora',
    textSize: 'large',
    iconSize: 'medium',
  });
  expect(resolveSettings({ iconSize: 'small' }).iconSize).toBe('small');
  expect(resolveSettings({ iconSize: 'large' }, { enforced: { iconSize: 'small' } }).iconSize).toBe(
    'small',
  );
  expect(resolveSettings({ iconSize: 'invalid' }).iconSize).toBe('medium');
});

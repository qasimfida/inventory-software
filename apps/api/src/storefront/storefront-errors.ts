import { ConflictException } from '@nestjs/common';
export const storefrontConflicts = {
  LISTING_CHANGED: 'This listing changed. Review the latest version.',
  STOREFRONT_CHANGED: 'These settings changed. Reload and review the latest version.',
  LISTING_TRANSITION_INVALID:
    'This action is not available for the current listing state. Re-check the listing.',
  STOREFRONT_SETUP_INCOMPLETE:
    'Complete the storefront prerequisites before enabling or publishing.',
} as const;
export class StorefrontConflict extends ConflictException {
  constructor(public readonly publicCode: keyof typeof storefrontConflicts) {
    super(storefrontConflicts[publicCode]);
  }
}

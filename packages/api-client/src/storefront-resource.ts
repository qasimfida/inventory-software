import type { StorefrontWorkspace } from '@inventory/contracts';
import { ResourceModel } from './resource-model.js';
/** Session memory only. Explicit access denial discards the retained management snapshot. */
export function storefrontResource(load: () => Promise<StorefrontWorkspace>) {
  const model: ResourceModel<StorefrontWorkspace & { asOf: string }> = new ResourceModel(
    async () => {
      try {
        return { ...(await load()), asOf: new Date().toISOString() };
      } catch (error) {
        if (
          error &&
          typeof error === 'object' &&
          'status' in error &&
          [401, 403, 404].includes(Number(error.status))
        )
          model.reset();
        throw error;
      }
    },
  );
  return model;
}
